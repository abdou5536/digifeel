// Script de seed : crée le superadmin + 3 restaurants fictifs complets.
// Usage : npm run seed   (nécessite NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env)
// Relançable sans risque : un restaurant déjà présent (même slug) est ignoré.
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { DEMO_PASSWORD, RESTAURANTS, SUPERADMIN, buildActivity, logoDataUri } from './seed-data.mjs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Variables NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquantes dans .env'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const must = (label, { data, error }) => { if (error) throw new Error(`${label} : ${error.message}`); return data; };

async function ensureUser(email, displayName) {
  const { data, error } = await db.auth.admin.createUser({ email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { display_name: displayName } });
  if (!error) return data.user.id;
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email === email);
  if (!existing) throw new Error(`Utilisateur ${email} : ${error.message}`);
  return existing.id;
}

async function seedRestaurant(def) {
  const { data: found } = await db.from('restaurants').select('id').eq('slug', def.slug).maybeSingle();
  if (found) { console.log(`= ${def.name} existe déjà, ignoré`); return; }
  const adminId = await ensureUser(def.admin.email, def.admin.name);
  const restaurantId = must('provision', await db.rpc('admin_provision_restaurant', {
    p_name: def.name, p_slug: def.slug, p_google_url: def.google, p_logo_url: logoDataUri(def), p_owner: adminId, p_tables: def.tables,
  }));
  must('abonnement', await db.from('subscriptions').update({ status: 'active', current_period_ends_at: new Date(Date.now() + 365 * 864e5).toISOString() }).eq('restaurant_id', restaurantId));

  const servers = must('serveurs', await db.from('servers').insert(def.servers.map((name) => ({ restaurant_id: restaurantId, name }))).select('id'));
  const serverUserId = await ensureUser(def.server.email, def.servers[0]);
  must('compte serveur', await db.from('app_users').update({ role: 'server', restaurant_id: restaurantId, server_id: servers[0].id, display_name: def.servers[0] }).eq('id', serverUserId));

  const products = must('produits', await db.from('pos_products').insert(def.products.map(([name, category, price]) => ({ restaurant_id: restaurantId, name, category, price_dzd: price }))).select('id,name,price_dzd'));
  const chips = must('puces', await db.from('chips').select('id').eq('restaurant_id', restaurantId));
  const tables = must('tables', await db.from('dining_tables').select('label').eq('restaurant_id', restaurantId));

  const activity = buildActivity(def, {
    restaurantId, now: Date.now(), chipIds: chips.map((c) => c.id), serverIds: servers.map((s) => s.id), tableLabels: tables.map((t) => t.label),
    products: products.map((p) => ({ id: p.id, name: p.name, price: p.price_dzd })), billIds: Array.from({ length: 12 }, randomUUID),
  });
  must('scans', await db.from('scans').insert(activity.scans));
  must('avis', await db.from('reviews').insert(activity.reviews));
  must('additions', await db.from('bills').insert(activity.bills));
  must('lignes', await db.from('bill_items').insert(activity.billItems));
  must('paiements', await db.from('payments').insert(activity.payments));
  console.log(`+ ${def.name} : /r/${def.slug}/t/1  (${def.admin.email})`);
}

const superId = await ensureUser(SUPERADMIN.email, SUPERADMIN.name);
must('superadmin', await db.from('app_users').update({ role: 'super_admin', restaurant_id: null, display_name: SUPERADMIN.name }).eq('id', superId));
console.log(`+ Superadmin : ${SUPERADMIN.email}`);
for (const def of RESTAURANTS) await seedRestaurant(def);
console.log(`\nTerminé. Mot de passe de tous les comptes de démo : ${DEMO_PASSWORD}`);