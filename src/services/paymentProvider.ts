export type PaymentMethod = 'simulation' | 'cash' | 'card' | 'local_manual';
export type PaymentStatus = 'paid' | 'pending_manual';

export interface PaymentResult {
  provider: 'simulation' | 'local_manual';
  status: PaymentStatus;
  reference: string;
  amount: number;
  currency: 'EUR' | 'DZD';
}

export interface PaymentProvider {
  charge(input: { amount: number; currency: 'EUR' | 'DZD'; method: PaymentMethod; description: string }): Promise<PaymentResult>;
}

export const paymentProvider: PaymentProvider = {
  async charge({ amount, currency, method }) {
    if (!Number.isFinite(amount) || amount < 0) throw new Error('Le montant du paiement est invalide.');
    if (method === 'local_manual') {
      return { provider: 'local_manual', status: 'pending_manual', reference: `LOCAL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, amount, currency };
    }
    return { provider: 'simulation', status: 'paid', reference: `SIM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, amount, currency };
  }
};
