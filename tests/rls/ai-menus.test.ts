import { afterEach, describe, expect, it } from 'vitest';
import { as, createDb, ids, seed } from './harness';
import type { PGlite } from '@electric-sql/pglite';

describe('menus IA et isolation', () => {
  let db: PGlite | undefined;

  afterEach(async () => {
    await db?.close();
    db = undefined;
  });

  it('garde deux menus gratuits pendant l’essai puis bloque la troisième création', async () => {
    db = await createDb();
    await seed(db);
    await db.query(
      "update public.subscriptions set status='trialing', trial_ends_at=now()+interval '30 days' where restaurant_id=$1",
      [ids.restA]
    );

    const createReservation = () => db!.query(
      "select menu_id from public.reserve_ai_menu('Menu du jour')"
    );
    await as(db, 'adminA', async () => {
      expect((await createReservation()).rows).toHaveLength(1);
      expect((await createReservation()).rows).toHaveLength(1);
      await expect(createReservation()).rejects.toThrow(/Free AI menu allowance exhausted/);
    });
  });

  it('n’autorise pas un serveur à réserver un menu et ne publie que les menus finalisés', async () => {
    db = await createDb();
    await seed(db);
    let reservationId = '';
    await as(db, 'serverA', async () => {
      await expect(db!.query("select * from public.reserve_ai_menu('Menu test')")).rejects.toThrow(/Restaurant admin access required/);
    });
    await as(db, 'adminA', async () => {
      const result = await db!.query<{ menu_id: string }>(
        "select menu_id from public.reserve_ai_menu('Menu test')"
      );
      reservationId = result.rows[0].menu_id;
    });
    await as(db, 'anon', async () => {
      expect((await db!.query('select id from public.restaurant_menus')).rows).toHaveLength(0);
    });
    await db.query("update public.restaurant_menus set status='published' where id=$1", [reservationId]);
    await as(db, 'anon', async () => {
      expect((await db!.query('select id from public.restaurant_menus')).rows).toHaveLength(1);
      await expect(db!.query("insert into public.restaurant_menus (restaurant_id,created_by,public_slug,title) values ($1,$2,'public-attempt','Intrusion')", [ids.restA, ids.adminA]))
        .rejects.toThrow();
    });
    await as(db, 'adminB', async () => {
      expect((await db!.query('select id from public.restaurant_menus')).rows).toHaveLength(1);
    });
  });
});
