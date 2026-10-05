import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { as, createDb, ids, seed, type Actor } from './harness';

const PRODUCT_A = '40000000-0000-0000-0000-0000000000a1';
const DEVICE_HASH = 'f'.repeat(64);
type Row = Record<string, unknown>;

async function query(db: Awaited<ReturnType<typeof createDb>>, actor: Actor, sql: string, params: unknown[] = []) {
  return as(db, actor, async () => {
    try {
      return { ok: true, rows: (await db.query<Row>(sql, params)).rows };
    } catch (error) {
      return { ok: false, error };
    }
  });
}

async function openTableBill(db: Awaited<ReturnType<typeof createDb>>, actor: 'adminA' | 'adminB' = 'adminA') {
  const { rows: codeRows } = await query(db, actor, `select public.create_dining_table($1) as code`, [`T-${crypto.randomUUID().slice(0, 8)}`]);
  const code = codeRows[0].code as string;
  const { rows: billRows } = await query(db, actor === 'adminA' ? 'serverA' : 'serverB', `
    select public.open_table_bill(id) as id
    from public.dining_tables where code = $1
  `, [code]);
  const billId = billRows[0].id as string;
  await query(db, actor === 'adminA' ? 'serverA' : 'serverB', `select public.add_bill_item($1, $2, 2)`, [billId, PRODUCT_A.replace('a1', actor === 'adminA' ? 'a1' : 'b1')]);
  const { rows: tokenRows } = await query(db, 'anon', `select public.open_guest_session($1) as token`, [code]);
  return { code, billId, token: tokenRows[0].token as string };
}

describe('actions publiques des additions de table', () => {
  it('crée une demande manuelle en attente, idempotente, confirmable par son équipe uniquement', async () => {
    const db = await createDb();
    await seed(db);
    try {
      const { billId, token } = await openTableBill(db);
      const key = crypto.randomUUID();
      const request = `select public.request_guest_payment($1, 2400, 0, 'baridimob', $2) as id`;
      const first = await query(db, 'anon', request, [token, key]);
      const second = await query(db, 'anon', request, [token, key]);
      expect(first.ok).toBe(true);
      expect(second.rows[0].id).toBe(first.rows[0].id);
      const bill = await query(db, 'anon', `select public.guest_get_bill($1) as bill`, [token]);
      expect((bill.rows[0].bill as { pending_dzd: number }).pending_dzd).toBe(2400);

      const paymentId = first.rows[0].id as string;
      expect((await query(db, 'kitchenA', `select public.confirm_guest_payment($1)`, [paymentId])).ok).toBe(false);
      expect((await query(db, 'adminB', `select public.confirm_guest_payment($1)`, [paymentId])).ok).toBe(false);
      expect((await query(db, 'serverA', `select public.confirm_guest_payment($1)`, [paymentId])).ok).toBe(true);
      const payment = await db.query<{ status: string }>(`select status from public.payments where id = $1`, [paymentId]);
      const paidBill = await db.query<{ status: string }>(`select status from public.bills where id = $1`, [billId]);
      expect(payment.rows[0].status).toBe('succeeded');
      expect(paidBill.rows[0].status).toBe('paid');
      expect((await query(db, 'anon',
        `select public.submit_guest_review($1, 5, 'Avis après paiement', $2, null)`, [token, DEVICE_HASH])).ok).toBe(true);
    } finally {
      await db.close();
    }
  });

  it('refuse le dépassement du reste, les méthodes non manuelles et le jeton invalide', async () => {
    const db = await createDb();
    await seed(db);
    try {
      const { token } = await openTableBill(db);
      expect((await query(db, 'anon',
        `select public.request_guest_payment($1, 2401, 0, 'cash', 'guest-key-001')`, [token])).ok).toBe(false);
      expect((await query(db, 'anon',
        `select public.request_guest_payment($1, 2000, 0, 'cash', 'guest-key-004')`, [token])).ok).toBe(true);
      expect((await query(db, 'anon',
        `select public.request_guest_payment($1, 500, 0, 'cash', 'guest-key-005')`, [token])).ok).toBe(false);
      expect((await query(db, 'anon',
        `select public.request_guest_payment($1, 100, 0, 'stripe', 'guest-key-002')`, [token])).ok).toBe(false);
      expect((await query(db, 'anon',
        `select public.request_guest_payment('invalid', 100, 0, 'cash', 'guest-key-003')`)).ok).toBe(false);
    } finally {
      await db.close();
    }
  });

  it('associe un avis au restaurant et à l’addition, permet un seul avis par session', async () => {
    const db = await createDb();
    await seed(db);
    try {
      const { billId, token } = await openTableBill(db);
      const result = await query(db, 'anon',
        `select public.submit_guest_review($1, 5, 'Très bon repas', $2, null) as review`, [token, DEVICE_HASH]);
      expect(result.ok).toBe(true);
      const reviewId = (result.rows[0].review as { review_id: string }).review_id;
      const review = await db.query<{ restaurant_id: string; bill_id: string; chip_id: string | null; stars: number }>(
        `select restaurant_id, bill_id, chip_id, stars from public.reviews where id = $1`, [reviewId]
      );
      expect(review.rows[0]).toMatchObject({
        restaurant_id: ids.restA,
        bill_id: billId,
        chip_id: null,
        stars: 5
      });
      expect((await query(db, 'anon',
        `select public.submit_guest_review($1, 4, 'Deuxième avis', $2, null)`, [token, DEVICE_HASH])).ok).toBe(false);
    } finally {
      await db.close();
    }
  });

  it('refuse un avis avec un serveur d’un autre restaurant', async () => {
    const db = await createDb();
    await seed(db);
    try {
      const { token } = await openTableBill(db);
      const result = await query(db, 'anon',
        `select public.submit_guest_review($1, 4, '', $2, $3)`, [token, DEVICE_HASH, ids.srvRowB]);
      expect(result.ok).toBe(false);
    } finally {
      await db.close();
    }
  });

  it('applique le plafond d’avis par empreinte serveur', async () => {
    const db = await createDb();
    await seed(db);
    try {
      const { code } = await openTableBill(db);
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const { rows } = await query(db, 'anon', `select public.open_guest_session($1) as token`, [code]);
        expect((await query(db, 'anon',
          `select public.submit_guest_review($1, 5, '', $2, null)`, [rows[0].token, DEVICE_HASH])).ok).toBe(true);
      }
      const { rows } = await query(db, 'anon', `select public.open_guest_session($1) as token`, [code]);
      expect((await query(db, 'anon',
        `select public.submit_guest_review($1, 5, '', $2, null)`, [rows[0].token, DEVICE_HASH])).ok).toBe(false);
    } finally {
      await db.close();
    }
  });

  it('le retour arrière retire les RPC et colonnes ajoutées', async () => {
    const db = await createDb();
    try {
      await db.exec(readFileSync('supabase/rollback/202610090001_guest_table_actions.down.sql', 'utf8'));
      const result = await db.query<{ column_name: string }>(
        `select column_name from information_schema.columns
         where table_schema='public' and table_name='reviews' and column_name='bill_id'`
      );
      expect(result.rows).toHaveLength(0);
      const functionResult = await db.query<{ procedure: string | null }>(
        `select to_regprocedure('public.request_guest_payment(text,bigint,bigint,text,text)') as procedure`
      );
      expect(functionResult.rows[0].procedure).toBeNull();
    } finally {
      await db.close();
    }
  });
});
