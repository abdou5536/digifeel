import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, createDb, seed, type Actor } from './harness';

const A_PRODUCT = '40000000-0000-0000-0000-0000000000a1';
let db: PGlite;
beforeAll(async () => { db = await createDb(); await seed(db); }, 60_000);
afterAll(async () => db.close());

type Row = Record<string, unknown>;
async function run(actor: Actor, sql: string, params: unknown[] = []) {
  return as(db, actor, async () => {
    try { return { ok: true, rows: (await db.query<Row>(sql, params)).rows }; } catch { return { ok: false, rows: [] as Row[] }; }
  });
}
async function setup(label: string) {
  const code = (await run('adminA', `select public.create_dining_table($1) as c`, [label])).rows[0].c as string;
  const table = (await db.query<{ id: string }>(`select id from public.dining_tables where code=$1`, [code])).rows[0].id;
  const bill = (await run('serverA', `select public.open_table_bill($1) as id`, [table])).rows[0].id as string;
  await run('serverA', `select public.add_bill_item($1,$2,2)`, [bill, A_PRODUCT]);
  return { code, table, bill };
}

describe('tables et sessions client', () => {
  it('le code est aléatoire (16 car.) et seul l\'admin crée une table', async () => {
    const { code } = await setup('T1');
    expect(code).toMatch(/^[a-z2-7]{16}$/);
    expect((await run('serverA', `select public.create_dining_table('X')`)).ok).toBe(false);
    expect((await run('kitchenA', `select public.create_dining_table('X')`)).ok).toBe(false);
    expect((await run('anon', `select public.create_dining_table('X')`)).ok).toBe(false);
  });
  it('scan : le client reçoit un jeton lié à l\'addition et voit les lignes calculées par la base', async () => {
    const { code } = await setup('T2');
    const token = (await run('anon', `select public.open_guest_session($1) as t`, [code])).rows[0].t as string;
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    const bill = (await run('anon', `select public.guest_get_bill($1) as b`, [token])).rows[0].b as { total_dzd: number; items: unknown[] };
    expect(Number(bill.total_dzd)).toBe(2400);
    expect(bill.items).toHaveLength(1);
    const stored = (await db.query<{ token_hash: string }>(`select token_hash from public.guest_sessions`)).rows.map(r => r.token_hash);
    expect(stored).not.toContain(token);
  });
  it('code inconnu, jeton inventé, table sans addition : refusés', async () => {
    expect((await run('anon', `select public.open_guest_session('aaaaaaaaaaaaaaaa')`)).ok).toBe(false);
    expect((await run('anon', `select public.guest_get_bill('00')`)).ok).toBe(false);
    expect((await run('anon', `select public.guest_get_bill(null)`)).ok).toBe(false);
    const code = (await run('adminA', `select public.create_dining_table('T3') as c`)).rows[0].c as string;
    expect((await run('anon', `select public.open_guest_session($1)`, [code])).ok).toBe(false);
  });
  it('le client n\'accède pas aux tables directement', async () => {
    await setup('T4');
    expect((await run('anon', `select * from public.guest_sessions`)).ok).toBe(false);
    expect((await run('anon', `select * from public.dining_tables`)).ok).toBe(false);
    expect((await run('anon', `select * from public.bills`)).ok).toBe(false);
    expect((await run('adminA', `select * from public.guest_sessions`)).ok).toBe(false);
  });
  it('expire après paiement et ne revit pas après remboursement', async () => {
    const { code, bill } = await setup('T5');
    const token = (await run('anon', `select public.open_guest_session($1) as t`, [code])).rows[0].t as string;
    const pay = await run('serverA', `select public.record_payment($1,2400,0,'cash','k-guest-1') as id`, [bill]);
    expect(pay.ok).toBe(true);
    expect((await run('anon', `select public.guest_get_bill($1)`, [token])).ok).toBe(false);
    expect((await run('anon', `select public.open_guest_session($1)`, [code])).ok).toBe(false);
    expect((await run('adminA', `select public.refund_payment($1,'test')`, [pay.rows[0].id])).ok).toBe(true);
    expect((await run('anon', `select public.guest_get_bill($1)`, [token])).ok).toBe(false);
  });
  it('expire après le délai', async () => {
    const { code } = await setup('T6');
    const token = (await run('anon', `select public.open_guest_session($1) as t`, [code])).rows[0].t as string;
    await db.query(`update public.guest_sessions set expires_at = now() - interval '1 second'`);
    expect((await run('anon', `select public.guest_get_bill($1)`, [token])).ok).toBe(false);
  });
  it('isolation : A ne peut pas ouvrir l\'addition d\'une table de B ni la désactiver', async () => {
    const codeB = (await run('adminB', `select public.create_dining_table('TB') as c`)).rows[0].c as string;
    const tableB = (await db.query<{ id: string }>(`select id from public.dining_tables where code=$1`, [codeB])).rows[0].id;
    expect((await run('serverA', `select public.open_table_bill($1)`, [tableB])).ok).toBe(false);
    expect((await run('adminA', `select public.set_dining_table_active($1,false)`, [tableB])).ok).toBe(false);
    const seen = (await run('adminA', `select id from public.dining_tables where restaurant_id <> (select restaurant_id from public.app_users where id = auth.uid())`)).rows;
    expect(seen).toHaveLength(0);
    expect((await run('adminA', `delete from public.dining_tables where id=$1`, [tableB])).ok).toBe(false);
  });
  it('table désactivée : plus de nouvelle session', async () => {
    const { code, table } = await setup('T7');
    await run('adminA', `select public.set_dining_table_active($1,false)`, [table]);
    expect((await run('anon', `select public.open_guest_session($1)`, [code])).ok).toBe(false);
  });
  it('retour arrière', async () => {
    const db2 = await createDb('202610080001_dining_tables_guest_sessions.sql');
    await db2.exec(readFileSync('supabase/rollback/202610080001_dining_tables_guest_sessions.down.sql', 'utf8'));
    const r = await db2.query(`select to_regclass('public.guest_sessions') as t`);
    expect((r.rows[0] as { t: unknown }).t).toBeNull();
    await db2.close();
  });
});