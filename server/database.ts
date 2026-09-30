import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to start the authentication API.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

export async function migrateDatabase(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('super_admin', 'owner', 'manager', 'kitchen', 'cashier', 'viewer')),
      restaurant_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      disabled_at TIMESTAMPTZ,
      CHECK (
        (role = 'super_admin' AND restaurant_id IS NULL)
        OR (role <> 'super_admin' AND restaurant_id IS NOT NULL)
      )
    );

    CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_unique
      ON app_users (LOWER(email));

    CREATE TABLE IF NOT EXISTS app_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS app_sessions_expiry_idx
      ON app_sessions (expires_at);

    CREATE TABLE IF NOT EXISTS audit_events (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      actor_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      target_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS audit_events_created_at_idx
      ON audit_events (created_at DESC);
  `);
}
