import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { as, createDb, ids, seed } from './harness';

describe('désactivation des serveurs', () => {
  it('coupe les droits applicatifs d’un serveur désactivé et le rollback rétablit la fonction précédente', async () => {
    const db = await createDb();
    await seed(db);
    try {
      await db.query(`update public.servers set active=false where id='${ids.srvRowA}'`);
      const disabledRole = await as(db, 'serverA', async () => (
        await db.query<{ role: string | null }>('select public.current_app_role() as role')
      ));
      expect(disabledRole.rows[0].role).toBeNull();

      const disabledAccess = await as(db, 'serverA', async () => {
        const tables = await db.query(`select 1 from public.dining_tables`);
        const reviews = await db.query(`select 1 from public.reviews`);
        return { tables: tables.rows.length, reviews: reviews.rows.length };
      });
      expect(disabledAccess).toEqual({ tables: 0, reviews: 0 });

      await db.exec(readFileSync('supabase/rollback/202610110001_server_deactivation.down.sql', 'utf8'));
      const restoredRole = await as(db, 'serverA', async () => (
        await db.query<{ role: string | null }>('select public.current_app_role() as role')
      ));
      expect(restoredRole.rows[0].role).toBe('server');
    } finally {
      await db.close();
    }
  });
});
