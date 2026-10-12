export interface StripeCheckoutConfig {
  secretKey: string;
  mode: 'test' | 'live';
  eurToDzd: number;
  origin: string;
}

export interface StripeSubscriptionConfig {
  secretKey: string;
  mode: 'test' | 'live';
  origin: string;
}

export function buildAiStripeSubscriptionData(restaurantId: string) {
  return { metadata: { restaurant_id: restaurantId } };
}

export function getStripeSubscriptionConfig(env: Record<string, string | undefined> = process.env): StripeSubscriptionConfig | null {
  const secretKey = env.STRIPE_SECRET_KEY ?? '';
  const mode = secretKey.startsWith('sk_test_') ? 'test'
    : secretKey.startsWith('sk_live_') && env.STRIPE_LIVE_PAYMENTS_ENABLED === 'true' ? 'live'
      : null;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET ?? '';
  const configuredOrigin = env.APP_ORIGIN ?? '';

  if (!mode || !webhookSecret.startsWith('whsec_') || !configuredOrigin) return null;

  try {
    const origin = new URL(configuredOrigin);
    if (origin.pathname !== '/' || origin.search || origin.hash ||
        (env.NODE_ENV === 'production' && origin.protocol !== 'https:')) return null;
    return { secretKey, mode, origin: origin.origin };
  } catch {
    return null;
  }
}

export function getStripeCheckoutConfig(env: Record<string, string | undefined> = process.env): StripeCheckoutConfig | null {
  const base = getStripeSubscriptionConfig(env);
  const eurToDzd = Number(env.STRIPE_EUR_TO_DZD);

  if (!base || !Number.isFinite(eurToDzd) || eurToDzd <= 0 || eurToDzd > 1_000_000) return null;
  return { ...base, eurToDzd };
}

export function toStripeEurCents(amountDzd: number, tipDzd: number, eurToDzd: number) {
  if (!Number.isFinite(amountDzd) || !Number.isFinite(tipDzd) || amountDzd < 0 || tipDzd < 0 || !Number.isFinite(eurToDzd) || eurToDzd <= 0) {
    throw new Error('Le total converti est inférieur au minimum accepté par Stripe.');
  }

  const amountCents = Math.round((amountDzd + tipDzd) * 100 / eurToDzd);
  if (!Number.isSafeInteger(amountCents) || amountCents < 50) {
    throw new Error('Le total converti est inférieur au minimum accepté par Stripe.');
  }
  return amountCents;
}
