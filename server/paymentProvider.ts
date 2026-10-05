import Stripe from 'stripe';

export interface CheckoutRequest {
  restaurantId: string;
  restaurantName: string;
  email: string;
  customerId?: string | null;
  transactionId: string;
  transactionType: 'installation' | 'subscription' | 'tip';
  amountEuros: number;
  productName: string;
  trialDays: number;
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentProvider {
  createCheckout(request: CheckoutRequest): Promise<string>;
  createPortal(customerId: string, returnUrl: string): Promise<string>;
}

export class StripeTestPaymentProvider implements PaymentProvider {
  constructor(private readonly stripe: Stripe) {}

  async createCheckout(request: CheckoutRequest): Promise<string> {
    const isSubscription = request.transactionType === 'subscription';
    const session = await this.stripe.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      ...(request.customerId
        ? { customer: request.customerId }
        : request.email ? { customer_email: request.email } : {}),
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(request.amountEuros * 100),
          product_data: {
            name: request.productName
          },
          ...(isSubscription ? { recurring: { interval: 'month' as const } } : {})
        },
        quantity: 1
      }],
      metadata: {
        restaurantId: request.restaurantId,
        transactionId: request.transactionId,
        transactionType: request.transactionType
      },
      ...(isSubscription ? {
        subscription_data: {
          ...(request.trialDays > 0 ? { trial_period_days: request.trialDays } : {}),
          metadata: { restaurantId: request.restaurantId }
        }
      } : {}),
      success_url: request.successUrl,
      cancel_url: request.cancelUrl
    });
    if (!session.url) throw new Error('Stripe n’a pas fourni de lien Checkout.');
    return session.url;
  }

  async createPortal(customerId: string, returnUrl: string): Promise<string> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });
    return session.url;
  }
}
