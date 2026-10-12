import { describe, expect, it } from 'vitest';
import { guestTokenSchema, tableCodeSchema, addBillItemSchema, billIdSchema, openBillSchema, paymentRequestSchema } from '@/src/lib/schemas';
import { createTestPaymentIntent, stripeTestKey } from '@/src/lib/stripeTest';

const id = '11111111-1111-4111-8111-111111111111';
describe('schÃ©mas addition', () => {
  it('refuse les entrÃ©es invalides', () => {
    expect(openBillSchema.safeParse({ table: '' }).success).toBe(false);
    expect(addBillItemSchema.safeParse({ productId: id, quantity: 0 }).success).toBe(false);
    expect(addBillItemSchema.safeParse({ productId: 'x', quantity: 1 }).success).toBe(false);
    expect(billIdSchema.safeParse("1' or 1=1").success).toBe(false);
    expect(paymentRequestSchema.safeParse({ billId: id, amountDzd: -5, method: 'cash', idempotencyKey: 'abcdefgh' }).success).toBe(false);
  });
  it('ignore un prix envoyÃ© par le client', () => {
    const r = addBillItemSchema.parse({ productId: id, quantity: 2, priceDzd: 1 });
    expect('priceDzd' in r).toBe(false);
  });
});
describe('Stripe test uniquement', () => {
  it('refuse une clÃ© rÃ©elle ou absente', () => {
    expect(() => stripeTestKey({ STRIPE_SECRET_KEY: 'sk_live_abc' })).toThrow();
    expect(() => stripeTestKey({})).toThrow();
    expect(stripeTestKey({ STRIPE_SECRET_KEY: 'sk_test_abc' })).toBe('sk_test_abc');
  });
  it('envoie une clÃ© dâ€™idempotence et le montant', async () => {
    let seen: RequestInit | undefined;
    const f = (async (_u: string, init: RequestInit) => { seen = init; return new Response(JSON.stringify({ id: 'pi_1', client_secret: 's' })); }) as unknown as typeof fetch;
    await createTestPaymentIntent({ amountDzd: 1500, paymentId: id }, 'sk_test_x', f);
    expect((seen!.headers as Record<string, string>)['Idempotency-Key']).toBe(id);
    expect(String(seen!.body)).toContain('amount=150000');
  });
});
describe('schémas invité', () => {
  it('code table et jeton stricts', () => {
    expect(tableCodeSchema.safeParse('abcdefghijklmno').success).toBe(false);
    expect(tableCodeSchema.safeParse('abcdefg234567abc').success).toBe(true);
    expect(tableCodeSchema.safeParse("a' or 1=1--").success).toBe(false);
    expect(guestTokenSchema.safeParse('a'.repeat(64)).success).toBe(true);
    expect(guestTokenSchema.safeParse('a'.repeat(63)).success).toBe(false);
  });
});
