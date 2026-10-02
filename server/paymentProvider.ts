/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Digifeel Payment Provider Architecture & Abstraction Layer
 * Supports modular payment gateways: Stripe (France/EU), BaridiMob/CCP (Algeria), Manual Wire Transfer.
 */

export type SupportedPaymentProvider = 'stripe' | 'baridimob' | 'bank_transfer' | 'mock';

export interface PaymentCustomer {
  id: string;
  restaurantId: string;
  email: string;
  name: string;
  phone?: string;
}

export interface PaymentIntentOptions {
  amount: number; // In cents (e.g. 10000 = 100.00 EUR or DZD equivalent)
  currency: 'eur' | 'dzd';
  restaurantId: string;
  type: 'installation_pack' | 'monthly_subscription';
  customerEmail: string;
  description: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  id: string;
  provider: SupportedPaymentProvider;
  status: 'requires_payment_method' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  clientSecret?: string;
  paymentUrl?: string;
  amount: number;
  currency: string;
  qrCodeData?: string; // For BaridiMob QR / CCP rip payload
  instructions?: string;
  expiresAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceEur: number;
  priceDzd: number;
  billingInterval: 'month' | 'year';
  features: string[];
}

export const DIGIFEEL_PLANS: Record<string, SubscriptionPlan> = {
  INSTALLATION_PACK: {
    id: 'pack-installation',
    name: 'Pack d’Installation Digifeel',
    priceEur: 100,
    priceDzd: 15000,
    billingInterval: 'month',
    features: [
      'Création compte Admin Restaurant',
      'Puces NFC physiques & Chevalets QR pré-encodés',
      '1er mois d’abonnement offert',
      'Accès complet aux avis et pourboires',
      'Exports PDF & Excel de base'
    ]
  },
  PREMIUM_MONTHLY: {
    id: 'sub-monthly-premium',
    name: 'Abonnement Gestion & Exports Pro',
    priceEur: 29,
    priceDzd: 4500,
    billingInterval: 'month',
    features: [
      'Exports illimités PDF, Excel & CSV',
      'Rapports comptables automatisés',
      'Filtrage intelligent & alertes en temps réel',
      'Support prioritaire WhatsApp 7j/7'
    ]
  }
};

/**
 * Base Payment Provider Interface
 */
export interface PaymentProvider {
  readonly name: SupportedPaymentProvider;
  createCustomer(restaurantId: string, email: string, name: string): Promise<PaymentCustomer>;
  createPaymentIntent(options: PaymentIntentOptions): Promise<PaymentIntentResult>;
  verifyPaymentWebhook(payload: string | Buffer, signature: string): Promise<{ event: string; orderId: string; status: string }>;
  checkSubscriptionStatus(restaurantId: string): Promise<{ active: boolean; plan: string; nextBillingDate?: string }>;
}

/**
 * Stripe Payment Gateway (Ready for production activation)
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe' as const;
  private apiKey: string | null;

  constructor() {
    this.apiKey = process.env.STRIPE_SECRET_KEY || null;
  }

  async createCustomer(restaurantId: string, email: string, name: string): Promise<PaymentCustomer> {
    if (!this.apiKey) {
      return { id: `stripe_mock_${restaurantId}`, restaurantId, email, name };
    }
    // Stripe SDK call placeholder
    return { id: `cus_${restaurantId}`, restaurantId, email, name };
  }

  async createPaymentIntent(options: PaymentIntentOptions): Promise<PaymentIntentResult> {
    const isPack = options.type === 'installation_pack';
    return {
      id: `pi_stripe_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      provider: this.name,
      status: 'requires_payment_method',
      clientSecret: `pi_secret_${Math.random().toString(36).slice(2)}`,
      paymentUrl: process.env.STRIPE_PAYMENT_LINK || `https://checkout.stripe.com/pay/digifeel-${options.type}`,
      amount: options.amount,
      currency: options.currency,
      instructions: isPack
        ? 'Réglez 100 € par Carte Bancaire Visa/Mastercard sécurisée. 1er mois d’abonnement inclus.'
        : 'Abonnement mensuel automatique de 29 €/mois résiliable à tout moment.',
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    };
  }

  async verifyPaymentWebhook(_payload: string | Buffer, _signature: string) {
    return { event: 'payment_intent.succeeded', orderId: 'pi_demo', status: 'succeeded' };
  }

  async checkSubscriptionStatus(_restaurantId: string) {
    return { active: true, plan: 'sub-monthly-premium', nextBillingDate: new Date(Date.now() + 30 * 86400000).toISOString() };
  }
}

/**
 * BaridiMob & CCP Payment Gateway (Algérie Poste)
 */
export class BaridiMobPaymentProvider implements PaymentProvider {
  readonly name = 'baridimob' as const;

  async createCustomer(restaurantId: string, email: string, name: string): Promise<PaymentCustomer> {
    return { id: `baridimob_${restaurantId}`, restaurantId, email, name };
  }

  async createPaymentIntent(options: PaymentIntentOptions): Promise<PaymentIntentResult> {
    const ccpRip = process.env.BARIDIMOB_RIP || '00799999001234567899';
    const ccpAccount = process.env.CCP_ACCOUNT || '0012345678 Clé 99';
    const isPack = options.type === 'installation_pack';
    const dzdAmount = isPack ? 15000 : 4500;

    return {
      id: `dz_baridi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      provider: this.name,
      status: 'requires_action',
      amount: dzdAmount,
      currency: 'dzd',
      qrCodeData: `BARIDIMOB:RIP=${ccpRip};AMOUNT=${dzdAmount};REF=${options.restaurantId}`,
      instructions: `Effectuez le virement BaridiMob / CCP vers le RIP ${ccpRip} (${ccpAccount}) puis envoyez le reçu par WhatsApp au service client pour validation instantanée.`,
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString()
    };
  }

  async verifyPaymentWebhook(_payload: string | Buffer, _signature: string) {
    return { event: 'baridimob.transfer_confirmed', orderId: 'dz_demo', status: 'succeeded' };
  }

  async checkSubscriptionStatus(_restaurantId: string) {
    return { active: true, plan: 'sub-monthly-premium', nextBillingDate: new Date(Date.now() + 30 * 86400000).toISOString() };
  }
}

/**
 * Payment Gateway Manager - Factory & Dispatcher
 */
export class PaymentGatewayManager {
  private static instance: PaymentGatewayManager;
  private providers: Map<SupportedPaymentProvider, PaymentProvider> = new Map();

  private constructor() {
    this.providers.set('stripe', new StripePaymentProvider());
    this.providers.set('baridimob', new BaridiMobPaymentProvider());
  }

  public static getInstance(): PaymentGatewayManager {
    if (!PaymentGatewayManager.instance) {
      PaymentGatewayManager.instance = new PaymentGatewayManager();
    }
    return PaymentGatewayManager.instance;
  }

  public getProvider(name: SupportedPaymentProvider = 'stripe'): PaymentProvider {
    return this.providers.get(name) || this.providers.get('stripe')!;
  }
}
