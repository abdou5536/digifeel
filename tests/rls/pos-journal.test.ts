import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, attempt, createDb, ids, seed } from './harness';

let db: PGlite;
const PRODUCT_A = '40000000-0000-4000-8000-0000000000a9';
const sale = (id: string, method = 'cash') =>
  as(db, 'adminA', () =>
    db.query(`select public.submit_pos_sale($1::uuid, $2::jsonb, $3, null, 'online', now())`, [
      id,
      JSON.stringify([{ productId: PRODUCT_A, quantity: 2, priceDzd: 1200 }]),
      method
    ])
  );
const uuid = (n: number) => `70000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

beforeAll(async () => {
  db = await createDb();
  await seed(db);
  await db.exec(`insert into public.pos_products (id, restaurant_id, name, price_dzd)
    values ('${PRODUCT_A}', '${ids.restA}', 'Burger', 1200)`);
}, 60_000);
afterAll(async () => db.close());

describe('journal de caisse', () => {
  it('reprend l\'existant : la vente seedee est numerotee 1 et journalisee', async () => {
    const res = await db.query<{ ticket_number: string }>(
      `select ticket_number from public.pos_sales where restaurant_id='${ids.restA}'`
    );
    expect(res.rows.map(r => Number(r.ticket_number))).toEqual([1]);
    const journal = await db.query(`select 1 from public.pos_journal where restaurant_id='${ids.restA}'`);
    expect(journal.rows).toHaveLength(1);
  });

  it('numerote les tickets sans trou et independamment par restaurant', async () => {
    await sale(uuid(1));
    await sale(uuid(2), 'card');
    const a = await db.query<{ ticket_number: string }>(
      `select ticket_number from public.pos_sales where restaurant_id='${ids.restA}' order by ticket_number`
    );
    expect(a.rows.map(r => Number(r.ticket_number))).toEqual([1, 2, 3]);
    const b = await db.query<{ ticket_number: string }>(
      `select ticket_number from public.pos_sales where restaurant_id='${ids.restB}'`
    );
    expect(b.rows.map(r => Number(r.ticket_number))).toEqual([1]);
  });

  it('un renvoi du meme ticket (hors-ligne) ne consomme pas de numero', async () => {
    await sale(uuid(1));
    const res = await db.query(`select max(ticket_number) m from public.pos_sales where restaurant_id='${ids.restA}'`);
    expect(Number((res.rows[0] as { m: string }).m)).toBe(3);
  });

  it('la chaine de hash est intacte', async () => {
    const res = await as(db, 'adminA', () => db.query<{ v: string | null }>(`select public.verify_pos_journal() v`));
    expect(res.rows[0].v).toBeNull();
  });

  it('refuse toute modification ou suppression, meme avec les droits maximum', async () => {
    for (const sql of [
      `update public.pos_sales set total_dzd=1 where id='${uuid(1)}'`,
      `delete from public.pos_sales where id='${uuid(1)}'`,
      `update public.pos_sale_items set quantity=9 where sale_id='${uuid(1)}'`,
      `delete from public.pos_sale_items where sale_id='${uuid(1)}'`,
      `update public.pos_journal set amount_dzd=1 where restaurant_id='${ids.restA}'`,
      `delete from public.pos_journal where restaurant_id='${ids.restA}'`
    ]) {
      expect(await attempt(db, sql), sql).toBe(-1);
    }
  });

  it('une falsification contournee en base est detectee par la verification', async () => {
    await db.exec(`alter table public.pos_journal disable trigger pos_journal_immutable`);
    await db.exec(`update public.pos_journal set amount_dzd=1 where restaurant_id='${ids.restA}' and seq=2`);
    await db.exec(`alter table public.pos_journal enable trigger pos_journal_immutable`);
    const res = await as(db, 'adminA', () => db.query<{ v: string }>(`select public.verify_pos_journal() v`));
    expect(Number(res.rows[0].v)).toBe(2);
    await db.exec(`alter table public.pos_journal disable trigger pos_journal_immutable`);
    await db.exec(`update public.pos_journal set amount_dzd=2400 where restaurant_id='${ids.restA}' and seq=2`);
    await db.exec(`alter table public.pos_journal enable trigger pos_journal_immutable`);
  });

  it('annuler cree une ecriture inverse et conserve la vente', async () => {
    await as(db, 'adminA', () => db.query(`select public.void_pos_sale($1::uuid, 'erreur')`, [uuid(2)]));
    const rows = await db.query<{ entry_type: string; amount_dzd: string }>(
      `select entry_type, amount_dzd from public.pos_journal where sale_id='${uuid(2)}' order by seq`
    );
    expect(rows.rows.map(r => [r.entry_type, Number(r.amount_dzd)])).toEqual([['sale', 2400], ['reversal', -2400]]);
    const kept = await db.query(`select voided_at from public.pos_sales where id='${uuid(2)}'`);
    expect(kept.rows).toHaveLength(1);
    expect(await as(db, 'serverA', () => attempt(db, `select public.void_pos_sale('${uuid(1)}')`))).toBe(-1);
    expect(await as(db, 'adminA', () => attempt(db, `select public.void_pos_sale('${uuid(2)}')`))).toBe(-1);
  });
});

describe('cloture Z', () => {
  it('seul le patron peut cloturer', async () => {
    expect(await as(db, 'serverA', () => attempt(db, `select public.close_pos_day()`))).toBe(-1);
    expect(await as(db, 'kitchenA', () => attempt(db, `select public.close_pos_day()`))).toBe(-1);
  });

  it('totalise net par moyen de paiement et ne compte rien deux fois', async () => {
    await as(db, 'adminA', () => db.query(`select public.close_pos_day()`));
    const z = await db.query<{ number: number; sales_count: number; reversals_count: number; net_total_dzd: string; totals_by_method: Record<string, number> }>(
      `select number, sales_count, reversals_count, net_total_dzd, totals_by_method from public.pos_z_reports where restaurant_id='${ids.restA}'`
    );
    expect(z.rows).toHaveLength(1);
    expect(z.rows[0].number).toBe(1);
    expect(z.rows[0].sales_count).toBe(3);
    expect(z.rows[0].reversals_count).toBe(1);
    expect(Number(z.rows[0].net_total_dzd)).toBe(1200 + 2400);
    expect(z.rows[0].totals_by_method).toEqual({ cash: 3600, card: 0 });
    expect(await as(db, 'adminA', () => attempt(db, `select public.close_pos_day()`))).toBe(-1);
  });

  it('une vente d\'un jour clos ne peut plus etre annulee', async () => {
    expect(await as(db, 'adminA', () => attempt(db, `select public.void_pos_sale('${uuid(1)}')`))).toBe(-1);
  });

  it('le Z suivant ne reprend que les nouvelles ventes', async () => {
    await sale(uuid(3));
    await as(db, 'adminA', () => db.query(`select public.close_pos_day()`));
    const z = await db.query<{ number: number; net_total_dzd: string }>(
      `select number, net_total_dzd from public.pos_z_reports where restaurant_id='${ids.restA}' order by number`
    );
    expect(z.rows.map(r => [r.number, Number(r.net_total_dzd)])).toEqual([[1, 3600], [2, 2400]]);
    const v = await as(db, 'adminA', () => db.query<{ v: string | null }>(`select public.verify_pos_journal() v`));
    expect(v.rows[0].v).toBeNull();
  });
});

describe('isolation', () => {
  it('le restaurant B ne voit ni journal ni Z de A, et inversement', async () => {
    expect(await as(db, 'adminB', () => attempt(db, `select 1 from public.pos_journal where restaurant_id='${ids.restA}'`))).toBe(0);
    expect(await as(db, 'adminB', () => attempt(db, `select 1 from public.pos_z_reports where restaurant_id='${ids.restA}'`))).toBe(0);
    expect(await as(db, 'anon', () => attempt(db, `select 1 from public.pos_journal`))).toBeLessThanOrEqual(0);
    expect(await as(db, 'adminB', () => attempt(db, `select 1 from public.pos_journal where restaurant_id='${ids.restB}'`))).toBe(1);
  });

  it('supprimer un restaurant (droit a l\'effacement) reste possible', async () => {
    await db.exec(`delete from public.restaurants where id='${ids.restB}'`);
    const res = await db.query(`select 1 from public.pos_journal where restaurant_id='${ids.restB}'`);
    expect(res.rows).toHaveLength(0);
  });
});
