import 'dotenv/config';
import { randomBytes, scrypt as nodeScrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import express, { type NextFunction, type Request, type Response } from 'express';
import { migrateDatabase, pool } from './database.js';

const scrypt = promisify(nodeScrypt);
const app = express();
const sessionCookie = '__Host-digifeel_session';
const sessionDurationMs = 12 * 60 * 60 * 1000;
const bootstrapToken = process.env.AUTH_BOOTSTRAP_TOKEN;
const appOrigin = process.env.APP_ORIGIN;
const isProduction = process.env.NODE_ENV === 'production';
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

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
app.use(express.json({ limit: '16kb', strict: true }));
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
      res.clearCookie(sessionCookie, { httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
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
    secure: true,
    sameSite: 'strict',
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
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(84523071)');
      const checkAgain = await client.query('SELECT 1 FROM app_users LIMIT 1');
      if (checkAgain.rowCount) {
        await client.query('ROLLBACK');
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
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
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
  console.error('Authentication API error:', error);
  res.status(500).json({ error: 'Une erreur est survenue. Réessayez dans quelques instants.' });
});

const start = async (): Promise<void> => {
  await migrateDatabase();
  const port = Number(process.env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }
  app.listen(port, '127.0.0.1', () => {
    console.log(`Digifeel authentication API listening on 127.0.0.1:${port}`);
  });
};

start().catch(async error => {
  console.error('Unable to start Digifeel API:', error);
  await pool.end();
  process.exitCode = 1;
});
