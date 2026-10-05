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

    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      google_review_url TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
      owner_name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      table_count INTEGER NOT NULL DEFAULT 12 CHECK (table_count BETWEEN 1 AND 500),
      tip_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      installation_pack TEXT NOT NULL DEFAULT 'complete',
      installation_price_euros INTEGER NOT NULL DEFAULT 100,
      installation_payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (installation_payment_status IN ('pending', 'paid', 'failed', 'refunded')),
      subscription_status TEXT NOT NULL DEFAULT 'inactive' CHECK (subscription_status IN ('inactive', 'trialing', 'active', 'past_due', 'canceled')),
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      subscription_trial_used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';
    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '';
    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';
    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS table_count INTEGER NOT NULL DEFAULT 12;
    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS tip_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS installation_pack TEXT NOT NULL DEFAULT 'complete';
    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS installation_price_euros INTEGER NOT NULL DEFAULT 100;
    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS installation_payment_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive';
    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS subscription_trial_used BOOLEAN NOT NULL DEFAULT FALSE;

    CREATE TABLE IF NOT EXISTS account_invitations (
      token_hash TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS account_invitations_expiry_idx ON account_invitations (expires_at);

    CREATE TABLE IF NOT EXISTS scan_targets (
      public_id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('nfc', 'qr')),
      uid TEXT,
      label TEXT NOT NULL,
      target_type TEXT NOT NULL CHECK (target_type IN ('server', 'table')),
      target_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_scanned_at TIMESTAMPTZ,
      CHECK ((kind = 'nfc' AND uid IS NOT NULL) OR (kind = 'qr' AND uid IS NULL))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS scan_targets_nfc_uid_unique
      ON scan_targets (UPPER(uid)) WHERE kind = 'nfc';

    CREATE UNIQUE INDEX IF NOT EXISTS scan_targets_qr_assignment_unique
      ON scan_targets (restaurant_id, target_type, target_id) WHERE kind = 'qr';

    CREATE INDEX IF NOT EXISTS scan_targets_restaurant_created_idx
      ON scan_targets (restaurant_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS scan_events (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      target_id TEXT NOT NULL REFERENCES scan_targets(public_id) ON DELETE CASCADE,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      dedupe_key TEXT,
      scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE scan_events ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

    CREATE UNIQUE INDEX IF NOT EXISTS scan_events_dedupe_unique
      ON scan_events (target_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

    CREATE INDEX IF NOT EXISTS scan_events_restaurant_scanned_idx
      ON scan_events (restaurant_id, scanned_at DESC);

    CREATE INDEX IF NOT EXISTS scan_events_target_scanned_idx
      ON scan_events (target_id, scanned_at DESC);

    CREATE TABLE IF NOT EXISTS restaurant_staff (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Serveur',
      assigned_tables JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS restaurant_staff_restaurant_idx
      ON restaurant_staff (restaurant_id, created_at);

    CREATE TABLE IF NOT EXISTS customer_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      target_id TEXT REFERENCES scan_targets(public_id) ON DELETE SET NULL,
      waiter_id TEXT,
      rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL DEFAULT '',
      dedupe_key TEXT NOT NULL,
      google_opened BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (restaurant_id, dedupe_key)
    );

    CREATE INDEX IF NOT EXISTS customer_reviews_restaurant_created_idx
      ON customer_reviews (restaurant_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS payment_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK (provider IN ('stripe', 'manual_ccp')),
      transaction_type TEXT NOT NULL CHECK (transaction_type IN ('installation', 'subscription', 'tip')),
      status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'proof_pending', 'rejected')),
      amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
      currency TEXT NOT NULL DEFAULT 'eur',
      provider_reference TEXT,
      description TEXT NOT NULL DEFAULT '',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS payment_transactions_restaurant_created_idx
      ON payment_transactions (restaurant_id, created_at DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_provider_reference_unique
      ON payment_transactions (provider, provider_reference) WHERE provider_reference IS NOT NULL;

    CREATE TABLE IF NOT EXISTS payment_proofs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
      stored_name TEXT NOT NULL UNIQUE,
      mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
      file_size INTEGER NOT NULL CHECK (file_size BETWEEN 1 AND 5242880),
      reference TEXT NOT NULL,
      reviewed_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ,
      rejection_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS stripe_webhook_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}
