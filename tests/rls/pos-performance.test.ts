import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, createDb, ids, seed } from './harness';

let db: PGlite;
const PRODUCT = '40000000-0000-4000-8000-0000000000a9';
const uuid = (n: number) => `71000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const SALES = 1000;

beforeAll(async () => {
  db = await createDb();
  await seed(db);
  await db.exec(`insert into public.pos_products (id, restaurant_id, name, price_dzd)
    values ('${PRODUCT}', '${ids.restA}', 'Burger', 1200)`);
}, 60_000);
afterAll(async () => db.close());

describe(`performance avec ${SALES} ventes`, () => {
  it('enregistre 1 000 ventes avec numérotation continue en temps raisonnable', async () => {
    const start = performance.now();
    await as(db, 'adminA', async () => {
      for (let i = 1; i <= SALES; i += 1) {
        await db.query(`select public.submit_pos_sale($1::uuid, $2::jsonb, $3, null, 'online', now())`, [
          uuid(i),
          JSON.stringify([{ productId: PRODUCT, quantity: 1 + (i % 3), priceDzd: 1200 }]),
          i % 2 ? 'cash' : 'card'
        ]);
      }
    });
    const elapsed = performance.now() - start;
    const numbers = await db.query<{ n: string; c: string }>(
      `select max(ticket_number) n, count(*) c from public.pos_sales where restaurant_id='${ids.restA}'`
    );
    expect(Number(numbers.rows[0].c)).toBe(SALES + 1);
    expect(Number(numbers.rows[0].n)).toBe(SALES + 1);
    console.info(`1000 ventes enregistrées en ${Math.round(elapsed)} ms (${Math.round(elapsed / SALES)} ms par vente)`);
    expect(elapsed / SALES).toBeLessThan(100);
  }, 180_000);

  it('la chaîne du journal reste intacte et se vérifie vite', async () => {
    const start = performance.now();
    const res = await as(db, 'adminA', () => db.query<{ v: string | null }>(`select public.verify_pos_journal() v`));
    const elapsed = performance.now() - start;
    expect(res.rows[0].v).toBeNull();
    console.info(`Vérification de la chaîne : ${Math.round(elapsed)} ms`);
    expect(elapsed).toBeLessThan(5000);
  }, 60_000);

  it('la clôture du jour sur 1 000 ventes est rapide et exacte', async () => {
    const start = performance.now();
    await as(db, 'adminA', () => db.query(`select public.close_pos_day()`));
    const elapsed = performance.now() - start;
    const z = await db.query<{ c: string }>(
      `select count(*) c from public.pos_journal where restaurant_id='${ids.restA}' and entry_type='z_close'`
    );
    expect(Number(z.rows[0].c)).toBe(1);
    console.info(`Clôture Z : ${Math.round(elapsed)} ms`);
    expect(elapsed).toBeLessThan(3000);
  }, 60_000);
});
