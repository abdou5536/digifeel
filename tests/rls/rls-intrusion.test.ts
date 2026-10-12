import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, attempt, createDb, ids, seed, type Actor } from './harness';

let db: PGlite;
beforeAll(async () => {
  db = await createDb();
  await seed(db);
}, 60_000);
afterAll(async () => db.close());

const count = (actor: Actor, sql: string) => as(db, actor, () => attempt(db, sql));
const B_ROW = {
  reviews: `from public.reviews where restaurant_id='${ids.restB}'`,
  sales: `from public.pos_sales where restaurant_id='${ids.restB}'`,
  products: `from public.pos_products where restaurant_id='${ids.restB}'`,
  chips: `from public.chips where restaurant_id='${ids.restB}'`,
  orders: `from public.table_orders where restaurant_id='${ids.restB}'`,
  items: `from public.table_order_items where restaurant_id='${ids.restB}'`,
  servers: `from public.servers where restaurant_id='${ids.restB}'`
};

describe('intrusion : un utilisateur du restaurant A face aux données du restaurant B', () => {
  const attackers: Actor[] = ['adminA', 'serverA', 'kitchenA', 'reseller', 'anon'];

  for (const actor of attackers) {
    for (const [name, from] of Object.entries(B_ROW)) {
      it(`${actor} ne peut pas LIRE ${name} de B`, async () => {
        expect(await count(actor, `select 1 ${from}`)).toBeLessThanOrEqual(0);
      });
      it(`${actor} ne peut pas SUPPRIMER ${name} de B`, async () => {
        expect(await count(actor, `delete ${from}`)).toBeLessThanOrEqual(0);
      });
    }
    it(`${actor} ne peut pas MODIFIER avis / ventes / tags / commandes de B`, async () => {
      for (const sql of [
        `update public.reviews set stars=5 where restaurant_id='${ids.restB}'`,
        `update public.pos_sales set total_dzd=1 where restaurant_id='${ids.restB}'`,
        `update public.chips set status='disabled' where restaurant_id='${ids.restB}'`,
        `update public.table_orders set status='preparing' where restaurant_id='${ids.restB}'`,
        `update public.restaurants set name='pwned' where id='${ids.restB}'`
      ]) {
        expect(await count(actor, sql), sql).toBeLessThanOrEqual(0);
      }
    });
    it(`${actor} ne peut pas INSÉRER dans B`, async () => {
      for (const sql of [
        `insert into public.table_orders (restaurant_id, table_label) values ('${ids.restB}', 'X')`,
        `insert into public.reviews (restaurant_id, chip_id, stars, device_hash) values ('${ids.restB}', 'chipB', 5, 'x')`,
        `insert into public.pos_sales (id, restaurant_id, cashier_user_id, total_dzd, payment_method)
           values (gen_random_uuid(), '${ids.restB}', '${ids.adminB}', 1, 'cash')`
      ]) {
        expect(await count(actor, sql), sql).toBe(-1);
      }
    });
  }

  it('adminA ne peut pas se promouvoir ni changer de restaurant', async () => {
    expect(
      await count('adminA', `update public.app_users set role='super_admin' where id='${ids.adminA}'`)
    ).toBeLessThanOrEqual(0);
    expect(
      await count('adminA', `update public.app_users set restaurant_id='${ids.restB}' where id='${ids.adminA}'`)
    ).toBeLessThanOrEqual(0);
  });

  it('contrôle positif : adminA lit bien ses propres avis, ventes et commandes', async () => {
    expect(await count('adminA', `select 1 from public.reviews where restaurant_id='${ids.restA}'`)).toBe(1);
    expect(await count('adminA', `select 1 from public.pos_sales where restaurant_id='${ids.restA}'`)).toBe(1);
    expect(await count('adminA', `select 1 from public.table_orders where restaurant_id='${ids.restA}'`)).toBe(1);
  });
});

describe('rôle kitchen : commandes de son restaurant + changement de statut, rien d\'autre', () => {
  it('lit les commandes et lignes de SON restaurant', async () => {
    expect(await count('kitchenA', `select 1 from public.table_orders`)).toBe(1);
    expect(await count('kitchenA', `select 1 from public.table_order_items`)).toBe(1);
  });

  it.each([
    'reviews',
    'pos_sales',
    'pos_sale_items',
    'pos_products',
    'chips',
    'servers',
    'restaurants',
    'tips',
    'scans',
    'subscriptions',
    'chip_batches'
  ])('ne lit pas %s, même de son restaurant', async (table) => {
    expect(await count('kitchenA', `select 1 from public.${table}`)).toBeLessThanOrEqual(0);
  });

  it('ne voit que son propre compte (pas l\'équipe)', async () => {
    expect(await count('kitchenA', `select 1 from public.app_users`)).toBe(1);
  });

  it('ne peut ni créer, ni supprimer de commande', async () => {
    expect(
      await count('kitchenA', `insert into public.table_orders (restaurant_id, table_label) values ('${ids.restA}', 'T2')`)
    ).toBe(-1);
    expect(await count('kitchenA', `delete from public.table_orders`)).toBeLessThanOrEqual(0);
    expect(await count('kitchenA', `delete from public.table_order_items`)).toBeLessThanOrEqual(0);
  });

  it('ne peut pas modifier autre chose que le statut', async () => {
    expect(await count('kitchenA', `update public.table_orders set table_label='T99'`)).toBe(-1);
    expect(await count('kitchenA', `update public.table_orders set restaurant_id='${ids.restB}'`)).toBe(-1);
    expect(await count('kitchenA', `update public.table_order_items set quantity=50`)).toBeLessThanOrEqual(0);
  });

  it('ne peut pas annuler ni inventer un statut', async () => {
    expect(await count('kitchenA', `update public.table_orders set status='cancelled'`)).toBe(-1);
    expect(await count('kitchenA', `update public.table_orders set status='nimportequoi'`)).toBe(-1);
  });

  it('applique les transitions new → preparing → ready → served, et refuse les sauts', async () => {
    expect(await count('kitchenA', `update public.table_orders set status='served'`)).toBe(-1);
    expect(await count('kitchenA', `update public.table_orders set status='preparing'`)).toBe(1);
    expect(await count('kitchenA', `update public.table_orders set status='ready'`)).toBe(1);
    expect(await count('kitchenA', `update public.table_orders set status='preparing'`)).toBe(-1);
    expect(await count('kitchenA', `update public.table_orders set status='served'`)).toBe(1);
  });

  it('le statut du restaurant B n\'a pas bougé', async () => {
    const res = await db.query<{ status: string }>(
      `select status from public.table_orders where restaurant_id='${ids.restB}'`
    );
    expect(res.rows[0].status).toBe('new');
  });

  it('un serveur peut créer une commande dans son restaurant uniquement', async () => {
    expect(
      await count('serverA', `insert into public.table_orders (restaurant_id, table_label) values ('${ids.restA}', 'T3')`)
    ).toBe(1);
  });
});

describe('migration kitchen : retour arrière', () => {
  it('le script down supprime les tables et convertit les comptes kitchen', async () => {
    const down = readFileSync(
      join(process.cwd(), 'supabase', 'rollback', '202610050001_kitchen_role.down.sql'),
      'utf8'
    );
    await db.exec(down);
    const tables = await db.query(`select 1 from pg_tables where tablename like 'table_order%'`);
    expect(tables.rows).toHaveLength(0);
    const roles = await db.query<{ role: string }>(
      `select role from public.app_users where id='${ids.kitchenA}'`
    );
    expect(roles.rows[0].role).toBe('server');
    expect(
      await attempt(db, `update public.app_users set role='kitchen' where id='${ids.adminA}'`)
    ).toBe(-1);
  });
});
