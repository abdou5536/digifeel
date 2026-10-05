import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { as, createDb, ids, seed, type Actor } from './harness';

const PRODUCT_A = '40000000-0000-0000-0000-0000000000a1';
const PRODUCT_B = '40000000-0000-0000-0000-0000000000b1';
type Row = Record<string, unknown>;

async function query(db: Awaited<ReturnType<typeof createDb>>, actor: Actor, sql: string, params: unknown[] = []) {
  return as(db, actor, async () => {
    try {
      return { ok: true, rows: (await db.query<Row>(sql, params)).rows };
    } catch (error) {
      return { ok: false, error };
    }
  });
}

async function createGuestSession(db: Awaited<ReturnType<typeof createDb>>) {
  const code = (await query(db, 'adminA', `select public.create_dining_table('T-ORDER') as code`)).rows[0].code as string;
  const bill = (await query(db, 'serverA', `
    select public.open_table_bill(id) as id from public.dining_tables where code = $1
  `, [code])).rows[0].id as string;
  const token = (await query(db, 'anon', `select public.open_guest_session($1) as token`, [code])).rows[0].token as string;
  return { bill, token };
}

const submit = (db: Awaited<ReturnType<typeof createDb>>, token: string, items: unknown, note = '', key = 'guest-order-001') =>
  query(db, 'anon', `select public.submit_guest_table_order($1, $2::jsonb, $3, $4) as id`, [
    token, JSON.stringify(items), note, key
  ]);

describe('commandes invitées depuis le QR de table', () => {
  it('expose le menu actif, crée une commande de prix serveur et affiche son statut', async () => {
    const db = await createDb();
    await seed(db);
    try {
      const { bill, token } = await createGuestSession(db);
      const menu = await query(db, 'anon', `select public.guest_get_menu($1) as menu`, [token]);
      const menuData = menu.rows[0].menu as { products: { id: string; price_dzd: number }[]; orders: unknown[] };
      expect(menuData.products).toContainEqual(expect.objectContaining({ id: PRODUCT_A, price_dzd: 1200 }));
      expect(menuData.products.map(product => product.id)).not.toContain(PRODUCT_B);
      expect(menuData.orders).toHaveLength(0);

      const items = [{ productId: PRODUCT_A, quantity: 2 }];
      const created = await submit(db, token, items, 'Sans oignons');
      expect(created.ok).toBe(true);
      const orderId = created.rows[0].id as string;
      expect((await submit(db, token, items, 'Sans oignons')).rows[0].id).toBe(orderId);

      const billItems = await db.query<{ quantity: number; unit_price_dzd: number }>(
        `select quantity, unit_price_dzd from public.bill_items where bill_id = $1`,
        [bill]
      );
      expect(billItems.rows).toEqual([{ quantity: 2, unit_price_dzd: 1200 }]);

      const kitchenOrders = await query(db, 'kitchenA', `
        select id, status from public.table_orders where id = $1
      `, [orderId]);
      expect(kitchenOrders.rows).toEqual([{ id: orderId, status: 'new' }]);

      const updated = await query(db, 'kitchenA', `update public.table_orders set status='preparing' where id=$1`, [orderId]);
      expect(updated.ok).toBe(true);
      const refreshed = await query(db, 'anon', `select public.guest_get_menu($1) as menu`, [token]);
      const refreshedOrders = (refreshed.rows[0].menu as { orders: { id: string; status: string }[] }).orders;
      expect(refreshedOrders).toContainEqual(expect.objectContaining({ id: orderId, status: 'preparing' }));
      const status = await query(db, 'anon', `select public.guest_get_table_orders($1) as orders`, [token]);
      expect(status.rows[0].orders).toContainEqual(expect.objectContaining({ id: orderId, status: 'preparing' }));
    } finally {
      await db.close();
    }
  });

  it('n’accepte ni produit d’un autre restaurant, ni lignes dupliquées, ni quantité invalide', async () => {
    const db = await createDb();
    await seed(db);
    try {
      const { token } = await createGuestSession(db);
      expect((await submit(db, token, [{ productId: PRODUCT_B, quantity: 1 }])).ok).toBe(false);
      expect((await submit(db, token, [
        { productId: PRODUCT_A, quantity: 1 },
        { productId: PRODUCT_A, quantity: 2 }
      ], '', 'guest-order-002')).ok).toBe(false);
      expect((await submit(db, token, [{ productId: PRODUCT_A, quantity: 21 }], '', 'guest-order-003')).ok).toBe(false);
      expect((await submit(db, '0'.repeat(64), [{ productId: PRODUCT_A, quantity: 1 }], '', 'guest-order-004')).ok).toBe(false);
      const count = await db.query(`select id from public.table_orders where guest_session_id is not null`);
      expect(count.rows).toHaveLength(0);
    } finally {
      await db.close();
    }
  });

  it('refuse l’accès direct anonyme, partage les commandes de table et isole les tables', async () => {
    const db = await createDb();
    await seed(db);
    try {
      const { token } = await createGuestSession(db);
      expect((await query(db, 'anon', `select * from public.table_orders`)).ok).toBe(false);
      expect((await query(db, 'anon', `insert into public.table_orders (restaurant_id, table_label) values ($1, 'T9')`, [ids.restA])).ok).toBe(false);
      await submit(db, token, [{ productId: PRODUCT_A, quantity: 1 }]);

      const sameTableToken = (await db.query<{ token: string }>(
        `select public.open_guest_session(code) as token from public.dining_tables
         where restaurant_id = $1 and label = 'T-ORDER'`, [ids.restA]
      )).rows[0].token;
      const sameTable = await query(db, 'anon', `select public.guest_get_menu($1) as menu`, [sameTableToken]);
      expect((sameTable.rows[0].menu as { orders: unknown[] }).orders).toHaveLength(1);

      const otherCode = (await query(db, 'adminA', `select public.create_dining_table('T-OTHER') as code`)).rows[0].code;
      await query(db, 'serverA', `
        select public.open_table_bill(id) from public.dining_tables where code = $1
      `, [otherCode]);
      const otherToken = (await query(db, 'anon', `select public.open_guest_session($1) as token`, [otherCode])).rows[0].token as string;
      const menu = await query(db, 'anon', `select public.guest_get_menu($1) as menu`, [otherToken]);
      expect((menu.rows[0].menu as { orders: unknown[] }).orders).toHaveLength(0);
    } finally {
      await db.close();
    }
  });

  it('refuse la réutilisation d’une clé d’idempotence avec une commande différente', async () => {
    const db = await createDb();
    await seed(db);
    try {
      const { token } = await createGuestSession(db);
      expect((await submit(db, token, [{ productId: PRODUCT_A, quantity: 1 }])).ok).toBe(true);
      expect((await submit(db, token, [{ productId: PRODUCT_A, quantity: 2 }])).ok).toBe(false);
      const rows = await db.query(`select id from public.table_orders where guest_session_id is not null`);
      expect(rows.rows).toHaveLength(1);
    } finally {
      await db.close();
    }
  });

  it('le retour arrière retire les RPC et les métadonnées de commandes invitées', async () => {
    const db = await createDb();
    try {
      await db.exec(readFileSync('supabase/rollback/202610120001_guest_table_orders.down.sql', 'utf8'));
      const functionResult = await db.query<{ fn: string | null }>(
        `select to_regprocedure('public.submit_guest_table_order(text,jsonb,text,text)') as fn`
      );
      expect(functionResult.rows[0].fn).toBeNull();
      const columnResult = await db.query<{ column_name: string }>(
        `select column_name from information_schema.columns
         where table_schema='public' and table_name='table_orders'
           and column_name in ('bill_id','guest_session_id','idempotency_key','request_hash')`
      );
      expect(columnResult.rows).toHaveLength(0);
    } finally {
      await db.close();
    }
  });
});
