import 'dotenv/config';
import { randomBytes, randomUUID, scrypt as nodeScrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { type PoolClient } from 'pg';
import Stripe from 'stripe';
import { PRODUCT_PRICING } from '../src/config/product.js';
import { migrateDatabase, pool } from './database.js';
import { sendFrenchMail } from './mail.js';
import { StripeTestPaymentProvider } from './paymentProvider.js';

const scrypt = promisify(nodeScrypt);
const app = express();
const sessionDurationMs = 12 * 60 * 60 * 1000;
const bootstrapToken = process.env.AUTH_BOOTSTRAP_TOKEN;
const appOrigin = process.env.APP_ORIGIN;
const isProduction = process.env.NODE_ENV === 'production';
const sessionCookie = isProduction ? '__Host-digifeel_session' : 'digifeel_session';
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const scanAttempts = new Map<string, { count: number; resetAt: number }>();
const reviewAttempts = new Map<string, { count: number; resetAt: number }>();
const paymentAttempts = new Map<string, { count: number; resetAt: number }>();
const proofAttempts = new Map<string, { count: number; resetAt: number }>();
const proofDirectory = path.resolve(process.env.PAYMENT_PROOF_DIR || path.join(process.cwd(), 'private-uploads'));
const publicDirectory = path.resolve(process.cwd(), 'public');
const proofDirectoryRelativeToPublic = path.relative(publicDirectory, proofDirectory);
if (proofDirectoryRelativeToPublic === '' || (!proofDirectoryRelativeToPublic.startsWith('..') && !path.isAbsolute(proofDirectoryRelativeToPublic))) {
  throw new Error('PAYMENT_PROOF_DIR must not be inside the public directory.');
}

const getStripe = (): Stripe => {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret || !secret.startsWith('sk_test_')) {
    throw new Error('Les paiements Stripe nécessitent une clé de test sk_test_.');
  }
  return new Stripe(secret);
};

const getCcpExchangeRate = (): number | null => {
  const exchangeRate = Number(process.env.CCP_EUR_TO_DZD || '');
  const maximumInstallationPrice = Math.max(...Object.values(PRODUCT_PRICING.installationPacks).map(pack => pack.priceEuros));
  const maximumStoredAmount = Math.max(maximumInstallationPrice, PRODUCT_PRICING.monthlySubscriptionEuros) * exchangeRate * 100;
  return Number.isFinite(exchangeRate) && exchangeRate > 0 && Number.isSafeInteger(Math.round(maximumStoredAmount)) &&
    maximumStoredAmount <= 2_147_483_647
    ? exchangeRate
    : null;
};

if (isProduction && (!appOrigin || !appOrigin.startsWith('https://'))) {
  throw new Error('APP_ORIGIN must be an https origin in production.');
}

if (process.env.TRUST_PROXY_HOPS) {
  const hops = Number(process.env.TRUST_PROXY_HOPS);
  if (!Number.isInteger(hops) || hops < 1) {
    throw new Error('TRUST_PROXY_HOPS must be a positive integer.');
  }
  app.set('trust proxy', hops);
}

app.disable('x-powered-by');
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), (req, res) => {
  const signature = req.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret || !Buffer.isBuffer(req.body)) {
    res.status(400).json({ error: 'Signature de webhook invalide.' });
    return;
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    console.warn('Signature Stripe rejetée.', error);
    res.status(400).json({ error: 'Signature de webhook invalide.' });
    return;
  }
  void processStripeWebhook(event).then(() => res.json({ received: true })).catch(error => {
    console.error('Le webhook Stripe n’a pas pu être traité.', error);
    res.status(500).json({ error: 'Le webhook Stripe n’a pas pu être traité.' });
  });
});
app.use(express.json({ limit: '16kb', strict: true }));

interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'super_admin' | 'owner' | 'manager' | 'kitchen' | 'cashier' | 'viewer';
  restaurantId: string | null;
}

interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedUser;
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

function requireSameOrigin(req: Request, res: Response, next: NextFunction): void {
  const origin = req.get('origin');
  const expectedOrigin = appOrigin || `${req.protocol}://${req.get('host')}`;
  if (!origin || origin !== expectedOrigin) {
    res.status(403).json({ error: 'Requête refusée.' });
    return;
  }
  next();
}

function rateLimitAuth(req: Request, res: Response, next: NextFunction): void {
  const now = Date.now();
  if (loginAttempts.size > 4096) {
    for (const [key, entry] of loginAttempts) {
      if (entry.resetAt <= now) loginAttempts.delete(key);
    }
  }
  if (loginAttempts.size > 8192) {
    res.status(503).json({ error: 'Le service de connexion est temporairement indisponible.' });
    return;
  }
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

async function requireSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies[sessionCookie];
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
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      res.status(403).json({ error: 'Votre compte n’a pas accès à cette fonctionnalité.' });
      return;
    }
    if (req.authUser.role === 'owner' || req.authUser.role === 'manager') {
      try {
        const restaurant = await pool.query(
          `SELECT 1 FROM restaurants WHERE id = $1 AND status = 'active'`,
          [req.authUser.restaurantId]
        );
        if (!restaurant.rowCount) {
          res.status(403).json({ error: 'Cet espace restaurateur est désactivé. Contactez Digifeel.' });
          return;
        }
      } catch (error) {
        next(error);
        return;
      }
    }
    next();
  };
}

function canAccessRestaurant(user: AuthenticatedUser, restaurantId: string): boolean {
  return user.role === 'super_admin' || (
    ['owner', 'manager'].includes(user.role) && user.restaurantId === restaurantId
  );
}

function isGoogleReviewUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === 'https:' && (
      hostname === 'g.page' ||
      hostname === 'goo.gl' ||
      hostname === 'maps.app.goo.gl' ||
      hostname === 'google.com' ||
      hostname.endsWith('.google.com')
    );
  } catch {
    return false;
  }
}

function limitedByKey(
  map: Map<string, { count: number; resetAt: number }>,
  req: Request,
  res: Response,
  next: NextFunction,
  limit: number,
  windowMs: number,
  message: string,
  routeKey = req.path
): void {
  const now = Date.now();
  const key = `${req.ip || 'unknown'}:${routeKey}`;
  const entry = map.get(key);
  if (!entry || entry.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    next();
    return;
  }
  if (entry.count >= limit) {
    res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
    res.status(429).json({ error: message });
    return;
  }
  entry.count += 1;
  next();
}

const rateLimitPayments: express.RequestHandler = (req, res, next) =>
  limitedByKey(paymentAttempts, req, res, next, 12, 60_000, 'Trop de demandes de paiement.');

const rateLimitProofs: express.RequestHandler = (req, res, next) =>
  limitedByKey(proofAttempts, req, res, next, 8, 60_000, 'Trop de dépôts de preuve.');

const rateLimitReviews: express.RequestHandler = (req, res, next) =>
  limitedByKey(reviewAttempts, req, res, next, 20, 60_000, 'Trop d’avis envoyés. Réessayez dans un instant.');

function rateLimitScans(req: Request, res: Response, next: NextFunction): void {
  const now = Date.now();
  if (scanAttempts.size > 4096) {
    for (const [key, entry] of scanAttempts) {
      if (entry.resetAt <= now) scanAttempts.delete(key);
    }
  }
  if (scanAttempts.size > 8192) {
    res.status(503).json({ error: 'Le service de scan est temporairement indisponible.' });
    return;
  }

  const key = req.ip || 'unknown';
  const current = scanAttempts.get(key);
  if (!current || current.resetAt <= now) {
    scanAttempts.set(key, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }

  if (current.count >= 600) {
    res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
    res.status(429).json({ error: 'Trop de scans rapprochés. Réessayez dans un instant.' });
    return;
  }
  current.count += 1;
  next();
}

async function processStripeWebhook(event: Stripe.Event): Promise<void> {
  const client = await pool.connect();
  const activatedRestaurantIds: string[] = [];
  const paymentReceivedRestaurantIds: string[] = [];
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO stripe_webhook_events (event_id, event_type)
       VALUES ($1, $2) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [event.id, event.type]
    );
    if (!inserted.rowCount) {
      await client.query('COMMIT');
      return;
    }

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      const transactionId = session.metadata?.transactionId;
      const restaurantId = session.metadata?.restaurantId;
      const kind = session.metadata?.transactionType;
      if (transactionId && restaurantId && kind === 'installation' && session.payment_status === 'paid') {
        await client.query(
          `UPDATE payment_transactions SET status = 'paid', provider_reference = $2, updated_at = NOW()
           WHERE id = $1`,
          [transactionId, session.id]
        );
        await client.query(
          `UPDATE restaurants SET installation_payment_status = 'paid', updated_at = NOW() WHERE id = $1`,
          [restaurantId]
        );
        activatedRestaurantIds.push(restaurantId);
        paymentReceivedRestaurantIds.push(restaurantId);
      } else if (transactionId && restaurantId && kind === 'subscription' && session.subscription) {
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
        const subscriptionStatus = subscription.status === 'trialing'
          ? 'trialing'
          : subscription.status === 'active'
            ? 'active'
            : subscription.status === 'past_due' || subscription.status === 'unpaid'
              ? 'past_due'
              : 'canceled';
        await client.query(
          `UPDATE restaurants SET subscription_status = $2, stripe_customer_id = $3,
             stripe_subscription_id = $4, subscription_trial_used = TRUE, updated_at = NOW() WHERE id = $1`,
          [restaurantId, subscriptionStatus, typeof session.customer === 'string' ? session.customer : null, subscriptionId]
        );
        await client.query(
          `UPDATE payment_transactions SET status = 'pending', provider_reference = $2, updated_at = NOW() WHERE id = $1`,
          [transactionId, session.id]
        );
        activatedRestaurantIds.push(restaurantId);
      } else if (transactionId && kind === 'tip' && session.payment_status === 'paid') {
        await client.query(
          `UPDATE payment_transactions SET status = 'paid', provider_reference = $2, updated_at = NOW()
           WHERE id = $1 AND transaction_type = 'tip'`,
          [transactionId, session.id]
        );
      }
    } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.transactionId) {
        await client.query(
          `UPDATE payment_transactions SET status = 'failed', updated_at = NOW()
           WHERE id = $1 AND status = 'pending'`,
          [session.metadata.transactionId]
        );
      }
    } else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const parent = invoice.parent;
      const subscriptionId = parent?.type === 'subscription_details'
        ? parent.subscription_details?.subscription || null
        : null;
      if (subscriptionId) {
        const subscriptionStatus = event.type === 'invoice.paid' ? 'active' : 'past_due';
        const restaurantResult = await client.query<{ id: string; email: string }>(
          `UPDATE restaurants SET subscription_status = $2, updated_at = NOW()
           WHERE stripe_subscription_id = $1 RETURNING id, email`,
          [subscriptionId, subscriptionStatus]
        );
        if (event.type === 'invoice.paid' && restaurantResult.rows[0]) {
          await client.query(
            `INSERT INTO payment_transactions
              (restaurant_id, provider, transaction_type, status, amount_minor, currency, provider_reference, description)
             VALUES ($1, 'stripe', 'subscription', 'paid', $2, $3, $4, $5)
             ON CONFLICT (provider, provider_reference) WHERE provider_reference IS NOT NULL DO NOTHING`,
            [restaurantResult.rows[0].id, invoice.amount_paid, invoice.currency, invoice.id, PRODUCT_PRICING.subscriptionName]
          );
          paymentReceivedRestaurantIds.push(restaurantResult.rows[0].id);
        }
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const mappedStatus = subscription.status === 'trialing'
        ? 'trialing'
        : subscription.status === 'active'
          ? 'active'
          : subscription.status === 'past_due' || subscription.status === 'unpaid'
            ? 'past_due'
            : 'canceled';
      await client.query(
        `UPDATE restaurants SET subscription_status = $2, updated_at = NOW() WHERE stripe_subscription_id = $1`,
        [subscription.id, mappedStatus]
      );
    }
    await client.query('COMMIT');
    for (const restaurantId of paymentReceivedRestaurantIds) {
      try {
        const restaurant = await pool.query<{ email: string }>('SELECT email FROM restaurants WHERE id = $1', [restaurantId]);
        if (restaurant.rows[0]?.email) {
          await sendFrenchMail(
            restaurant.rows[0].email,
            'payment_received',
            'paiement confirmé par Stripe',
            `${appOrigin || ''}/?view=manager`
          );
        }
      } catch (mailError) {
        console.error('L’e-mail de paiement reçu n’a pas pu être envoyé.', mailError);
      }
    }
    for (const restaurantId of activatedRestaurantIds) {
      try {
        const restaurant = await pool.query<{ email: string }>('SELECT email FROM restaurants WHERE id = $1', [restaurantId]);
        if (restaurant.rows[0]?.email) {
          const origin = appOrigin || '';
          await sendFrenchMail(restaurant.rows[0].email, 'account_activated', 'paiement confirmé', `${origin}/?view=manager`);
        }
      } catch (mailError) {
        console.error('L’e-mail d’activation après paiement n’a pas pu être envoyé.', mailError);
      }
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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

app.use((req, res, next) => {
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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/auth/session', requireSession, (req: AuthenticatedRequest, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ user: req.authUser });
});

app.post('/api/auth/bootstrap', requireSameOrigin, rateLimitAuth, async (req, res, next) => {
  try {
    if (!bootstrapToken || !safeEqual(String(req.body?.token || ''), bootstrapToken)) {
      res.status(403).json({ error: 'Configuration initiale indisponible.' });
      return;
    }
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body?.password;
    if (!isValidEmail(email) || typeof password !== 'string' || password.length < 14 || password.length > 128) {
      res.status(400).json({ error: 'Adresse e-mail ou mot de passe invalide (14 caractères minimum).' });
      return;
    }

    const existing = await pool.query('SELECT 1 FROM app_users LIMIT 1');
    if (existing.rowCount) {
      res.status(409).json({ error: 'Le compte administrateur initial est déjà configuré.' });
      return;
    }

    const salt = randomBytes(16).toString('hex');
    const digest = await passwordHash(password, salt);
    let client: PoolClient | null = null;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(84523071)');
      const checkAgain = await client.query('SELECT 1 FROM app_users LIMIT 1');
      if (checkAgain.rowCount) {
        if (client) await client.query('ROLLBACK');
        res.status(409).json({ error: 'Le compte administrateur initial est déjà configuré.' });
        return;
      }
      const created = await client.query<{ id: string; email: string; role: AuthenticatedUser['role'] }>(
        `INSERT INTO app_users (email, password_hash, password_salt, role)
         VALUES ($1, $2, $3, 'super_admin')
         RETURNING id, email, role`,
        [email, digest.toString('hex'), salt]
      );
      const user = created.rows[0];
      await client.query(
        `INSERT INTO audit_events (actor_user_id, event_type, target_user_id)
         VALUES ($1, 'super_admin_bootstrapped', $1)`,
        [user.id]
      );
      await client.query('COMMIT');

      const token = randomBytes(32).toString('base64url');
      await pool.query(
        'INSERT INTO app_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'12 hours\')',
        [hashToken(token), user.id]
      );
      setSessionCookie(res, token);
      res.status(201).json({ user: { id: user.id, email: user.email, role: user.role, restaurantId: null } });
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      throw error;
    } finally {
      client?.release();
    }
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', requireSameOrigin, rateLimitAuth, async (req, res, next) => {
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
    if (!user || !timingSafeEqual(actualHash, expectedHash)) {
      res.status(401).json({ error: 'Adresse e-mail ou mot de passe incorrect.' });
      return;
    }

    const token = randomBytes(32).toString('base64url');
    await pool.query('DELETE FROM app_sessions WHERE expires_at <= NOW()');
    await pool.query(
      'INSERT INTO app_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'12 hours\')',
      [hashToken(token), user.id]
    );
    await pool.query(
      `INSERT INTO audit_events (actor_user_id, event_type, metadata)
       VALUES ($1, 'login_succeeded', $2::jsonb)`,
      [user.id, JSON.stringify({ role: user.role })]
    );
    setSessionCookie(res, token);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurant_id
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/accept-invitation', requireSameOrigin, rateLimitAuth, async (req, res, next) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const password = req.body?.password;
    if (!/^[A-Za-z0-9_-]{32,100}$/.test(token) || typeof password !== 'string' || password.length < 14 || password.length > 128) {
      res.status(400).json({ error: 'Lien invalide ou mot de passe trop court (14 caractères minimum).' });
      return;
    }
    const salt = randomBytes(16).toString('hex');
    const digest = await passwordHash(password, salt);
    const sessionToken = randomBytes(32).toString('base64url');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const invitation = await client.query<{ user_id: string; email: string; role: AuthenticatedUser['role']; restaurant_id: string | null }>(
        `SELECT u.id AS user_id, u.email, u.role, u.restaurant_id
         FROM account_invitations i
         JOIN app_users u ON u.id = i.user_id
         WHERE i.token_hash = $1 AND i.used_at IS NULL AND i.expires_at > NOW() AND u.disabled_at IS NULL
         FOR UPDATE OF i`,
        [hashToken(token)]
      );
      const user = invitation.rows[0];
      if (!user) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Ce lien d’invitation est expiré ou a déjà été utilisé.' });
        return;
      }
      await client.query(
        'UPDATE app_users SET password_hash = $2, password_salt = $3 WHERE id = $1',
        [user.user_id, digest.toString('hex'), salt]
      );
      await client.query('UPDATE account_invitations SET used_at = NOW() WHERE token_hash = $1', [hashToken(token)]);
      await client.query(
        `INSERT INTO app_sessions (token_hash, user_id, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '12 hours')`,
        [hashToken(sessionToken), user.user_id]
      );
      await client.query('COMMIT');
      setSessionCookie(res, sessionToken);
      res.status(201).json({
        user: { id: user.user_id, email: user.email, role: user.role, restaurantId: user.restaurant_id }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', requireSameOrigin, requireSession, async (req: AuthenticatedRequest, res, next) => {
  try {
    const token = req.cookies[sessionCookie];
    if (!token) {
      res.status(401).json({ error: 'Session expirée. Reconnectez-vous.' });
      return;
    }
    await pool.query('DELETE FROM app_sessions WHERE token_hash = $1', [hashToken(token)]);
    await pool.query(
      `INSERT INTO audit_events (actor_user_id, event_type) VALUES ($1, 'logout')`,
      [req.authUser?.id]
    );
    res.clearCookie(sessionCookie, { httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get(
  '/api/admin/restaurants',
  requireSession,
  allowRoles('super_admin'),
  async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT r.id, r.slug, r.name, r.status, r.owner_name, r.email, r.address, r.city,
                r.phone, r.table_count, r.google_review_url, r.tip_enabled,
                r.installation_pack, r.installation_price_euros, r.installation_payment_status,
                r.subscription_status, r.created_at,
                COUNT(DISTINCT st.public_id)::int AS target_count,
                COUNT(DISTINCT se.id)::int AS scan_count,
                COUNT(DISTINCT pp.id) FILTER (WHERE pt.status = 'proof_pending')::int AS pending_proofs
         FROM restaurants r
         LEFT JOIN scan_targets st ON st.restaurant_id = r.id
         LEFT JOIN scan_events se ON se.restaurant_id = r.id
         LEFT JOIN payment_transactions pt ON pt.restaurant_id = r.id
         LEFT JOIN payment_proofs pp ON pp.transaction_id = pt.id
         GROUP BY r.id ORDER BY r.created_at DESC`
      );
      res.setHeader('Cache-Control', 'no-store');
      res.json({ restaurants: result.rows });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  '/api/admin/restaurants',
  requireSameOrigin,
  requireSession,
  allowRoles('super_admin'),
  async (req, res, next) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const ownerName = typeof req.body?.ownerName === 'string' ? req.body.ownerName.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const city = typeof req.body?.city === 'string' ? req.body.city.trim() : '';
    const address = typeof req.body?.address === 'string' ? req.body.address.trim() : '';
    const slug = typeof req.body?.slug === 'string' ? req.body.slug.trim().toLowerCase() : '';
    const googleReviewUrl = typeof req.body?.googleReviewUrl === 'string' ? req.body.googleReviewUrl.trim() : '';
    const pack = req.body?.installationPack;
    const packValues = Object.values(PRODUCT_PRICING.installationPacks);
    const selectedPack = packValues.find(value => value.id === pack);
    if (
      !name || name.length > 120 || !ownerName || ownerName.length > 120 ||
      !isValidEmail(email) || !city || city.length > 120 || address.length > 200 ||
      !/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug) ||
      (googleReviewUrl && !isGoogleReviewUrl(googleReviewUrl)) || !selectedPack
    ) {
      res.status(400).json({ error: 'Vérifiez le nom, l’e-mail, l’adresse, le lien Google et le pack choisi.' });
      return;
    }

    const restaurantId = `resto-${randomUUID()}`;
    const setupToken = randomBytes(32).toString('base64url');
    const initialPassword = randomBytes(48).toString('base64url');
    const passwordSalt = randomBytes(16).toString('hex');
    const unusableDigest = await passwordHash(initialPassword, passwordSalt);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const createdRestaurant = await client.query(
        `INSERT INTO restaurants
          (id, slug, name, owner_name, email, address, city, google_review_url,
           installation_pack, installation_price_euros, table_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, slug, name, email, installation_price_euros`,
        [restaurantId, slug, name, ownerName, email, address, city, googleReviewUrl || null,
          selectedPack.id, selectedPack.priceEuros, Math.max(1, Math.min(500, Number(req.body?.tableCount) || 12))]
      );
      const userResult = await client.query<{ id: string }>(
        `INSERT INTO app_users (email, password_hash, password_salt, role, restaurant_id)
         VALUES ($1, $2, $3, 'owner', $4) RETURNING id`,
        [email, unusableDigest.toString('hex'), passwordSalt, restaurantId]
      );
      await client.query(
        `INSERT INTO account_invitations (token_hash, user_id, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
        [hashToken(setupToken), userResult.rows[0].id]
      );
      await client.query('COMMIT');
      const invitationUrl = `${appOrigin || `${req.protocol}://${req.get('host')}`}/?setup=${encodeURIComponent(setupToken)}`;
      let mailSent = false;
      try {
        mailSent = await sendFrenchMail(email, 'invitation', '', invitationUrl);
      } catch (mailError) {
        console.error('L’e-mail d’invitation n’a pas pu être envoyé.', mailError);
      }
      res.status(201).json({ restaurant: createdRestaurant.rows[0], invitationUrl: mailSent ? undefined : invitationUrl });
    } catch (error) {
      await client.query('ROLLBACK');
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        res.status(409).json({ error: 'Un restaurant ou un compte avec ce nom, identifiant ou e-mail existe déjà.' });
        return;
      }
      next(error);
    } finally {
      client.release();
    }
  }
);

app.patch(
  '/api/admin/restaurants/:restaurantId',
  requireSameOrigin,
  requireSession,
  allowRoles('super_admin'),
  async (req, res, next) => {
    const restaurantId = req.params.restaurantId;
    const { status, installationPaymentStatus, subscriptionStatus, name, email, address, city, phone, googleReviewUrl } = req.body || {};
    const safeName = typeof name === 'string' ? name.trim() : name;
    const safeEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;
    const safeAddress = typeof address === 'string' ? address.trim() : address;
    const safeCity = typeof city === 'string' ? city.trim() : city;
    const safePhone = typeof phone === 'string' ? phone.trim() : phone;
    const safeGoogleUrl = typeof googleReviewUrl === 'string' ? googleReviewUrl.trim() : googleReviewUrl;
    if (
      !/^[A-Za-z0-9_-]{1,128}$/.test(restaurantId) ||
      (status !== undefined && status !== 'active' && status !== 'disabled') ||
      (installationPaymentStatus !== undefined && !['pending', 'paid', 'failed', 'refunded'].includes(installationPaymentStatus)) ||
      (subscriptionStatus !== undefined && !['inactive', 'trialing', 'active', 'past_due', 'canceled'].includes(subscriptionStatus)) ||
      (name !== undefined && (typeof safeName !== 'string' || !safeName || safeName.length > 120)) ||
      (email !== undefined && !isValidEmail(safeEmail)) ||
      (address !== undefined && (typeof safeAddress !== 'string' || safeAddress.length > 200)) ||
      (city !== undefined && (typeof safeCity !== 'string' || !safeCity || safeCity.length > 120)) ||
      (phone !== undefined && (typeof safePhone !== 'string' || safePhone.length > 40)) ||
      (googleReviewUrl !== undefined && (typeof safeGoogleUrl !== 'string' || (safeGoogleUrl !== '' && !isGoogleReviewUrl(safeGoogleUrl)))) ||
      [status, installationPaymentStatus, subscriptionStatus, name, email, address, city, phone, googleReviewUrl].every(value => value === undefined)
    ) {
      res.status(400).json({ error: 'Vérifiez les informations et statuts transmis.' });
      return;
    }
    try {
      const values: unknown[] = [restaurantId];
      const assignments: string[] = [];
      const addField = (column: string, value: unknown) => {
        values.push(value);
        assignments.push(`${column} = $${values.length}`);
      };
      if (status !== undefined) addField('status', status);
      if (installationPaymentStatus !== undefined) addField('installation_payment_status', installationPaymentStatus);
      if (subscriptionStatus !== undefined) addField('subscription_status', subscriptionStatus);
      if (name !== undefined) addField('name', safeName);
      if (email !== undefined) addField('email', safeEmail);
      if (address !== undefined) addField('address', safeAddress);
      if (city !== undefined) addField('city', safeCity);
      if (phone !== undefined) addField('phone', safePhone);
      if (googleReviewUrl !== undefined) addField('google_review_url', safeGoogleUrl || null);
      const result = await pool.query(
        `UPDATE restaurants SET ${assignments.join(', ')}, updated_at = NOW()
         WHERE id = $1 RETURNING id, status, installation_payment_status, subscription_status`,
        values
      );
      if (!result.rowCount) {
        res.status(404).json({ error: 'Restaurant introuvable.' });
        return;
      }
      res.json({ restaurant: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  '/api/manager/restaurant',
  requireSession,
  allowRoles('owner', 'manager'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const result = await pool.query(
        `SELECT id, slug, name, owner_name, email, address, city, phone,
                google_review_url, table_count, tip_enabled, status, subscription_status
         FROM restaurants WHERE id = $1`,
        [req.authUser!.restaurantId]
      );
      if (!result.rowCount) {
        res.status(404).json({ error: 'La configuration de votre restaurant est introuvable.' });
        return;
      }
      res.setHeader('Cache-Control', 'no-store');
      res.json({ restaurant: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

app.patch(
  '/api/manager/restaurant',
  requireSameOrigin,
  requireSession,
  allowRoles('owner', 'manager'),
  async (req: AuthenticatedRequest, res, next) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const googleReviewUrl = typeof req.body?.googleReviewUrl === 'string' ? req.body.googleReviewUrl.trim() : '';
    const address = typeof req.body?.address === 'string' ? req.body.address.trim() : '';
    const city = typeof req.body?.city === 'string' ? req.body.city.trim() : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    const tableCount = Number(req.body?.tableCount);
    const tipEnabled = req.body?.tipEnabled;
    if (
      !name || name.length > 120 || !isGoogleReviewUrl(googleReviewUrl) ||
      address.length > 200 || city.length > 120 || phone.length > 40 ||
      !Number.isInteger(tableCount) || tableCount < 1 || tableCount > 500 ||
      typeof tipEnabled !== 'boolean'
    ) {
      res.status(400).json({ error: 'Nom, URL Google valide, nombre de tables ou option pourboire invalide.' });
      return;
    }
    try {
      const result = await pool.query(
        `UPDATE restaurants SET name = $2, google_review_url = $3, address = $4, city = $5,
           phone = $6, table_count = $7, tip_enabled = $8, updated_at = NOW()
         WHERE id = $1 AND status = 'active'
         RETURNING id, slug, name, owner_name, email, address, city, phone,
                   google_review_url, table_count, tip_enabled, subscription_status`,
        [req.authUser!.restaurantId, name, googleReviewUrl, address, city, phone, tableCount, tipEnabled]
      );
      if (!result.rowCount) {
        res.status(404).json({ error: 'Restaurant introuvable ou désactivé.' });
        return;
      }
      res.json({ restaurant: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  '/api/manager/team',
  requireSession,
  allowRoles('owner', 'manager'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const result = await pool.query(
        `SELECT id, name, role, assigned_tables, status, created_at
         FROM restaurant_staff WHERE restaurant_id = $1 ORDER BY created_at`,
        [req.authUser!.restaurantId]
      );
      res.setHeader('Cache-Control', 'no-store');
      res.json({ staff: result.rows });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  '/api/manager/team',
  requireSameOrigin,
  requireSession,
  allowRoles('owner', 'manager'),
  async (req: AuthenticatedRequest, res, next) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const role = typeof req.body?.role === 'string' ? req.body.role.trim() : 'Serveur';
    const assignedTables: unknown = req.body?.assignedTables;
    if (
      !name || name.length > 120 || !role || role.length > 80 ||
      !Array.isArray(assignedTables) || assignedTables.length > 500 ||
      !assignedTables.every(value => Number.isInteger(value) && value >= 1 && value <= 500)
    ) {
      res.status(400).json({ error: 'Nom, rôle ou tables attribuées invalides.' });
      return;
    }
    try {
      const staffId = `staff-${randomUUID()}`;
      const result = await pool.query(
        `INSERT INTO restaurant_staff (id, restaurant_id, name, role, assigned_tables)
         SELECT $1, r.id, $3, $4, $5::jsonb FROM restaurants r
         WHERE r.id = $2 AND r.status = 'active'
         RETURNING id, name, role, assigned_tables, status, created_at`,
        [staffId, req.authUser!.restaurantId, name, role, JSON.stringify([...new Set(assignedTables as number[])])]
      );
      if (!result.rowCount) {
        res.status(404).json({ error: 'Restaurant introuvable ou désactivé.' });
        return;
      }
      res.status(201).json({ staff: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

app.patch(
  '/api/manager/team/:staffId',
  requireSameOrigin,
  requireSession,
  allowRoles('owner', 'manager'),
  async (req: AuthenticatedRequest, res, next) => {
    const status = req.body?.status;
    if (!/^staff-[0-9a-f-]{36}$/i.test(req.params.staffId) || !['active', 'disabled'].includes(status)) {
      res.status(400).json({ error: 'Identifiant ou statut invalide.' });
      return;
    }
    try {
      const result = await pool.query(
        `UPDATE restaurant_staff SET status = $3 WHERE id = $1 AND restaurant_id = $2
         RETURNING id, status`,
        [req.params.staffId, req.authUser!.restaurantId, status]
      );
      if (!result.rowCount) {
        res.status(404).json({ error: 'Membre de l’équipe introuvable.' });
        return;
      }
      res.json({ staff: result.rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  '/api/manager/analytics',
  requireSession,
  allowRoles('owner', 'manager'),
  async (req: AuthenticatedRequest, res, next) => {
    const days = req.query.days === '30' ? 30 : req.query.days === '7' ? 7 : 0;
    if (!days) {
      res.status(400).json({ error: 'Choisissez une période de 7 ou 30 jours.' });
      return;
    }
    try {
      const restaurant = await pool.query<{ subscription_status: string }>(
        'SELECT subscription_status FROM restaurants WHERE id = $1 AND status = \'active\'',
        [req.authUser!.restaurantId]
      );
      if (!restaurant.rowCount) {
        res.status(404).json({ error: 'Restaurant introuvable ou désactivé.' });
        return;
      }
      if (!['active', 'trialing'].includes(restaurant.rows[0].subscription_status)) {
        res.status(402).json({ error: 'Abonnement inactif : les scans continuent, mais le tableau de bord et les exports sont suspendus.' });
        return;
      }
      const [scans, reviewSummary, reviews] = await Promise.all([
        pool.query(
          `SELECT DATE_TRUNC('day', scanned_at)::date::text AS day, COUNT(*)::int AS scans
           FROM scan_events WHERE restaurant_id = $1 AND scanned_at >= NOW() - ($2::int * INTERVAL '1 day')
           GROUP BY 1 ORDER BY 1`,
          [req.authUser!.restaurantId, days]
        ),
        pool.query<{ count: number; average_rating: string | null }>(
          `SELECT COUNT(*)::int AS count, ROUND(AVG(rating)::numeric, 1)::text AS average_rating
           FROM customer_reviews WHERE restaurant_id = $1 AND created_at >= NOW() - ($2::int * INTERVAL '1 day')`,
          [req.authUser!.restaurantId, days]
        ),
        pool.query(
          `SELECT id, rating, comment, waiter_id, created_at
           FROM customer_reviews WHERE restaurant_id = $1 AND created_at >= NOW() - ($2::int * INTERVAL '1 day')
           ORDER BY created_at DESC LIMIT 500`,
          [req.authUser!.restaurantId, days]
        )
      ]);
      const totalScans = scans.rows.reduce((sum, row) => sum + Number(row.scans), 0);
      const totalReviews = Number(reviewSummary.rows[0]?.count || 0);
      const averageRating = Number(reviewSummary.rows[0]?.average_rating || 0);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        days,
        scans: totalScans,
        reviewCount: totalReviews,
        averageRating,
        activity: scans.rows,
        reviews: reviews.rows
      });
    } catch (error) {
      next(error);
    }
  }
);

app.get('/api/payments/manual-details', requireSession, allowRoles('owner', 'manager'), (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    accountName: process.env.CCP_ACCOUNT_NAME || '',
    ccpNumber: process.env.CCP_ACCOUNT_NUMBER || '',
    ccpKey: process.env.CCP_KEY || '',
    baridimobRip: process.env.BARIDIMOB_RIP || '',
    phone: process.env.BARIDIMOB_PHONE || '',
    exchangeRate: getCcpExchangeRate()
  });
});

app.get(
  '/api/payments/history',
  requireSession,
  allowRoles('owner', 'manager'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const result = await pool.query(
        `SELECT id, transaction_type, status, amount_minor, currency, description, created_at, provider_reference
         FROM payment_transactions WHERE restaurant_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [req.authUser!.restaurantId]
      );
      res.setHeader('Cache-Control', 'no-store');
      res.json({ transactions: result.rows });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  '/api/payments/stripe/checkout',
  requireSameOrigin,
  requireSession,
  rateLimitPayments,
  allowRoles('owner', 'manager'),
  async (req: AuthenticatedRequest, res, next) => {
    const transactionType = req.body?.transactionType;
    const packId = req.body?.packId;
    const pack = Object.values(PRODUCT_PRICING.installationPacks).find(item => item.id === packId);
    if ((transactionType !== 'installation' || !pack) && transactionType !== 'subscription') {
      res.status(400).json({ error: 'Choisissez un pack d’installation ou l’abonnement mensuel.' });
      return;
    }
    let transactionId: string | null = null;
    try {
      const restaurantResult = await pool.query<{
        id: string; name: string; email: string; status: string; stripe_customer_id: string | null;
        subscription_status: string; subscription_trial_used: boolean;
      }>(
        `SELECT id, name, email, status, stripe_customer_id, subscription_status, subscription_trial_used
         FROM restaurants WHERE id = $1`,
        [req.authUser!.restaurantId]
      );
      const restaurant = restaurantResult.rows[0];
      if (!restaurant || restaurant.status !== 'active') {
        res.status(404).json({ error: 'Restaurant introuvable ou désactivé.' });
        return;
      }
      if (transactionType === 'subscription' && ['active', 'trialing', 'past_due'].includes(restaurant.subscription_status)) {
        res.status(409).json({ error: 'Un abonnement est déjà en cours. Utilisez le portail Stripe pour le gérer.' });
        return;
      }
      const amountEuros = transactionType === 'subscription'
        ? PRODUCT_PRICING.monthlySubscriptionEuros
        : pack!.priceEuros;
      const description = transactionType === 'subscription'
        ? PRODUCT_PRICING.subscriptionName
        : pack!.name;
      const transaction = await pool.query<{ id: string }>(
        `INSERT INTO payment_transactions
          (restaurant_id, provider, transaction_type, status, amount_minor, description)
         VALUES ($1, 'stripe', $2, 'pending', $3, $4) RETURNING id`,
        [restaurant.id, transactionType, amountEuros * 100, description]
      );
      transactionId = transaction.rows[0].id;
      const provider = new StripeTestPaymentProvider(getStripe());
      const origin = appOrigin || `${req.protocol}://${req.get('host')}`;
      const checkoutUrl = await provider.createCheckout({
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        email: restaurant.email,
        customerId: restaurant.stripe_customer_id,
        transactionId,
        transactionType,
        amountEuros,
        productName: description,
        trialDays: restaurant.subscription_trial_used ? 0 : PRODUCT_PRICING.subscriptionTrialDays,
        successUrl: `${origin}/?payment=processing`,
        cancelUrl: `${origin}/?payment=cancelled`
      });
      res.json({ checkoutUrl });
    } catch (error) {
      if (transactionId) {
        try {
          await pool.query(
            `UPDATE payment_transactions SET status = 'failed', updated_at = NOW()
             WHERE id = $1 AND status = 'pending'`,
            [transactionId]
          );
        } catch (statusError) {
          console.error('Le statut de la transaction Stripe n’a pas pu être mis à jour.', statusError);
        }
      }
      next(error);
    }
  }
);

app.post(
  '/api/payments/stripe/portal',
  requireSameOrigin,
  requireSession,
  rateLimitPayments,
  allowRoles('owner', 'manager'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const result = await pool.query<{ stripe_customer_id: string | null }>(
        'SELECT stripe_customer_id FROM restaurants WHERE id = $1',
        [req.authUser!.restaurantId]
      );
      const customerId = result.rows[0]?.stripe_customer_id;
      if (!customerId) {
        res.status(409).json({ error: 'Aucun compte de paiement Stripe n’est encore lié à ce restaurant.' });
        return;
      }
      const origin = appOrigin || `${req.protocol}://${req.get('host')}`;
      const url = await new StripeTestPaymentProvider(getStripe()).createPortal(customerId, `${origin}/?view=manager`);
      res.json({ url });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  '/api/payments/manual/transactions',
  requireSameOrigin,
  requireSession,
  rateLimitPayments,
  allowRoles('owner', 'manager'),
  async (req: AuthenticatedRequest, res, next) => {
    const transactionType = req.body?.transactionType;
    const pack = Object.values(PRODUCT_PRICING.installationPacks).find(item => item.id === req.body?.packId);
    if ((transactionType !== 'installation' || !pack) && transactionType !== 'subscription') {
      res.status(400).json({ error: 'Choisissez un pack ou l’abonnement.' });
      return;
    }
    const amountEuros = transactionType === 'subscription' ? PRODUCT_PRICING.monthlySubscriptionEuros : pack!.priceEuros;
    const description = transactionType === 'subscription' ? PRODUCT_PRICING.subscriptionName : pack!.name;
    const exchangeRate = getCcpExchangeRate();
    if (exchangeRate === null) {
      res.status(503).json({ error: 'Le paiement CCP/Baridimob est désactivé tant que le taux EUR/DZD n’est pas configuré.' });
      return;
    }
    try {
      const result = await pool.query<{ id: string }>(
        `INSERT INTO payment_transactions
          (restaurant_id, provider, transaction_type, status, amount_minor, currency, description)
         VALUES ($1, 'manual_ccp', $2, 'pending', $3, 'dzd', $4) RETURNING id`,
        [req.authUser!.restaurantId, transactionType, Math.round(amountEuros * exchangeRate * 100), description]
      );
      res.status(201).json({ transactionId: result.rows[0].id });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  '/api/payments/manual/proofs/:transactionId',
  requireSameOrigin,
  requireSession,
  rateLimitProofs,
  allowRoles('owner', 'manager'),
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: '5mb'
  }),
  async (req: AuthenticatedRequest, res, next) => {
    const transactionId = req.params.transactionId;
    const reference = typeof req.get('x-payment-reference') === 'string'
      ? req.get('x-payment-reference')!.trim()
      : '';
    const mimeType = req.get('content-type')?.split(';')[0]?.trim().toLowerCase() || '';
    const image = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const isJpeg = mimeType === 'image/jpeg' && image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
    const isPng = mimeType === 'image/png' && image.length >= 8 && image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isWebp = mimeType === 'image/webp' && image.length >= 12 &&
      image.toString('ascii', 0, 4) === 'RIFF' && image.toString('ascii', 8, 12) === 'WEBP';
    if (!/^[A-Za-z0-9 ._/-]{3,80}$/.test(reference) || image.length < 1 || image.length > 5 * 1024 * 1024 || !(isJpeg || isPng || isWebp)) {
      res.status(400).json({ error: 'Déposez une image JPEG, PNG ou WebP valide (5 Mo maximum) et une référence de paiement.' });
      return;
    }

    const storedName = `${randomUUID()}.${mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp'}`;
    let fileCreated = false;
    const client = await pool.connect();
    try {
      const transaction = await client.query<{ id: string }>(
        `SELECT pt.id FROM payment_transactions pt
         WHERE pt.id = $1 AND pt.restaurant_id = $2 AND pt.provider = 'manual_ccp'
           AND pt.status IN ('pending', 'proof_pending', 'rejected')`,
        [transactionId, req.authUser!.restaurantId]
      );
      if (!transaction.rowCount) {
        res.status(404).json({ error: 'Paiement manuel introuvable ou déjà traité.' });
        return;
      }
      await mkdir(proofDirectory, { recursive: true, mode: 0o700 });
      await writeFile(path.join(proofDirectory, storedName), image, { flag: 'wx', mode: 0o600 });
      fileCreated = true;
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO payment_proofs (transaction_id, stored_name, mime_type, file_size, reference)
         VALUES ($1, $2, $3, $4, $5)`,
        [transactionId, storedName, mimeType, image.length, reference]
      );
      await client.query(
        `UPDATE payment_transactions SET status = 'proof_pending', updated_at = NOW() WHERE id = $1`,
        [transactionId]
      );
      await client.query('COMMIT');
      const owner = await client.query<{ email: string }>('SELECT email FROM restaurants WHERE id = $1', [req.authUser!.restaurantId]);
      if (owner.rows[0]?.email) {
        try { await sendFrenchMail(owner.rows[0].email, 'proof_pending', reference); }
        catch (mailError) { console.error('L’e-mail de confirmation de preuve n’a pas pu être envoyé.', mailError); }
      }
      res.status(201).json({ status: 'proof_pending' });
    } catch (error) {
      await client.query('ROLLBACK');
      if (fileCreated) await unlink(path.join(proofDirectory, storedName));
      next(error);
    } finally {
      client.release();
    }
  }
);

app.get(
  '/api/admin/payment-proofs',
  requireSession,
  allowRoles('super_admin'),
  async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT pp.id, pp.reference, pp.mime_type, pp.file_size, pp.created_at,
                pt.id AS transaction_id, pt.amount_minor, pt.currency, pt.description,
                r.id AS restaurant_id, r.name AS restaurant_name, r.email AS restaurant_email
         FROM payment_proofs pp
         JOIN payment_transactions pt ON pt.id = pp.transaction_id
         JOIN restaurants r ON r.id = pt.restaurant_id
         WHERE pt.status = 'proof_pending' AND pp.reviewed_at IS NULL ORDER BY pp.created_at ASC`
      );
      res.json({ proofs: result.rows });
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  '/api/admin/payment-proofs/:proofId/image',
  requireSession,
  allowRoles('super_admin'),
  async (req, res, next) => {
    try {
      const proof = await pool.query<{ stored_name: string; mime_type: string }>(
        'SELECT stored_name, mime_type FROM payment_proofs WHERE id = $1',
        [req.params.proofId]
      );
      if (!proof.rowCount) {
        res.status(404).json({ error: 'Preuve introuvable.' });
        return;
      }
      const storedName = path.basename(proof.rows[0].stored_name);
      const image = await readFile(path.join(proofDirectory, storedName));
      res.setHeader('Content-Type', proof.rows[0].mime_type);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.send(image);
    } catch (error) {
      next(error);
    }
  }
);

app.patch(
  '/api/admin/payment-proofs/:proofId',
  requireSameOrigin,
  requireSession,
  allowRoles('super_admin'),
  async (req: AuthenticatedRequest, res, next) => {
    const decision = req.body?.decision;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if ((decision !== 'approve' && decision !== 'reject') || (decision === 'reject' && (!reason || reason.length > 500))) {
      res.status(400).json({ error: 'Choisissez une décision et indiquez le motif en cas de refus.' });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<{ transaction_id: string; restaurant_id: string; email: string; transaction_type: string }>(
        `SELECT pp.transaction_id, pt.restaurant_id, r.email, pt.transaction_type
         FROM payment_proofs pp
         JOIN payment_transactions pt ON pt.id = pp.transaction_id
         JOIN restaurants r ON r.id = pt.restaurant_id
         WHERE pp.id = $1 AND pt.status = 'proof_pending'
         FOR UPDATE OF pp, pt`,
        [req.params.proofId]
      );
      const proof = result.rows[0];
      if (!proof) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Preuve introuvable ou déjà traitée.' });
        return;
      }
      const transactionStatus = decision === 'approve' ? 'paid' : 'rejected';
      await client.query(
        `UPDATE payment_transactions SET status = $2, updated_at = NOW() WHERE id = $1`,
        [proof.transaction_id, transactionStatus]
      );
      await client.query(
        `UPDATE payment_proofs SET reviewed_by = $2, reviewed_at = NOW(), rejection_reason = $3 WHERE id = $1`,
        [req.params.proofId, req.authUser!.id, decision === 'reject' ? reason : null]
      );
      if (decision === 'approve' && proof.transaction_type === 'installation') {
        await client.query(
          `UPDATE restaurants SET installation_payment_status = 'paid', updated_at = NOW() WHERE id = $1`,
          [proof.restaurant_id]
        );
      } else if (decision === 'approve' && proof.transaction_type === 'subscription') {
        await client.query(
          `UPDATE restaurants SET subscription_status = 'active', updated_at = NOW() WHERE id = $1`,
          [proof.restaurant_id]
        );
      }
      await client.query('COMMIT');
      if (proof.email) {
        try {
          const managerUrl = `${appOrigin || `${req.protocol}://${req.get('host')}/`}?view=manager`;
          await sendFrenchMail(
            proof.email,
            decision === 'approve' ? 'payment_received' : 'proof_refused',
            decision === 'reject' ? reason : 'paiement CCP / Baridimob',
            decision === 'approve' ? managerUrl : undefined
          );
          if (decision === 'approve' && proof.transaction_type === 'installation') {
            await sendFrenchMail(proof.email, 'account_activated', 'paiement confirmé', managerUrl);
          }
        } catch (mailError) {
          console.error('L’e-mail de décision de preuve n’a pas pu être envoyé.', mailError);
        }
      }
      res.json({ status: transactionStatus });
    } catch (error) {
      await client.query('ROLLBACK');
      next(error);
    } finally {
      client.release();
    }
  }
);

app.get(
  '/api/admin/scan-targets',
  requireSession,
  allowRoles('super_admin', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const restaurantId = typeof req.query.restaurantId === 'string' ? req.query.restaurantId : '';
      if (!restaurantId || !canAccessRestaurant(req.authUser!, restaurantId)) {
        res.status(403).json({ error: 'Vous ne pouvez pas consulter les puces de cet établissement.' });
        return;
      }
      const result = await pool.query(
        `SELECT st.public_id, st.restaurant_id, st.kind, st.uid, st.label,
                st.target_type, st.target_id, st.status, st.created_at, st.last_scanned_at,
                COUNT(se.id)::int AS total_scans
         FROM scan_targets st
         LEFT JOIN scan_events se ON se.target_id = st.public_id
         WHERE st.restaurant_id = $1
         GROUP BY st.public_id
         ORDER BY st.created_at DESC`,
        [restaurantId]
      );
      res.setHeader('Cache-Control', 'no-store');
      res.json({ targets: result.rows });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  '/api/admin/scan-targets',
  requireSameOrigin,
  requireSession,
  allowRoles('super_admin', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res, next) => {
    const restaurantId = typeof req.body?.restaurantId === 'string' ? req.body.restaurantId.trim() : '';
    const name = typeof req.body?.restaurantName === 'string' ? req.body.restaurantName.trim() : '';
    const slug = typeof req.body?.restaurantSlug === 'string' ? req.body.restaurantSlug.trim().toLowerCase() : '';
    const reviewUrl = typeof req.body?.googleReviewUrl === 'string' ? req.body.googleReviewUrl.trim() : '';
    const kind = req.body?.kind;
    const uid = typeof req.body?.uid === 'string' ? req.body.uid.trim().toUpperCase() : '';
    const label = typeof req.body?.label === 'string' ? req.body.label.trim() : '';
    const targetType = req.body?.targetType;
    const targetId = typeof req.body?.targetId === 'string' ? req.body.targetId.trim() : '';

    if (
      !/^[a-zA-Z0-9_-]{1,128}$/.test(restaurantId) ||
      !name || name.length > 120 ||
      !/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug) ||
      (reviewUrl && (reviewUrl.length > 2048 || !isGoogleReviewUrl(reviewUrl))) ||
      (kind !== 'nfc' && kind !== 'qr') ||
      (kind === 'nfc' && (!uid || uid.length > 128 || /[\u0000-\u001f]/.test(uid))) ||
      (kind === 'qr' && uid !== '') ||
      !label || label.length > 120 ||
      (targetType !== 'server' && targetType !== 'table') ||
      !targetId || targetId.length > 128
    ) {
      res.status(400).json({ error: 'Les informations de la puce, du QR ou du restaurant sont invalides.' });
      return;
    }
    if (!canAccessRestaurant(req.authUser!, restaurantId)) {
      res.status(403).json({ error: 'Vous ne pouvez pas modifier cet établissement.' });
      return;
    }

    let client: PoolClient | null = null;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO restaurants (id, slug, name, google_review_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           slug = EXCLUDED.slug,
           name = EXCLUDED.name,
           google_review_url = EXCLUDED.google_review_url,
           updated_at = NOW()`,
        [restaurantId, slug, name, reviewUrl || null]
      );
      const publicId = randomBytes(24).toString('base64url');
      const created = await client.query(
        `INSERT INTO scan_targets
           (public_id, restaurant_id, kind, uid, label, target_type, target_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (restaurant_id, target_type, target_id) WHERE kind = 'qr'
         DO UPDATE SET label = EXCLUDED.label
         RETURNING public_id, restaurant_id, kind, uid, label, target_type, target_id, status,
                   created_at, NULL::timestamptz AS last_scanned_at, 0::int AS total_scans`,
        [publicId, restaurantId, kind, kind === 'nfc' ? uid : null, label, targetType, targetId]
      );
      await client.query('COMMIT');
      res.status(201).json({ target: created.rows[0] });
    } catch (error) {
      if (client) await client.query('ROLLBACK');
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        res.status(409).json({ error: 'Cette puce NFC, ce lien ou ce restaurant existe déjà.' });
        return;
      }
      next(error);
    } finally {
      client?.release();
    }
  }
);

app.patch(
  '/api/admin/scan-targets/:publicId',
  requireSameOrigin,
  requireSession,
  allowRoles('super_admin', 'owner', 'manager'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const publicId = req.params.publicId;
      const status = req.body?.status;
      const label = typeof req.body?.label === 'string' ? req.body.label.trim() : '';
      const targetType = req.body?.targetType;
      const targetId = typeof req.body?.targetId === 'string' ? req.body.targetId.trim() : '';
      const isStatusUpdate = status === 'active' || status === 'disabled';
      const isTargetUpdate = Boolean(label && label.length <= 120 && (targetType === 'server' || targetType === 'table') && targetId && targetId.length <= 128);
      if (!/^[A-Za-z0-9_-]{20,80}$/.test(publicId) || (!isStatusUpdate && !isTargetUpdate)) {
        res.status(400).json({ error: 'Identifiant, cible ou statut de puce invalide.' });
        return;
      }
      const existing = await pool.query<{ restaurant_id: string }>(
        'SELECT restaurant_id FROM scan_targets WHERE public_id = $1',
        [publicId]
      );
      const target = existing.rows[0];
      if (!target) {
        res.status(404).json({ error: 'Cette puce ou ce QR code est introuvable.' });
        return;
      }
      if (!canAccessRestaurant(req.authUser!, target.restaurant_id)) {
        res.status(403).json({ error: 'Vous ne pouvez pas modifier cette puce.' });
        return;
      }
      if (isStatusUpdate) {
        await pool.query('UPDATE scan_targets SET status = $2 WHERE public_id = $1', [publicId, status]);
        res.json({ status });
        return;
      }
      try {
        await pool.query(
          'UPDATE scan_targets SET label = $2, target_type = $3, target_id = $4 WHERE public_id = $1',
          [publicId, label, targetType, targetId]
        );
        res.json({ status: 'updated' });
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
          res.status(409).json({ error: 'Un QR existe déjà pour cette cible.' });
          return;
        }
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }
);

app.post('/api/public/scan-targets/:publicId/scan', rateLimitScans, async (req, res, next) => {
  const publicId = req.params.publicId;
  const dedupeKey = typeof req.body?.dedupeKey === 'string' ? req.body.dedupeKey : '';
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(publicId) || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(dedupeKey)) {
    res.status(404).json({ status: 'unknown', error: 'Ce lien de scan est introuvable.' });
    return;
  }

  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query<{
      restaurant_id: string;
      restaurant_slug: string;
      restaurant_name: string;
      google_review_url: string | null;
      tip_enabled: boolean;
      restaurant_status: string;
      target_status: string;
      target_type: 'server' | 'table';
      target_id: string;
      label: string;
    }>(
      `SELECT r.id AS restaurant_id, r.slug AS restaurant_slug, r.name AS restaurant_name,
              r.google_review_url, r.tip_enabled, r.status AS restaurant_status, st.status AS target_status,
              st.target_type, st.target_id, st.label
       FROM scan_targets st
       JOIN restaurants r ON r.id = st.restaurant_id
       WHERE st.public_id = $1
       FOR SHARE OF st`,
      [publicId]
    );
    const target = result.rows[0];
    if (!target) {
      await client.query('ROLLBACK');
      res.status(404).json({ status: 'unknown', error: 'Ce lien de scan est introuvable.' });
      return;
    }
    if (target.target_status !== 'active' || target.restaurant_status !== 'active') {
      await client.query('ROLLBACK');
      res.status(410).json({ status: 'disabled', error: 'Ce lien est temporairement désactivé.' });
      return;
    }
    if (!target.google_review_url || !isGoogleReviewUrl(target.google_review_url)) {
      await client.query('ROLLBACK');
      res.status(422).json({ status: 'unconfigured', error: 'La page d’avis de cet établissement n’est pas encore configurée.' });
      return;
    }

    const inserted = await client.query(
      `INSERT INTO scan_events (target_id, restaurant_id, dedupe_key)
       VALUES ($1, $2, $3)
       ON CONFLICT (target_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
       RETURNING id`,
      [publicId, target.restaurant_id, dedupeKey]
    );
    const isDuplicate = inserted.rowCount === 0;
    if (!isDuplicate) {
      await client.query(
        'UPDATE scan_targets SET last_scanned_at = NOW() WHERE public_id = $1',
        [publicId]
      );
    }
    await client.query('COMMIT');
    res.json({
      status: 'active',
      duplicate: isDuplicate,
      restaurant: {
        id: target.restaurant_id,
        slug: target.restaurant_slug,
        name: target.restaurant_name,
        googleReviewUrl: target.google_review_url,
        tipEnabled: target.tip_enabled
      },
      target: {
        type: target.target_type,
        id: target.target_id,
        label: target.label
      }
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    next(error);
  } finally {
    client?.release();
  }
});

app.post('/api/public/reviews', rateLimitReviews, async (req, res, next) => {
  const publicId = typeof req.body?.publicId === 'string' ? req.body.publicId : '';
  const dedupeKey = typeof req.body?.dedupeKey === 'string' ? req.body.dedupeKey : '';
  const rating = Number(req.body?.rating);
  const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
  if (
    !/^[A-Za-z0-9_-]{20,80}$/.test(publicId) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(dedupeKey) ||
    !Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length > 2000
  ) {
    res.status(400).json({ error: 'Note ou commentaire invalide.' });
    return;
  }
  try {
    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO customer_reviews (restaurant_id, target_id, waiter_id, rating, comment, dedupe_key, google_opened)
       SELECT r.id, st.public_id, CASE WHEN st.target_type = 'server' THEN st.target_id ELSE NULL END,
              $2, $3, $4, $5
       FROM scan_targets st JOIN restaurants r ON r.id = st.restaurant_id
       WHERE st.public_id = $1 AND st.status = 'active' AND r.status = 'active'
         AND r.google_review_url IS NOT NULL
       ON CONFLICT (restaurant_id, dedupe_key) DO NOTHING
       RETURNING id`,
      [publicId, rating, comment, dedupeKey, req.body?.googleOpened === true]
    );
    if (!inserted.rowCount) {
      const target = await pool.query(
        `SELECT 1 FROM scan_targets st JOIN restaurants r ON r.id = st.restaurant_id
         WHERE st.public_id = $1 AND st.status = 'active' AND r.status = 'active' AND r.google_review_url IS NOT NULL`,
        [publicId]
      );
      if (!target.rowCount) {
        res.status(404).json({ error: 'Ce lien de scan n’est plus actif.' });
        return;
      }
    }
    res.status(201).json({ saved: true, duplicate: !inserted.rowCount });
  } catch (error) {
    next(error);
  }
});

app.post('/api/public/tips/checkout', requireSameOrigin, rateLimitPayments, async (req, res, next) => {
  const publicId = typeof req.body?.publicId === 'string' ? req.body.publicId : '';
  const amount = Number(req.body?.amountEuros);
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(publicId) || !Number.isInteger(amount) || amount < 1 || amount > 500) {
    res.status(400).json({ error: 'Le montant du pourboire est invalide.' });
    return;
  }
  let transactionId: string | null = null;
  try {
    const restaurantResult = await pool.query<{ id: string; name: string; status: string; tip_enabled: boolean }>(
      `SELECT r.id, r.name, r.status, r.tip_enabled FROM scan_targets st
       JOIN restaurants r ON r.id = st.restaurant_id
       WHERE st.public_id = $1 AND st.status = 'active'`,
      [publicId]
    );
    const restaurant = restaurantResult.rows[0];
    if (!restaurant || restaurant.status !== 'active' || !restaurant.tip_enabled) {
      res.status(404).json({ error: 'Le pourboire n’est pas disponible pour ce lien.' });
      return;
    }
    const transaction = await pool.query<{ id: string }>(
      `INSERT INTO payment_transactions
        (restaurant_id, provider, transaction_type, status, amount_minor, currency, description, metadata)
       VALUES ($1, 'stripe', 'tip', 'pending', $2, 'eur', $3, $4::jsonb) RETURNING id`,
      [restaurant.id, amount * 100, `Pourboire — ${restaurant.name}`, JSON.stringify({ targetId: publicId })]
    );
    transactionId = transaction.rows[0].id;
    const origin = appOrigin || `${req.protocol}://${req.get('host')}`;
    const checkoutUrl = await new StripeTestPaymentProvider(getStripe()).createCheckout({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      email: '',
      transactionId,
      transactionType: 'tip',
      amountEuros: amount,
      productName: `Pourboire pour ${restaurant.name}`,
      trialDays: 0,
      successUrl: `${origin}/?tip=received`,
      cancelUrl: `${origin}/r/${encodeURIComponent(publicId)}`
    });
    res.json({ checkoutUrl });
  } catch (error) {
    if (transactionId) {
      try {
        await pool.query(
          `UPDATE payment_transactions SET status = 'failed', updated_at = NOW()
           WHERE id = $1 AND status = 'pending'`,
          [transactionId]
        );
      } catch (statusError) {
        console.error('Le statut du pourboire n’a pas pu être mis à jour.', statusError);
      }
    }
    next(error);
  }
});

app.get(
  '/api/admin/audit',
  requireSession,
  allowRoles('super_admin'),
  async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT id, actor_user_id, event_type, target_user_id, metadata, created_at
         FROM audit_events ORDER BY created_at DESC LIMIT 100`
      );
      res.setHeader('Cache-Control', 'no-store');
      res.json({ events: result.rows });
    } catch (error) {
      next(error);
    }
  }
);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Digifeel API error:', error);
  if (typeof error === 'object' && error !== null && 'type' in error) {
    const type = String(error.type);
    if (type === 'entity.too.large') {
      res.status(413).json({ error: 'Le fichier dépasse la taille maximale autorisée de 5 Mo.' });
      return;
    }
    if (type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Le corps de la requête est mal formé.' });
      return;
    }
  }
  res.status(500).json({ error: 'Une erreur est survenue. Réessayez dans quelques instants.' });
});

const start = async (): Promise<void> => {
  await migrateDatabase();
  const port = Number(process.env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }
  app.listen(port, '127.0.0.1', () => {
    console.log(`Digifeel API listening on 127.0.0.1:${port}`);
  });
};

start().catch(async error => {
  console.error('Unable to start Digifeel API:', error);
  await pool.end();
  process.exitCode = 1;
});
