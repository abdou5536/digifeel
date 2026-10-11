import { describe, expect, it } from 'vitest';
import { buildAiStripeSubscriptionData, getStripeCheckoutConfig, getStripeSubscriptionConfig, toStripeEurCents } from '../../src/lib/stripeCheckout';
import { hasActiveAiSubscription } from '../../src/lib/aiSubscription';

const testEnv = {
  STRIPE_SECRET_KEY: 'sk_test_example',
  STRIPE_WEBHOOK_SECRET: 'whsec_example',
  STRIPE_EUR_TO_DZD: '150',
  APP_ORIGIN: 'https://digifeel.example'
};

describe('configuration de Stripe Checkout', () => {
  it('convertit les dinars en centimes EUR avec le taux configuré', () => {
    expect(toStripeEurCents(1500, 150, 150)).toBe(1100);
  });

  it('refuse les montants sous le minimum Stripe', () => {
    expect(() => toStripeEurCents(50, 0, 150)).toThrow(/minimum accepté/);
  });

  it('nécessite une clé live explicitement activée et un webhook configuré', () => {
    expect(getStripeCheckoutConfig({
      ...testEnv,
      STRIPE_SECRET_KEY: 'sk_live_example'
    })).toBeNull();
    expect(getStripeCheckoutConfig({
      ...testEnv,
      STRIPE_SECRET_KEY: 'sk_live_example',
      STRIPE_LIVE_PAYMENTS_ENABLED: 'true'
    })?.mode).toBe('live');
    expect(getStripeCheckoutConfig({
      ...testEnv,
      STRIPE_WEBHOOK_SECRET: ''
    })).toBeNull();
  });

  it('permet de configurer un abonnement EUR sans taux de conversion DZD', () => {
    expect(getStripeSubscriptionConfig({ ...testEnv, STRIPE_EUR_TO_DZD: '' })?.mode).toBe('test');
    expect(getStripeCheckoutConfig({ ...testEnv, STRIPE_EUR_TO_DZD: '' })).toBeNull();
  });

  it('ne considère que les abonnements payants actifs comme un accès IA', () => {
    expect(hasActiveAiSubscription('active')).toBe(true);
    expect(hasActiveAiSubscription('trialing')).toBe(false);
    expect(hasActiveAiSubscription('past_due')).toBe(false);
  });

  it('ne définit aucune période d’essai sur un nouvel abonnement IA Stripe', () => {
    expect(buildAiStripeSubscriptionData('restaurant-id')).toEqual({
      metadata: { restaurant_id: 'restaurant-id' }
    });
  });
});
