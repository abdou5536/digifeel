import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, createDb, ids, seed } from './harness';
const attempt = async (fn: () => Promise<unknown>) => { try { await fn(); return false; } catch { return true; } };

let db: PGlite;
const SALE = '50000000-0000-0000-0000-0000000000a1';

beforeAll(async () => {
  db = await createDb();
  await seed(db);
  await db.exec(`insert into public.chips (id, activation_code_hash, status) values
    ('12345678-1234-1234-1234-123456789abc', '${'c'.repeat(64)}', 'inactive')`);
}, 60_000);
afterAll(async () => db.close());

describe('comptes et annulations', () => {
  it('une inscription non invitee ne cree aucun profil', async () => {
    await db.query(`insert into auth.users (id) values ('99999999-9999-4999-8999-999999999999')`);
    const res = await db.query(`select 1 from public.app_users where id='99999999-9999-4999-8999-999999999999'`);
    expect(res.rows).toHaveLength(0);
  });

  it('le code d\'annulation est a usage unique', async () => {
    const res = await as(db, 'adminA', () => db.query<{ c: string }>(`select public.void_pos_sale('${SALE}'::uuid, 'test') c`));
    const code = res.rows[0].c;
    expect(code).toHaveLength(8);
    const bad = await as(db, 'adminA', () => db.query<{ r: boolean }>(`select public.review_voided_sale('${SALE}'::uuid, 'ZZZZZZZZ', 'confirmed', null) r`));
    expect(bad.rows[0].r).toBe(false);
    const ok = await as(db, 'adminA', () => db.query<{ r: boolean }>(`select public.review_voided_sale('${SALE}'::uuid, '${code}', 'contested', 'x') r`));
    expect(ok.rows[0].r).toBe(true);
    const again = await attempt(() => as(db, 'adminA', () => db.query(`select public.review_voided_sale('${SALE}'::uuid, '${code}', 'confirmed', null)`)));
    expect(again).toBeTruthy();
  });

  it('scan_chip_table reclame une puce libre puis la renomme', async () => {
    const chip = '12345678-1234-1234-1234-123456789abc';
    const first = await as(db, 'adminA', () => db.query<{ created: boolean }>(`select * from public.scan_chip_table('${chip}'::text, 'Terrasse')`));
    expect(first.rows[0].created).toBe(true);
    const second = await as(db, 'adminA', () => db.query<{ created: boolean; label: string }>(`select * from public.scan_chip_table('${chip}', 'Salon')`));
    expect(second.rows[0]).toMatchObject({ created: false, label: 'Salon' });
  });

  it('un autre restaurant ne peut pas prendre la puce', async () => {
    const res = await attempt(() => as(db, 'adminB', () => db.query(`select * from public.scan_chip_table('12345678-1234-1234-1234-123456789abc', 'Vol')`)));
    expect(res).toBeTruthy();
  });
});


