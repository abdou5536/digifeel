import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, attempt, createDb, ids, seed } from './harness';

let db: PGlite;
const PRODUCT = '40000000-0000-0000-0000-0000000000a1';
const POS_PRODUCT = '40000000-0000-4000-8000-0000000000a9';
const uuid = (n: number) => `71000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const setSub = (sql: string) => db.exec(`update public.subscriptions set ${sql} where restaurant_id='${ids.restA}'`);
const sale = (id: string, source: 'online' | 'offline', soldAt = 'now()') =>
  as(db, 'adminA', () =>
    attempt(db, `select public.submit_pos_sale('${id}'::uuid,
      '[{"productId":"${POS_PRODUCT}","quantity":1,"priceDzd":1200}]'::jsonb, 'cash', null, '${source}', ${soldAt})`)
  );
const bill = async () => {
  const b = await as(db, 'serverA', () => db.query<{ id: string }>(`select public.open_bill('L') as id`));
  await as(db, 'serverA', () => db.query(`select public.add_bill_item($1, $2, 1)`, [b.rows[0].id, PRODUCT]));
  return b.rows[0].id;
};

beforeAll(async () => {
  db = await createDb();
  await seed(db);
  await db.exec(`insert into public.pos_products (id, restaurant_id, name, price_dzd)
    values ('${POS_PRODUCT}', '${ids.restA}', 'Burger', 1200)`);
}, 60_000);
afterAll(async () => db.close());

describe('licences', () => {
  it('abonnement actif ou mois offert en cours : on encaisse', async () => {
    expect(await sale(uuid(1), 'online')).not.toBe(-1);
    await setSub(`status='trialing', trial_ends_at=now()+interval '5 days'`);
    expect(await sale(uuid(2), 'online')).not.toBe(-1);
  });

  it('mois offert expire : vente et paiement refuses', async () => {
    await setSub(`status='trialing', trial_ends_at=now()-interval '1 day'`);
    const b = await bill();
    expect(await sale(uuid(3), 'online')).toBe(-1);
    expect(await as(db, 'serverA', () => attempt(db, `select public.record_payment('${b}',1200,0,'cash','license-key-0001')`))).toBe(-1);
  });

  it('une vente hors ligne faite avant l\'expiration reste synchronisable', async () => {
    await setSub(`status='trialing', trial_ends_at=now()-interval '1 day'`);
    expect(await sale(uuid(4), 'offline', `now() - interval '3 days'`)).not.toBe(-1);
    expect(await sale(uuid(5), 'offline', `now()`)).toBe(-1);
  });

  it('le patron renouvelle : l\'encaissement reprend ; un autre restaurant n\'est pas touche', async () => {
    await setSub(`status='active'`);
    expect(await sale(uuid(6), 'online')).not.toBe(-1);
  });
});
