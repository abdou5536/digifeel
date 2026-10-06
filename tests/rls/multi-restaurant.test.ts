import { describe, expect, it } from 'vitest';
import { as, attempt, createDb, ids, seed } from './harness';

describe('multi-restaurants : slug, tables, activation', () => {
  it('génère des slugs uniques et lisibles', async () => {
    const db = await createDb();
    try {
      await db.exec(`insert into public.restaurants (name) values ('Café de l''Étoile'), ('Café de l''Étoile'), ('Chez Léa')`);
      const { rows } = await db.query<{ slug: string }>('select slug from public.restaurants order by created_at, slug');
      expect(rows.map((r) => r.slug).sort()).toEqual(['cafe-de-l-etoile', 'cafe-de-l-etoile-2', 'chez-lea']);
    } finally { await db.close(); }
  });

  it('provisionne un restaurant avec ses tables et refuse l’accès aux rôles non serveur', async () => {
    const db = await createDb();
    await seed(db);
    try {
      await db.query(`insert into auth.users (id) values ('10000000-0000-0000-0000-0000000000c1')`);
      const { rows } = await db.query<{ id: string }>(
        `select public.admin_provision_restaurant('Le Test', null, 'https://g.page/r/test/review', null, '10000000-0000-0000-0000-0000000000c1', 3) as id`);
      const id = rows[0].id;
      const chips = await db.query<{ table_number: number }>(`select table_number from public.chips where restaurant_id=$1 order by 1`, [id]);
      expect(chips.rows.map((c) => c.table_number)).toEqual([1, 2, 3]);
      expect((await db.query(`select 1 from public.dining_tables where restaurant_id=$1`, [id])).rows).toHaveLength(3);
      const more = await db.query<{ table_number: number }>(`select * from public.admin_add_tables($1, 2)`, [id]);
      expect(more.rows.map((c) => c.table_number)).toEqual([4, 5]);

      expect(await attempt(db, `select public.admin_add_tables('${id}', 1)`)).toBe(1);
      const denied = await as(db, 'adminA', async () => attempt(db, `select public.admin_add_tables('${ids.restA}', 1)`));
      expect(denied).toBe(-1);
      const deniedProvision = await as(db, 'adminA', async () => attempt(db, `select public.admin_provision_restaurant('X Y', null, null, null, null, 0)`));
      expect(deniedProvision).toBe(-1);
    } finally { await db.close(); }
  });

  it('un restaurateur ne peut pas changer son slug ni se réactiver, le superadmin peut désactiver', async () => {
    const db = await createDb();
    await seed(db);
    try {
      const rename = await as(db, 'adminA', async () => attempt(db, `update public.restaurants set slug='pirate' where id='${ids.restA}'`));
      expect(rename).toBe(-1);
      const reactivate = await as(db, 'adminA', async () => attempt(db, `update public.restaurants set active=true where id='${ids.restA}'`));
      expect(reactivate).toBe(-1);
      const ownEdit = await as(db, 'adminA', async () => attempt(db, `update public.restaurants set name='Nouveau nom', logo_url='https://x.test/l.png' where id='${ids.restA}'`));
      expect(ownEdit).toBe(1);

      expect(await as(db, 'adminA', async () => attempt(db, `select public.super_set_restaurant_active('${ids.restB}', false)`))).toBe(-1);
      expect(await as(db, 'superAdmin', async () => attempt(db, `select public.super_set_restaurant_active('${ids.restB}', false)`))).toBe(1);

      expect(await attempt(db, `insert into public.reviews (restaurant_id, chip_id, stars, device_hash) values ('${ids.restB}', 'chipB', 5, 'd')`)).toBe(-1);
      expect(await attempt(db, `insert into public.reviews (restaurant_id, chip_id, stars, device_hash) values ('${ids.restA}', 'chipA', 5, 'd')`)).toBe(1);
    } finally { await db.close(); }
  });
});
