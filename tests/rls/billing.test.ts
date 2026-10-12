import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, createDb, ids, seed, type Actor } from './harness';

const A_PRODUCT = '40000000-0000-0000-0000-0000000000a1'; // Pizza 1200
const B_PRODUCT = '40000000-0000-0000-0000-0000000000b1';
let db: PGlite;

beforeAll(async () => {
  db = await createDb();
  await seed(db);
}, 60_000);
afterAll(async () => db.close());

type Row = Record<string, unknown>;
async function run(actor: Actor, sql: string, params: unknown[] = []): Promise<{ ok: boolean; rows: Row[] }> {
  return as(db, actor, async () => {
    try {
      const r = await db.query<Row>(sql, params);
      return { ok: true, rows: r.rows };
    } catch {
      return { ok: false, rows: [] };
    }
  });
}
async function newBill(actor: Actor = 'serverA', qty = 2) {
  const b = await run(actor, `select public.open_bill('T${Math.random()}') as id`);
  const id = b.rows[0].id as string;
  await run(actor, `select public.add_bill_item($1, $2, $3)`, [id, A_PRODUCT, qty]);
  return id;
}
const pay = (actor: Actor, bill: string, amount: number, tip: number, method: string, key: string) =>
  run(actor, `select public.record_payment($1,$2,$3,$4,$5) as id`, [bill, amount, tip, method, key]);
const billStatus = async (id: string) =>
  (await db.query<{ status: string }>(`select status from public.bills where id=$1`, [id])).rows[0].status;
const paymentsOf = async (bill: string) =>
  (await db.query<{ status: string }>(`select status from public.payments where bill_id=$1`, [bill])).rows;

describe('paiement : succès, montant serveur, falsification', () => {
  it('addition : le prix vient du produit en base, pas du client', async () => {
    const id = await newBill();
    const r = await db.query<{ unit_price_dzd: number; line_total_dzd: string }>(
      `select unit_price_dzd, line_total_dzd from public.bill_items where bill_id=$1`, [id]);
    expect(r.rows[0].unit_price_dzd).toBe(1200);
    expect(Number(r.rows[0].line_total_dzd)).toBe(2400);
  });

  it('succès : paiement espèces total → addition payée + journal', async () => {
    const id = await newBill();
    expect((await pay('serverA', id, 2400, 0, 'cash', 'key-success-1')).ok).toBe(true);
    expect(await billStatus(id)).toBe('paid');
    const log = await db.query(`select 1 from public.audit_log where entity_id=$1 or details->>'bill'=$1`, [id]);
    expect(log.rows.length).toBeGreaterThan(0);
  });

  it('montant falsifié : supérieur au reste, nul, négatif → refusé, rien enregistré', async () => {
    const id = await newBill();
    for (const [i, amount] of [2401, 0, -5, 999999].entries()) {
      expect((await pay('serverA', id, amount, 0, 'cash', `key-forged-${i}-${id}`)).ok, String(amount)).toBe(false);
    }
    expect(await paymentsOf(id)).toHaveLength(0);
    expect(await billStatus(id)).toBe('open');
  });

  it('produit d\'un autre restaurant refusé sur l\'addition', async () => {
    const b = await run('serverA', `select public.open_bill('X') as id`);
    const r = await run('serverA', `select public.add_bill_item($1,$2,1)`, [b.rows[0].id, B_PRODUCT]);
    expect(r.ok).toBe(false);
  });

  it('pourboire séparé du montant dû ; pourboire négatif ou démesuré refusé', async () => {
    const id = await newBill();
    expect((await pay('serverA', id, 2400, -1, 'cash', `tip-neg-${id}`)).ok).toBe(false);
    expect((await pay('serverA', id, 2400, 2401, 'cash', `tip-big-${id}`)).ok).toBe(false);
    expect((await pay('serverA', id, 2400, 300, 'cash', `tip-ok-${id}`)).ok).toBe(true);
    const r = await db.query<{ amount_dzd: string; tip_dzd: string }>(`select amount_dzd, tip_dzd from public.payments where bill_id=$1`, [id]);
    expect([Number(r.rows[0].amount_dzd), Number(r.rows[0].tip_dzd)]).toEqual([2400, 300]);
  });

  it('paiement partiel : l\'addition reste ouverte, puis se solde et ne peut plus être surpayée', async () => {
    const id = await newBill();
    expect((await pay('serverA', id, 1000, 0, 'baridimob', `part-1-${id}`)).ok).toBe(true);
    expect(await billStatus(id)).toBe('open');
    expect((await pay('serverA', id, 1500, 0, 'cash', `part-over-${id}`)).ok).toBe(false);
    expect((await pay('serverA', id, 1400, 0, 'cash', `part-2-${id}`)).ok).toBe(true);
    expect(await billStatus(id)).toBe('paid');
    expect((await pay('serverA', id, 1, 0, 'cash', `part-3-${id}`)).ok).toBe(false);
  });

  it('remise : réservée à l\'admin, plafonnée, recalcule le reste à payer', async () => {
    const id = await newBill();
    expect((await run('serverA', `select public.set_bill_discount($1, 400)`, [id])).ok).toBe(false);
    expect((await run('adminA', `select public.set_bill_discount($1, 99999)`, [id])).ok).toBe(false);
    expect((await run('adminA', `select public.set_bill_discount($1, 400)`, [id])).ok).toBe(true);
    expect((await pay('serverA', id, 2400, 0, 'cash', `disc-1-${id}`)).ok).toBe(false);
    expect((await pay('serverA', id, 2000, 0, 'cash', `disc-2-${id}`)).ok).toBe(true);
    expect(await billStatus(id)).toBe('paid');
  });
});

describe('idempotence, double clic, annulation', () => {
  it('double clic : même clé deux fois = un seul paiement', async () => {
    const id = await newBill();
    const a = await pay('serverA', id, 2400, 0, 'cash', `dbl-${id}`);
    const b = await pay('serverA', id, 2400, 0, 'cash', `dbl-${id}`);
    expect(a.ok && b.ok).toBe(true);
    expect(a.rows[0].id).toBe(b.rows[0].id);
    expect(await paymentsOf(id)).toHaveLength(1);
  });

  it('même clé avec un autre montant → refusé', async () => {
    const id = await newBill();
    await pay('serverA', id, 1000, 0, 'cash', `reuse-${id}`);
    expect((await pay('serverA', id, 1100, 0, 'cash', `reuse-${id}`)).ok).toBe(false);
  });

  it('annulation : paiement carte en attente annulable, jamais compté comme payé', async () => {
    const id = await newBill();
    const p = await pay('serverA', id, 2400, 0, 'stripe', `card-${id}`);
    expect(await billStatus(id)).toBe('open');
    expect((await run('serverA', `select public.cancel_pending_payment($1)`, [p.rows[0].id])).ok).toBe(true);
    expect((await paymentsOf(id))[0].status).toBe('cancelled');
    expect((await run('serverA', `select public.cancel_pending_payment($1)`, [p.rows[0].id])).ok).toBe(false);
  });

  it('annulation d\'addition : admin seulement, impossible si déjà payée', async () => {
    const open = await newBill();
    expect((await run('serverA', `select public.void_bill($1)`, [open])).ok).toBe(false);
    expect((await run('adminA', `select public.void_bill($1)`, [open])).ok).toBe(true);
    const paid = await newBill();
    await pay('serverA', paid, 100, 0, 'cash', `v-${paid}`);
    expect((await run('adminA', `select public.void_bill($1)`, [paid])).ok).toBe(false);
  });
});

describe('webhook (service_role) : succès, échec, doublon', () => {
  const settle = (event: string, payment: string, outcome: string) =>
    db.query<{ r: string }>(`select public.settle_provider_payment($1,$2,$3) as r`, [event, payment, outcome]);

  it('succès confirmé par webhook → payé ; même événement rejoué = ignoré', async () => {
    const id = await newBill();
    const p = (await pay('serverA', id, 2400, 0, 'stripe', `wh-ok-${id}`)).rows[0].id as string;
    expect((await settle(`evt_ok_${id}`, p, 'succeeded')).rows[0].r).toBe('succeeded');
    expect(await billStatus(id)).toBe('paid');
    expect((await settle(`evt_ok_${id}`, p, 'succeeded')).rows[0].r).toBe('duplicate');
  });

  it('échec : le paiement échoue, l\'addition reste ouverte et repayable', async () => {
    const id = await newBill();
    const p = (await pay('serverA', id, 2400, 0, 'stripe', `wh-ko-${id}`)).rows[0].id as string;
    await settle(`evt_ko_${id}`, p, 'failed');
    expect(await billStatus(id)).toBe('open');
    expect((await pay('serverA', id, 2400, 0, 'cash', `wh-retry-${id}`)).ok).toBe(true);
  });

  it('un utilisateur connecté ne peut pas appeler le webhook ni forger un succès', async () => {
    const id = await newBill();
    const p = (await pay('serverA', id, 2400, 0, 'stripe', `wh-forge-${id}`)).rows[0].id as string;
    for (const actor of ['adminA', 'serverA', 'anon'] as const) {
      expect((await run(actor, `select public.settle_provider_payment('evt_forged', $1, 'succeeded')`, [p])).ok).toBe(false);
    }
    expect(await billStatus(id)).toBe('open');
  });
});

describe('remboursement', () => {
  it('admin rembourse : paiement « refunded », addition rouverte, journalisé ; serveur refusé', async () => {
    const id = await newBill();
    const p = (await pay('serverA', id, 2400, 0, 'cash', `rf-${id}`)).rows[0].id as string;
    expect((await run('serverA', `select public.refund_payment($1,'x')`, [p])).ok).toBe(false);
    expect((await run('adminA', `select public.refund_payment($1,'client mécontent')`, [p])).ok).toBe(true);
    expect((await paymentsOf(id))[0].status).toBe('refunded');
    expect(await billStatus(id)).toBe('open');
    expect((await run('adminA', `select public.refund_payment($1,'x')`, [p])).ok).toBe(false);
    const log = await db.query(`select 1 from public.audit_log where action='payment_refunded' and entity_id=$1`, [p]);
    expect(log.rows).toHaveLength(1);
  });
});

describe('isolation et droits sur additions / paiements', () => {
  it('restaurant B ne peut ni payer, ni rembourser, ni lire, ni écrire sur l\'addition de A', async () => {
    const id = await newBill();
    const p = (await pay('serverA', id, 100, 0, 'cash', `iso-${id}`)).rows[0].id as string;
    for (const actor of ['adminB', 'serverB'] as const) {
      expect((await pay(actor, id, 100, 0, 'cash', `iso-b-${actor}-${id}`)).ok).toBe(false);
      expect((await run(actor, `select public.add_bill_item($1,$2,1)`, [id, B_PRODUCT])).ok).toBe(false);
      expect((await run(actor, `select 1 from public.payments where id=$1`, [p])).rows).toHaveLength(0);
      expect((await run(actor, `select 1 from public.bills where id=$1`, [id])).rows).toHaveLength(0);
      expect((await run(actor, `update public.payments set amount_dzd=1 where id=$1`, [p])).ok).toBe(false);
      expect((await run(actor, `delete from public.payments where id=$1`, [p])).ok).toBe(false);
    }
    expect((await run('adminB', `select public.refund_payment($1,'x')`, [p])).ok).toBe(false);
  });

  it('même le restaurant A ne peut pas écrire directement (UPDATE/DELETE/INSERT interdits)', async () => {
    const id = await newBill();
    const p = (await pay('serverA', id, 100, 0, 'cash', `direct-${id}`)).rows[0].id as string;
    for (const actor of ['adminA', 'serverA'] as const) {
      expect((await run(actor, `update public.payments set status='succeeded', amount_dzd=1 where id=$1`, [p])).ok).toBe(false);
      expect((await run(actor, `delete from public.payments where id=$1`, [p])).ok).toBe(false);
      expect((await run(actor, `update public.bill_items set unit_price_dzd=1 where bill_id=$1`, [id])).ok).toBe(false);
      expect((await run(actor, `insert into public.payments (bill_id,restaurant_id,amount_dzd,method,idempotency_key) values ($1,$2,1,'cash','hack-12345')`, [id, ids.restA])).ok).toBe(false);
    }
  });

  it('cuisine, revendeur et anonyme : aucun accès aux additions/paiements', async () => {
    const id = await newBill();
    for (const actor of ['kitchenA', 'reseller', 'anon'] as const) {
      expect((await run(actor, `select 1 from public.bills`)).rows).toHaveLength(0);
      expect((await run(actor, `select 1 from public.payments`)).rows).toHaveLength(0);
      expect((await pay(actor, id, 100, 0, 'cash', `nope-${actor}-${id}`)).ok).toBe(false);
      expect((await run(actor, `select public.open_bill('x')`)).ok).toBe(false);
    }
  });
});

describe('journal d\'activité', () => {
  it('append-only : modification et suppression interdites, même pour le propriétaire', async () => {
    for (const actor of ['adminA', 'serverA'] as const) {
      expect((await run(actor, `update public.audit_log set action='x'`)).ok).toBe(false);
      expect((await run(actor, `delete from public.audit_log`)).ok).toBe(false);
    }
    await expect(db.query(`update public.audit_log set action='x'`)).rejects.toThrow(/append-only/);
  });

  it('lisible par l\'admin de son restaurant seulement', async () => {
    expect((await run('adminA', `select 1 from public.audit_log`)).rows.length).toBeGreaterThan(0);
    for (const actor of ['serverA', 'kitchenA', 'adminB', 'reseller', 'anon'] as const) {
      const r = await run(actor, `select 1 from public.audit_log where restaurant_id='${ids.restA}'`);
      expect(r.rows).toHaveLength(0);
    }
  });

  it('changement de prix et de lien Google journalisés', async () => {
    await run('adminA', `update public.pos_products set price_dzd=1500 where id=$1`, [A_PRODUCT]);
    await run('adminA', `update public.restaurants set google_review_url='https://g.page/r/nouveau/review' where id=$1`, [ids.restA]);
    const r = await db.query<{ action: string }>(`select action from public.audit_log where action in ('price_changed','google_link_changed')`);
    expect(r.rows.map((x) => x.action).sort()).toEqual(['google_link_changed', 'price_changed']);
    await run('adminA', `update public.pos_products set price_dzd=1200 where id=$1`, [A_PRODUCT]);
  });
});

describe('commission et retour arrière', () => {
  it('aucune colonne de commission sur les paiements (commission désactivée)', async () => {
    const r = await db.query(`select column_name from information_schema.columns where table_name in ('payments','bills','bill_items') and column_name ilike '%commission%'`);
    expect(r.rows).toHaveLength(0);
  });

  it('le script down retire les objets sans erreur', async () => {
    // Retour arrière dans l'ordre inverse des migrations.
    for (const f of ['202610120001_guest_table_orders', '202610110001_server_deactivation', '202610100001_review_management', '202610090001_guest_table_actions', '202610080001_dining_tables_guest_sessions', '202610070001_data_rights', '202610060001_billing_ledger']) {
      await db.exec(readFileSync(join(process.cwd(), 'supabase', 'rollback', `${f}.down.sql`), 'utf8'));
    }
    expect((await db.query(`select 1 from pg_tables where tablename in ('payments','audit_log','bills')`)).rows).toHaveLength(0);
  });
});
