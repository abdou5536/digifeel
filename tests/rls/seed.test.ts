import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { RESTAURANTS, buildActivity, logoDataUri } from '../../scripts/seed-data.mjs';
import { createDb } from './harness';

async function insert(db: PGlite, table: string, rows: Record<string, unknown>[]) {
  for (const row of rows) {
    const cols = Object.keys(row);
    await db.query(`insert into public.${table} (${cols.join(',')}) values (${cols.map((_, i) => `$${i + 1}`).join(',')})`, cols.map((c) => row[c]));
  }
}

describe('seed de démo', () => {
  it('insère 3 restaurants cohérents avec les contraintes de la base', async () => {
    const db = await createDb();
    try {
      for (const def of RESTAURANTS) {
        const { rows } = await db.query<{ id: string }>(`select public.admin_provision_restaurant($1,$2,$3,$4,null,$5) as id`, [def.name, def.slug, def.google, logoDataUri(def), def.tables]);
        const restaurantId = rows[0].id;
        await insert(db, 'servers', def.servers.map((name: string) => ({ restaurant_id: restaurantId, name })));
        await insert(db, 'pos_products', def.products.map(([name, category, price]: [string, string, number]) => ({ restaurant_id: restaurantId, name, category, price_dzd: price })));
        const chips = (await db.query<{ id: string }>('select id from public.chips where restaurant_id=$1', [restaurantId])).rows;
        const servers = (await db.query<{ id: string }>('select id from public.servers where restaurant_id=$1', [restaurantId])).rows;
        const tables = (await db.query<{ label: string }>('select label from public.dining_tables where restaurant_id=$1', [restaurantId])).rows;
        const products = (await db.query<{ id: string; name: string; price_dzd: number }>('select id,name,price_dzd from public.pos_products where restaurant_id=$1', [restaurantId])).rows;
        const a = buildActivity(def, {
          restaurantId, now: Date.now(), chipIds: chips.map((c) => c.id), serverIds: servers.map((s) => s.id), tableLabels: tables.map((x) => x.label),
          products: products.map((p) => ({ id: p.id, name: p.name, price: p.price_dzd })), billIds: Array.from({ length: 12 }, randomUUID),
        });
        await insert(db, 'reviews', a.reviews); await insert(db, 'bills', a.bills);
        await insert(db, 'bill_items', a.billItems); await insert(db, 'payments', a.payments);
      }
      const count = async (sql: string) => Number((await db.query<{ n: number }>(sql)).rows[0].n);
      expect(await count('select count(*)::int n from public.restaurants')).toBe(3);
      expect(await count('select count(*)::int n from public.reviews')).toBe(72);
      expect(await count("select count(*)::int n from public.bills where status='paid'")).toBe(30);
    } finally { await db.close(); }
  });
});