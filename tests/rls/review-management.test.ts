import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { as, createDb, ids, seed } from './harness';

const REVIEW_A = '30000000-0000-0000-0000-0000000000a1';

async function call(db: Awaited<ReturnType<typeof createDb>>, actor: 'adminA' | 'serverA' | 'adminB' | 'kitchenA', sql: string) {
  return as(db, actor, async () => {
    try {
      return { ok: true, result: await db.query(sql) };
    } catch (error) {
      return { ok: false, error };
    }
  });
}

describe('gestion des avis via Supabase', () => {
  it('le gérant et le serveur assigné peuvent traiter leur avis, la cuisine et le restaurant B ne peuvent pas', async () => {
    const db = await createDb();
    await seed(db);
    try {
      await db.query(`update public.reviews set server_id='${ids.srvRowA}' where id='${REVIEW_A}'`);
      expect((await call(db, 'adminA', `select public.set_review_handled('${REVIEW_A}', true)`)).ok).toBe(true);
      const handled = await db.query<{ handled_at: string | null; handled_by: string | null }>(
        `select handled_at, handled_by from public.reviews where id='${REVIEW_A}'`
      );
      expect(handled.rows[0].handled_at).toBeTruthy();
      expect(handled.rows[0].handled_by).toBe(ids.adminA);
      expect((await call(db, 'serverA', `select public.set_review_handled('${REVIEW_A}', false)`)).ok).toBe(true);
      expect((await call(db, 'adminB', `select public.set_review_handled('${REVIEW_A}', true)`)).ok).toBe(false);
      expect((await call(db, 'kitchenA', `select public.set_review_handled('${REVIEW_A}', true)`)).ok).toBe(false);
      const reopened = await db.query<{ handled_at: string | null; handled_by: string | null }>(
        `select handled_at, handled_by from public.reviews where id='${REVIEW_A}'`
      );
      expect(reopened.rows[0]).toEqual({ handled_at: null, handled_by: null });
    } finally {
      await db.close();
    }
  });

  it('le retour arrière retire la fonction et les colonnes de traitement', async () => {
    const db = await createDb();
    try {
      await db.exec(readFileSync('supabase/rollback/202610100001_review_management.down.sql', 'utf8'));
      const columns = await db.query(
        `select column_name from information_schema.columns
         where table_schema='public' and table_name='reviews' and column_name in ('handled_at','handled_by')`
      );
      expect(columns.rows).toHaveLength(0);
    } finally {
      await db.close();
    }
  });
});
