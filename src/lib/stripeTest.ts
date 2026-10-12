// Stripe en MODE TEST uniquement : toute clé qui n'est pas sk_test_ est refusée.
export function stripeTestKey(env: Record<string, string | undefined> = process.env): string {
  const key = (env.STRIPE_SECRET_KEY ?? '').trim();
  if (!key || !key.startsWith('sk_test_')) {
    throw new Error('STRIPE_SECRET_KEY doit être une clé de test (sk_test_...). Le mode réel est interdit sans accord explicite.');
  }
  return key;
}

export async function createTestPaymentIntent(
  input: { amountDzd: number; paymentId: string },
  key = stripeTestKey(),
  fetchImpl: typeof fetch = fetch
) {
  const amountMinor = Number(input.amountDzd) * 100;
  if (!Number.isFinite(amountMinor) || !Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error('Le montant du paiement de test est invalide.');
  }

  const body = new URLSearchParams({
    amount: String(amountMinor),
    currency: 'dzd',
    'metadata[payment_id]': input.paymentId,
    'automatic_payment_methods[enabled]': 'true'
  });

  const res = await fetchImpl('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    body,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': input.paymentId
    }
  });

  if (!res.ok) throw new Error(`Stripe ${res.status}`);
  return (await res.json()) as { id: string; client_secret: string };
}

