import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, attempt, createDb, ids, seed } from './harness';

let db: PGlite;
const PRODUCT = '40000000-0000-0000-0000-0000000000a1';
let billId = '';

beforeAll(async () => {
  db = await createDb();
  await seed(db);
  const bill = await as(db, 'serverA', () => db.query<{ id: string }>(`select public.open_bill('T7') as id`));
  billId = bill.rows[0].id;
  await as(db, 'serverA', () => db.query(`select public.add_bill_item($1, $2, 2)`, [billId, PRODUCT]));
}, 60_000);
afterAll(async () => db.close());

describe('commandes envoyées au comptoir', () => {
  it('une ligne ajoutée n’est pas imprimée tant que le serveur ne l’envoie pas', async () => {
    const claimed = await as(db, 'adminA', () => db.query(`select * from public.claim_counter_tickets()`));
    expect(claimed.rows).toHaveLength(0);
  });

  it('le serveur envoie, la caisse reçoit une seule fois', async () => {
    const sent = await as(db, 'serverA', () => db.query<{ n: number }>(`select public.send_bill_to_counter($1) as n`, [billId]));
    expect(sent.rows[0].n).toBe(1);
    const first = await as(db, 'adminA', () => db.query<{ table_label: string; quantity: number }>(`select * from public.claim_counter_tickets()`));
    expect(first.rows).toHaveLength(1);
    expect(first.rows[0]).toMatchObject({ table_label: 'T7', quantity: 2 });
    const second = await as(db, 'adminA', () => db.query(`select * from public.claim_counter_tickets()`));
    expect(second.rows).toHaveLength(0);
  });

  it('un serveur ne peut pas vider la file d’impression de la caisse', async () => {
    expect(await as(db, 'serverA', () => attempt(db, `select * from public.claim_counter_tickets()`))).toBe(-1);
  });

  it('un autre restaurant ne voit ni n’envoie la commande', async () => {
    expect(await as(db, 'adminB', () => attempt(db, `select public.send_bill_to_counter('${billId}')`))).toBe(-1);
    const other = await as(db, 'adminB', () => db.query(`select * from public.claim_counter_tickets()`));
    expect(other.rows).toHaveLength(0);
  });
});
