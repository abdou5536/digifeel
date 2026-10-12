import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { paymentRequestSchema, posSaleSchema, reviewSchema } from '../../src/lib/schemas';
import { clientIp, isValidGoogleReviewUrl } from '../../src/lib/security';
import { verifyStripeSignature } from '../../supabase/functions/_shared/stripeSignature';

const chipId = '12345678-1234-1234-1234-123456789abc';
const req = (h: Record<string, string>) => ({ headers: new Headers(h) }) as never;

describe('validation zod', () => {
  it('avis : accepte 1 à 5 étoiles sans filtrage', () => {
    for (const stars of [1, 2, 3, 4, 5]) expect(reviewSchema.safeParse({ chipId, stars }).success).toBe(true);
  });
  it.each([
    [{ chipId, stars: 0 }], [{ chipId, stars: 6 }], [{ chipId, stars: 4.5 }], [{ chipId, stars: '5' }],
    [{ chipId: 'x', stars: 5 }], [{ chipId, stars: 5, comment: 'a'.repeat(2001) }],
    [{ chipId, stars: 5, tipAmountMinor: -1 }], [{ chipId, stars: 5, serverId: 'pas-un-uuid' }]
  ])('avis invalide refusé %#', (input) => {
    expect(reviewSchema.safeParse(input).success).toBe(false);
  });
  it('commentaire hostile : conservé comme texte (échappé par React), pas interprété', () => {
    const r = reviewSchema.parse({ chipId, stars: 5, comment: '<script>alert(1)</script>' });
    expect(r.comment).toBe('<script>alert(1)</script>');
  });
  it('paiement : montants négatifs/décimaux/clé courte refusés', () => {
    const ok = { billId: '10000000-0000-4000-8000-0000000000a1', amountDzd: 100, method: 'cash', idempotencyKey: 'abcdefgh' };
    expect(paymentRequestSchema.safeParse(ok).success).toBe(true);
    for (const bad of [{ amountDzd: -1 }, { amountDzd: 1.5 }, { idempotencyKey: 'x' }, { method: 'bitcoin' }]) {
      expect(paymentRequestSchema.safeParse({ ...ok, ...bad }).success).toBe(false);
    }
  });
  it('vente POS : lignes vides refusées', () => {
    expect(posSaleSchema.safeParse({ id: '10000000-0000-4000-8000-0000000000a1', paymentMethod: 'cash', items: [] }).success).toBe(false);
  });
  it('lien Google : seuls les domaines Google en https', () => {
    expect(isValidGoogleReviewUrl('https://g.page/r/abc/review')).toBe(true);
    for (const bad of ['http://g.page/x', 'https://evil.com/google.com', 'javascript:alert(1)', 'https://google.com.evil.com'])
      expect(isValidGoogleReviewUrl(bad)).toBe(false);
  });
});

describe('IP de confiance (rate limiting)', () => {
  it('ignore x-forwarded-for falsifié par défaut', () => {
    delete process.env.TRUST_FORWARDED_FOR;
    expect(clientIp(req({ 'x-forwarded-for': '1.2.3.4' }))).toBe('unknown-ip');
  });
  it('utilise cf-connecting-ip (posé par Cloudflare)', () => {
    expect(clientIp(req({ 'cf-connecting-ip': '9.9.9.9', 'x-forwarded-for': '1.2.3.4' }))).toBe('9.9.9.9');
  });
});

describe('signature webhook Stripe', () => {
  const secret = 'whsec_test_secret';
  const payload = '{"id":"evt_1","type":"payment_intent.succeeded"}';
  const now = 1_800_000_000;
  const sign = (t: number, body = payload, s = secret) => `t=${t},v1=${createHmac('sha256', s).update(`${t}.${body}`).digest('hex')}`;

  it('accepte une signature valide', async () => {
    expect(await verifyStripeSignature(payload, sign(now), secret, 300, now)).toBe(true);
  });
  it('refuse : corps modifié, mauvais secret, en-tête absent, trop ancien', async () => {
    expect(await verifyStripeSignature(payload + ' ', sign(now), secret, 300, now)).toBe(false);
    expect(await verifyStripeSignature(payload, sign(now, payload, 'autre'), secret, 300, now)).toBe(false);
    expect(await verifyStripeSignature(payload, null, secret, 300, now)).toBe(false);
    expect(await verifyStripeSignature(payload, sign(now - 1000), secret, 300, now)).toBe(false);
    expect(await verifyStripeSignature(payload, sign(now), '', 300, now)).toBe(false);
  });
});