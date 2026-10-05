export interface PaymentCheckoutRequest {
  restaurantId: string;
  amountMinor: number;
  currency: 'EUR' | 'DZD';
  description: string;
}

export interface PaymentCheckoutResult {
  provider: string;
  checkoutUrl: string;
  providerReference: string;
}

export interface PaymentProvider {
  createCheckout(request: PaymentCheckoutRequest): Promise<PaymentCheckoutResult>;
  verifyWebhook(payload: string, signature: string): Promise<boolean>;
}

export class PaymentNotConfiguredError extends Error {
  constructor() {
    super('Aucun prestataire de paiement n’est encore activé.');
    this.name = 'PaymentNotConfiguredError';
  }
}

export function getPaymentProvider(): PaymentProvider {
  throw new PaymentNotConfiguredError();
}
