import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb } from '../rls/harness';

// Charge fictive : 40 restaurants, 100 000 avis. Lancé par `npm run test:load` (hors `npm test`).
let db: PGlite;
beforeAll(async () => {
  db = await createDb();
  await db.exec(`
    insert into public.restaurants (id, name, google_review_url)
      select ('00000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'Resto ' || g, 'https://g.page/r/' || g from generate_series(1,40) g;
    insert into public.chips (id, restaurant_id, activation_code_hash, status)
      select 'chip' || g, ('00000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, lpad(g::text, 64, 'a'), 'active' from generate_series(1,40) g;
    insert into public.reviews (restaurant_id, chip_id, stars, comment, device_hash, created_at)
      select ('00000000-0000-0000-0000-' || lpad(((g % 40) + 1)::text, 12, '0'))::uuid, 'chip' || ((g % 40) + 1),
             1 + (g % 5), 'avis fictif ' || g, md5(g::text), now() - (g || ' seconds')::interval from generate_series(1,100000) g;
    analyze public.reviews;
  `);
}, 180_000);
afterAll(async () => db.close());

describe('100 000 avis / 40 restaurants', () => {
  it('liste paginée (restaurant, date) rapide et via index', async () => {
    const rest = '00000000-0000-0000-0000-000000000007';
    const q = `select id, stars, created_at from public.reviews where restaurant_id='${rest}' order by created_at desc limit 50`;
    const t0 = performance.now();
    const rows = (await db.query(q)).rows;
    const ms = performance.now() - t0;
    const plan = (await db.query<{ 'QUERY PLAN': string }>(`explain ${q}`)).rows.map((r) => r['QUERY PLAN']).join('\n');
    console.log(`page de 50 avis : ${ms.toFixed(1)} ms\n${plan}`);
    expect(rows).toHaveLength(50);
    expect(plan).toMatch(/Index/);
    expect(plan).not.toMatch(/Seq Scan on reviews/);
    expect(ms).toBeLessThan(200);
  });
  it('agrégat de moyenne par restaurant < 500 ms', async () => {
    const t0 = performance.now();
    const r = await db.query(`select restaurant_id, avg(stars), count(*) from public.reviews group by 1`);
    const ms = performance.now() - t0;
    console.log(`agrégat 100k : ${ms.toFixed(1)} ms`);
    expect(r.rows).toHaveLength(40);
    expect(ms).toBeLessThan(500);
  });
});