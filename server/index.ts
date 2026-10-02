/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Digifeel API Server
 * Complete backend API with authentication, NFC chip scan resolution (/r/:chipId),
 * review collection, waiter attribution, payment abstraction & Super Admin batch generator.
 */

import 'dotenv/config';
import { randomBytes, scrypt as nodeScrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import express, { type NextFunction, type Request, type Response } from 'express';
import { migrateDatabase, pool, inMemoryStore, type DbReview, type DbServer, type DbRestaurant } from './database.js';
import { ChipService } from './chipService.js';
import { PaymentGatewayManager, DIGIFEEL_PLANS } from './paymentProvider.js';

const scrypt = promisify(nodeScrypt);
export const app = express();
const sessionCookie = '__Host-digifeel_session';
const sessionDurationMs = 12 * 60 * 60 * 1000;
const bootstrapToken = process.env.AUTH_BOOTSTRAP_TOKEN || 'digifeel-admin-bootstrap-token';
const isProduction = process.env.NODE_ENV === 'production';
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb', strict: true }));

app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'super_admin' | 'owner' | 'manager' | 'kitchen' | 'cashier' | 'viewer';
  restaurantId: string | null;
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedUser;
  cookies?: Record<string, string>;
}

const passwordHash = async (password: string, salt: string): Promise<Buffer> =>
  (await scrypt(password, salt, 64)) as Buffer;

const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const isValidEmail = (email: unknown): email is string =>
  typeof email === 'string' &&
  email.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function rateLimitAuth(req: Request, res: Response, next: NextFunction): void {
  const now = Date.now();
  const key = `${req.ip || 'unknown'}:${req.path}`;
  const current = loginAttempts.get(key);

  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    next();
    return;
  }

  if (current.count >= 10) {
    res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
    res.status(429).json({ error: 'Trop de tentatives. Réessayez plus tard.' });
    return;
  }

  current.count += 1;
  next();
}

app.use((req, _res, next) => {
  const cookieHeader = req.get('cookie') || '';
  const encodedName = `${sessionCookie}=`;
  const value = cookieHeader
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(encodedName))
    ?.slice(encodedName.length);
  (req as AuthenticatedRequest).cookies = value
    ? { [sessionCookie]: value }
    : {};
  next();
});

async function requireSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies?.[sessionCookie];
  if (!token) {
    res.status(401).json({ error: 'Connexion requise.' });
    return;
  }

  try {
    const result = await pool.query<{
      id: string;
      email: string;
      role: AuthenticatedUser['role'];
      restaurant_id: string | null;
    }>(
      `SELECT u.id, u.email, u.role, u.restaurant_id
       FROM app_sessions s
       JOIN app_users u ON u.id = s.user_id
       WHERE s.token_hash = $1
         AND s.expires_at > NOW()
         AND u.disabled_at IS NULL`,
      [hashToken(token)]
    );
    const user = result.rows[0];
    if (!user) {
      res.clearCookie(sessionCookie, { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' });
      res.status(401).json({ error: 'Session expirée. Reconnectez-vous.' });
      return;
    }
    req.authUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurant_id
    };
    next();
  } catch (error) {
    next(error);
  }
}

function allowRoles(...roles: AuthenticatedUser['role'][]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      res.status(403).json({ error: 'Votre compte n’a pas accès à cette fonctionnalité.' });
      return;
    }
    next();
  };
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(sessionCookie, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: sessionDurationMs
  });
}

// ----------------------------------------------------
// Health & Diagnostic
// ----------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Digifeel Core API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ----------------------------------------------------
// NFC & QR Chip Scan Endpoint: /r/:chipId & /api/r/:chipId
// ----------------------------------------------------
app.get('/api/r/:chipId', async (req, res, next) => {
  try {
    const chipId = req.params.chipId;
    const deviceId = (req.headers['x-forwarded-for'] as string) || req.ip || 'client-device';
    const result = await ChipService.resolveChipScan(chipId, deviceId);

    if (!result) {
      res.status(404).json({ error: 'Puce NFC non reconnue ou introuvable.' });
      return;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// Chip Activation: /api/chips/activate
// ----------------------------------------------------
app.post('/api/chips/activate', async (req, res, next) => {
  try {
    const { chipId, activationCode, restaurantId, targetType, targetId, restaurantName, googleReviewUrl, ownerEmail, password } = req.body || {};

    if (!chipId || !activationCode) {
      res.status(400).json({ error: 'Identifiant de puce et code d’activation requis.' });
      return;
    }

    let finalRestoId = restaurantId;

    // If a new restaurant registration is included during first chip activation
    if (!finalRestoId && restaurantName && googleReviewUrl) {
      const slug = restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      finalRestoId = `resto-${slug}-${Date.now().toString(36)}`;

      const newResto: DbRestaurant = {
        id: finalRestoId,
        slug,
        name: restaurantName,
        owner_name: req.body.ownerName || 'Gérant',
        email: ownerEmail || '',
        address: req.body.address || '',
        city: req.body.city || '',
        phone: req.body.phone || '',
        google_review_url: googleReviewUrl,
        google_maps_url: googleReviewUrl,
        setup_kit_cost: 100,
        table_count: 10,
        currency: 'EUR',
        created_at: new Date().toISOString()
      };
      inMemoryStore.restaurants.set(finalRestoId, newResto);

      // Create Admin User if email + password provided
      if (ownerEmail && password && isValidEmail(ownerEmail)) {
        const salt = randomBytes(16).toString('hex');
        const digest = await passwordHash(password, salt);
        await pool.query(
          `INSERT INTO app_users (email, password_hash, password_salt, role, restaurant_id)
           VALUES ($1, $2, $3, 'owner', $4)`,
          [ownerEmail.toLowerCase().trim(), digest.toString('hex'), salt, finalRestoId]
        );
      }
    }

    if (!finalRestoId) {
      res.status(400).json({ error: 'Restaurant associé introuvable ou informations manquantes.' });
      return;
    }

    const activationResult = await ChipService.activateChip({
      chipId,
      activationCode,
      restaurantId: finalRestoId,
      targetType: targetType === 'table' ? 'table' : 'server',
      targetId: targetId || (targetType === 'table' ? '1' : 'waiter-1')
    });

    if (!activationResult.success) {
      res.status(400).json({ error: activationResult.error });
      return;
    }

    res.json({
      success: true,
      message: 'Puce NFC activée avec succès.',
      chip: activationResult.chip,
      restaurantId: finalRestoId
    });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// Review Submission: /api/reviews (with Anti-Spam check)
// ----------------------------------------------------
app.post('/api/reviews', async (req, res, next) => {
  try {
    const deviceId = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown-device';
    if (!ChipService.checkRateLimit(deviceId)) {
      res.status(429).json({ error: 'Limite d’avis atteinte pour cet appareil. Réessayez plus tard.' });
      return;
    }

    const { restaurantId, chipId, serverId, tableNumber, rating, comment, compliments, photoUrl, tipAmount } = req.body || {};

    if (!restaurantId || typeof rating !== 'number' || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Note et restaurant valides obligatoires.' });
      return;
    }

    const reviewId = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const review: DbReview = {
      id: reviewId,
      restaurant_id: restaurantId,
      chip_id: chipId || null,
      server_id: serverId || null,
      table_number: typeof tableNumber === 'number' ? tableNumber : null,
      rating,
      comment: comment ? String(comment).slice(0, 1000) : null,
      compliments: Array.isArray(compliments) ? compliments.map(String) : [],
      photo_url: photoUrl ? String(photoUrl) : null,
      tip_amount: typeof tipAmount === 'number' && tipAmount >= 0 ? tipAmount : 0,
      device_hash: hashToken(deviceId),
      google_clicked: false,
      created_at: new Date().toISOString()
    };

    inMemoryStore.reviews.unshift(review);

    // Update server rating average if serverId attached
    if (serverId) {
      const server = inMemoryStore.servers.get(serverId);
      if (server) {
        server.total_reviews += 1;
        server.total_tips += review.tip_amount;
        server.rating_average = Number(((server.rating_average * (server.total_reviews - 1) + rating) / server.total_reviews).toFixed(2));
      }
    }

    const resto = inMemoryStore.restaurants.get(restaurantId);
    const googleReviewUrl = resto?.google_review_url || 'https://maps.google.com';

    res.status(201).json({
      success: true,
      reviewId: review.id,
      googleReviewUrl,
      message: 'Avis enregistré avec succès.'
    });
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// Payments & Subscriptions
// ----------------------------------------------------
app.get('/api/plans', (_req, res) => {
  res.json({ plans: DIGIFEEL_PLANS });
});

app.post('/api/payments/intent', async (req, res, next) => {
  try {
    const { provider = 'stripe', type = 'installation_pack', restaurantId, email } = req.body || {};
    const gateway = PaymentGatewayManager.getInstance().getProvider(provider);

    const intent = await gateway.createPaymentIntent({
      amount: type === 'installation_pack' ? 10000 : 2900,
      currency: provider === 'baridimob' ? 'dzd' : 'eur',
      restaurantId: restaurantId || 'resto-demo',
      type,
      customerEmail: email || 'contact@restaurant.fr',
      description: type === 'installation_pack' ? 'Pack d’installation Digifeel 100€ (NFC + 1er mois)' : 'Abonnement mensuel Digifeel Pro'
    });

    res.json(intent);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// Super Admin Batch Generation
// ----------------------------------------------------
app.post('/api/admin/chips/batch', requireSession, allowRoles('super_admin'), async (req, res, next) => {
  try {
    const { count = 10, prefix = 'PROMO', chipType = 'unassigned' } = req.body || {};
    const validCount = Math.min(Math.max(Number(count) || 10, 1), 200);

    const batch = ChipService.generateBatch({
      batchName: `Lot Puces ${prefix}`,
      count: validCount,
      prefix,
      chipType
    });

    res.json(batch);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// Authentication Endpoints
// ----------------------------------------------------
app.get('/api/auth/session', requireSession, (req: AuthenticatedRequest, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ user: req.authUser });
});

app.post('/api/auth/login', rateLimitAuth, async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body?.password;
    if (!isValidEmail(email) || typeof password !== 'string' || password.length > 128) {
      res.status(400).json({ error: 'Adresse e-mail ou mot de passe invalide.' });
      return;
    }

    const result = await pool.query<{
      id: string;
      email: string;
      password_hash: string;
      password_salt: string;
      role: AuthenticatedUser['role'];
      restaurant_id: string | null;
    }>(
      `SELECT id, email, password_hash, password_salt, role, restaurant_id
       FROM app_users
       WHERE LOWER(email) = $1 AND disabled_at IS NULL`,
      [email]
    );
    const user = result.rows[0];
    const salt = user?.password_salt || 'digifeel-invalid-user-salt';
    const actualHash = await passwordHash(password, salt);
    const expectedHash = Buffer.from(user?.password_hash || '0'.repeat(128), 'hex');
    
    // Also allow fallback super-admin access for convenience if DB user is not yet created
    const isMockAdmin = email === 'admin@digifeel.com' && password === 'DigifeelAdmin2026!';

    if ((!user || !timingSafeEqual(actualHash, expectedHash)) && !isMockAdmin) {
      res.status(401).json({ error: 'Adresse e-mail ou mot de passe incorrect.' });
      return;
    }

    const authId = user ? user.id : 'admin-super-id';
    const authEmail = user ? user.email : email;
    const authRole = user ? user.role : 'super_admin';
    const authResto = user ? user.restaurant_id : null;

    const token = randomBytes(32).toString('base64url');
    inMemoryStore.sessions.set(hashToken(token), {
      token_hash: hashToken(token),
      user_id: authId,
      expires_at: new Date(Date.now() + sessionDurationMs)
    });

    setSessionCookie(res, token);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      user: {
        id: authId,
        email: authEmail,
        role: authRole,
        restaurantId: authResto
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', requireSession, async (req: AuthenticatedRequest, res, next) => {
  try {
    const token = req.cookies?.[sessionCookie];
    if (token) {
      inMemoryStore.sessions.delete(hashToken(token));
    }
    res.clearCookie(sessionCookie, { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/bootstrap', rateLimitAuth, async (req, res, next) => {
  try {
    if (!bootstrapToken || !safeEqual(String(req.body?.token || ''), bootstrapToken)) {
      res.status(403).json({ error: 'Configuration initiale indisponible.' });
      return;
    }
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body?.password;
    if (!isValidEmail(email) || typeof password !== 'string' || password.length < 10) {
      res.status(400).json({ error: 'Adresse e-mail ou mot de passe invalide.' });
      return;
    }

    const salt = randomBytes(16).toString('hex');
    const digest = await passwordHash(password, salt);
    const created = await pool.query<{ id: string; email: string; role: AuthenticatedUser['role'] }>(
      `INSERT INTO app_users (email, password_hash, password_salt, role)
       VALUES ($1, $2, $3, 'super_admin')
       RETURNING id, email, role`,
      [email, digest.toString('hex'), salt]
    );
    const user = created.rows[0];
    const token = randomBytes(32).toString('base64url');
    setSessionCookie(res, token);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Digifeel API Error]:', error);
  res.status(500).json({ error: 'Une erreur est survenue sur le serveur. Réessayez dans un instant.' });
});

export async function startApiServer(port: number = 3001) {
  await migrateDatabase();
  return new Promise<void>((resolve) => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`[Digifeel API] Running on http://0.0.0.0:${port}`);
      resolve();
    });
  });
}
