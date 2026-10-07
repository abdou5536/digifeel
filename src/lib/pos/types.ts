export type PaymentMethod = 'cash' | 'card' | 'baridimob';

export interface PosProduct {
  id: string;
  name: string;
  category: string;
  price_dzd: number;
  active: boolean;
  updated_at: string;
}

export interface PosCatalog {
  userId: string;
  restaurant: { id: string; name: string };
  role: 'restaurant_admin' | 'server';
  products: PosProduct[];
}

export interface PosSaleLine {
  productId: string;
  productName: string;
  quantity: number;
  priceDzd: number;
}

export interface LocalPosSale {
  id: string;
  ownerId: string;
  items: PosSaleLine[];
  paymentMethod: PaymentMethod;
  paymentReference: string;
  syncSource: 'online' | 'offline';
  createdAt: string;
  status: 'pending' | 'synced' | 'conflict';
  error?: string;
  voidedAt?: string | null;
  voidReason?: string | null;
}

export interface PosSaleRecord {
  id: string;
  total_dzd: number;
  payment_method: PaymentMethod;
  payment_reference: string | null;
  sync_source: 'online' | 'offline';
  sold_at: string;
  voided_at?: string | null;
  void_reason?: string | null;
  pos_sale_items: Array<{
    product_name: string;
    quantity: number;
    unit_price_dzd: number;
    line_total_dzd: number;
  }>;
}

export function totalSaleDzd(items: PosSaleLine[]) {
  return items.reduce((total, item) => total + item.priceDzd * item.quantity, 0);
}
