import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, attempt, createDb, ids, seed } from './harness';

let db: PGlite;
const PRODUCT = '40000000-0000-0000-0000-0000000000a1';

const newBill = async () => {
  const b = await as(db, 'serverA', () => db.query<{ id: string }>(`select public.open_bill('T') as id`));
  const id = b.rows[0].id;
  await as(db, 'serverA', () => db.query(`select public.add_bill_item($1, $2, 2)`, [id, PRODUCT]));
  return id;
};
const pay = async (bill: string, amount: number, method: string, key: string) =>
  (await as(db, 'serverA', () =>
    db.query<{ id: string }>(`select public.record_payment($1,$2,0,$3,$4) as id`, [bill, amount, method, key])
  )).rows[0].id;

beforeAll(async () => {
  db = await createDb();
  await seed(db);
}, 60_000);
afterAll(async () => db.close());

describe('paiements d\'addition et journal fiscal', () => {
  it('un paiement encaisse recoit un ticket continu et une ecriture de journal', async () => {
    const before = await db.query<{ m: string }>(`select max(ticket_number) m from public.pos_journal where restaurant_id='${ids.restA}'`);
    const p = await pay(await newBill(), 2400, 'cash', 'journal-key-0001');
    const row = await db.query<{ ticket_number: string }>(`select ticket_number from public.payments where id=$1`, [p]);
    expect(Number(row.rows[0].ticket_number)).toBe(Number(before.rows[0].m) + 1);
    const j = await db.query<{ entry_type: string; amount_dzd: string }>(
      `select entry_type, amount_dzd from public.pos_journal where sale_id=$1`, [p]);
    expect(j.rows.map(r => [r.entry_type, Number(r.amount_dzd)])).toEqual([['sale', 2400]]);
  });

  it('un paiement carte en attente n\'entre au journal qu\'une fois encaisse', async () => {
    const p = await pay(await newBill(), 2400, 'card', 'journal-key-0002');
    const st = await db.query<{ status: string }>(`select status from public.payments where id=$1`, [p]);
    if (st.rows[0].status !== 'succeeded') {
      expect((await db.query(`select 1 from public.pos_journal where sale_id=$1`, [p])).rows).toHaveLength(0);
    }
  });

  it('un remboursement ajoute une ecriture inverse et la chaine reste intacte', async () => {
    const p = await pay(await newBill(), 2400, 'cash', 'journal-key-0003');
    await as(db, 'adminA', () => db.query(`select public.refund_payment($1,'erreur')`, [p]));
    const j = await db.query<{ entry_type: string; amount_dzd: string }>(
      `select entry_type, amount_dzd from public.pos_journal where sale_id=$1 order by seq`, [p]);
    expect(j.rows.map(r => [r.entry_type, Number(r.amount_dzd)])).toEqual([['sale', 2400], ['reversal', -2400]]);
    const v = await as(db, 'adminA', () => db.query<{ v: string | null }>(`select public.verify_pos_journal() v`));
    expect(v.rows[0].v).toBeNull();
  });

  it('le Z compte ces paiements, puis interdit le remboursement du jour clos', async () => {
    const p = await pay(await newBill(), 2400, 'cash', 'journal-key-0004');
    await as(db, 'adminA', () => db.query(`select public.close_pos_day()`));
    const z = await db.query<{ net_total_dzd: string }>(
      `select net_total_dzd from public.pos_z_reports where restaurant_id='${ids.restA}' order by number desc limit 1`);
    expect(Number(z.rows[0].net_total_dzd)).toBeGreaterThanOrEqual(2400);
    expect(await as(db, 'adminA', () => attempt(db, `select public.refund_payment('${p}','tard')`))).toBe(-1);
  });
});
