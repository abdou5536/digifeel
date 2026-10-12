import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations');

export const ids = {
  restA: '00000000-0000-0000-0000-0000000000a1',
  restB: '00000000-0000-0000-0000-0000000000b1',
  superAdmin: '10000000-0000-0000-0000-000000000001',
  adminA: '10000000-0000-0000-0000-0000000000a1',
  serverA: '10000000-0000-0000-0000-0000000000a2',
  kitchenA: '10000000-0000-0000-0000-0000000000a3',
  adminB: '10000000-0000-0000-0000-0000000000b1',
  serverB: '10000000-0000-0000-0000-0000000000b2',
  kitchenB: '10000000-0000-0000-0000-0000000000b3',
  reseller: '10000000-0000-0000-0000-000000000099',
  srvRowA: '20000000-0000-0000-0000-0000000000a1',
  srvRowB: '20000000-0000-0000-0000-0000000000b1'
};

// Émulation minimale de Supabase : schéma auth, rôles et privilèges par défaut.
const SUPABASE_STUB = `
create schema if not exists extensions;
create schema if not exists auth;
create extension if not exists pgcrypto with schema extensions;
create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
grant usage on schema public, auth, extensions to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

export function migrationFiles() {
  return readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
}

export async function createDb(upTo?: string) {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_STUB);
  for (const file of migrationFiles()) {
    if (upTo && file > upTo) break;
    await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
  }
  return db;
}

export async function seed(db: PGlite) {
  const users: Array<[string, string, string | null, string | null]> = [
    [ids.superAdmin, 'super_admin', null, null],
    [ids.adminA, 'restaurant_admin', ids.restA, null],
    [ids.serverA, 'server', ids.restA, ids.srvRowA],
    [ids.kitchenA, 'kitchen', ids.restA, null],
    [ids.adminB, 'restaurant_admin', ids.restB, null],
    [ids.serverB, 'server', ids.restB, ids.srvRowB],
    [ids.kitchenB, 'kitchen', ids.restB, null],
    [ids.reseller, 'reseller', null, null]
  ];
  await db.exec(`
    insert into public.restaurants (id, name, google_review_url) values
      ('${ids.restA}', 'Resto A', 'https://g.page/r/a/review'),
      ('${ids.restB}', 'Resto B', 'https://g.page/r/b/review');
    insert into public.servers (id, restaurant_id, name) values
      ('${ids.srvRowA}', '${ids.restA}', 'Serveur A'),
      ('${ids.srvRowB}', '${ids.restB}', 'Serveur B');
  `);
  await db.exec(`insert into public.subscriptions (restaurant_id, status) values ('${ids.restA}', 'active'), ('${ids.restB}', 'active');`);
  for (const [id, role, restaurant, server] of users) {
    await db.query('insert into auth.users (id) values ($1)', [id]);
    await db.query(
      'update public.app_users set role=$2, restaurant_id=$3, server_id=$4 where id=$1',
      [id, role, restaurant, server]
    );
  }
  await db.exec(`
    insert into public.chips (id, restaurant_id, activation_code_hash, status) values
      ('chipA', '${ids.restA}', '${'a'.repeat(64)}', 'active'),
      ('chipB', '${ids.restB}', '${'b'.repeat(64)}', 'active');
    insert into public.reviews (id, restaurant_id, chip_id, stars, device_hash) values
      ('30000000-0000-0000-0000-0000000000a1', '${ids.restA}', 'chipA', 5, 'dev'),
      ('30000000-0000-0000-0000-0000000000b1', '${ids.restB}', 'chipB', 1, 'dev');
    insert into public.pos_products (id, restaurant_id, name, price_dzd) values
      ('40000000-0000-0000-0000-0000000000a1', '${ids.restA}', 'Pizza', 1200),
      ('40000000-0000-0000-0000-0000000000b1', '${ids.restB}', 'Burger', 900);
    insert into public.pos_sales (id, restaurant_id, cashier_user_id, total_dzd, payment_method) values
      ('50000000-0000-0000-0000-0000000000a1', '${ids.restA}', '${ids.adminA}', 1200, 'cash'),
      ('50000000-0000-0000-0000-0000000000b1', '${ids.restB}', '${ids.adminB}', 900, 'cash');
    insert into public.table_orders (id, restaurant_id, table_label) values
      ('60000000-0000-0000-0000-0000000000a1', '${ids.restA}', 'T1'),
      ('60000000-0000-0000-0000-0000000000b1', '${ids.restB}', 'T9');
    insert into public.table_order_items (order_id, restaurant_id, product_name, quantity) values
      ('60000000-0000-0000-0000-0000000000a1', '${ids.restA}', 'Pizza', 2),
      ('60000000-0000-0000-0000-0000000000b1', '${ids.restB}', 'Burger', 1);
  `);
}

export type Actor = keyof typeof ids | 'anon';

/** Exécute `fn` avec le rôle SQL et le JWT de l'acteur (RLS appliquée). */
export async function as<T>(db: PGlite, actor: Actor, fn: () => Promise<T>): Promise<T> {
  const role = actor === 'anon' ? 'anon' : 'authenticated';
  const sub = actor === 'anon' ? '' : ids[actor];
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [sub]);
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

/** Retourne le nombre de lignes affectées/retournées, ou -1 si PostgreSQL a refusé (permission/RLS). */
export async function attempt(db: PGlite, sql: string): Promise<number> {
  try {
    const res = await db.query(sql);
    return /^\s*select/i.test(sql) ? res.rows.length : (res.affectedRows ?? res.rows.length);
  } catch {
    return -1;
  }
}
