import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, createDb, ids, seed, type Actor } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createDb(); await seed(db); }, 60_000);
afterAll(async () => db.close());

const call = (actor: Actor, sql: string) =>
  as(db, actor, async () => { try { return { ok: true, rows: (await db.query<Record<string, unknown>>(sql)).rows }; } catch { return { ok: false, rows: [] as Record<string, unknown>[] }; } });

describe('export et suppression des données', () => {
  it('l\'admin exporte SON restaurant uniquement, sans empreinte d\'appareil', async () => {
    const r = await call('adminA', 'select public.export_restaurant_data() as d');
    expect(r.ok).toBe(true);
    const data = r.rows[0].d as { restaurant: { id: string }; reviews: Array<Record<string, unknown>> };
    expect(data.restaurant.id).toBe(ids.restA);
    expect(data.reviews).toHaveLength(1);
    expect(data.reviews[0]).not.toHaveProperty('device_hash');
    expect(JSON.stringify(data)).not.toContain(ids.restB);
  });
  it('serveur, cuisine, revendeur, anonyme : export refusé', async () => {
    for (const a of ['serverA', 'kitchenA', 'reseller', 'anon'] as const)
      expect((await call(a, 'select public.export_restaurant_data()')).ok).toBe(false);
  });
  it('suppression : admin refusé, mauvaise confirmation refusée, super_admin OK et B intact', async () => {
    const del = `select public.erase_restaurant('${ids.restA}', 'ERASE ${ids.restA}')`;
    expect((await call('adminA', del)).ok).toBe(false);
    expect((await call('superAdmin', `select public.erase_restaurant('${ids.restA}', 'oui')`)).ok).toBe(false);
    expect((await call('superAdmin', del)).ok).toBe(true);
    expect((await db.query(`select 1 from public.restaurants where id='${ids.restA}'`)).rows).toHaveLength(0);
    expect((await db.query(`select 1 from public.reviews where restaurant_id='${ids.restB}'`)).rows).toHaveLength(1);
    expect((await db.query(`select 1 from public.audit_log where action='restaurant_erased'`)).rows).toHaveLength(1);
  });
});