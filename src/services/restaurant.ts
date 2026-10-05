export type RestaurantRole = 'super_admin' | 'admin_restaurant' | 'manager' | 'serveur' | 'cuisine';
export type BillStatus = 'draft' | 'open' | 'paid';
export type TableStatus = 'free' | 'occupied' | 'server_called' | 'bill_requested' | 'paid';
export type PaymentMode = 'card' | 'cash' | 'baridimob' | 'terminal';
export type OrderStatus = 'pending' | 'new' | 'preparing' | 'ready' | 'served' | 'rejected';

export interface StaffPermissions {
  manageMenu: boolean;
  manageReviews: boolean;
  manageCash: boolean;
}

export interface RestaurantUser {
  id: string;
  restaurantId: string;
  name: string;
  role: Exclude<RestaurantRole, 'super_admin'>;
  title?: string;
  active: boolean;
  pin: string;
  permissions?: StaffPermissions;
}

export interface RestaurantTable {
  id: string;
  restaurantId: string;
  name: string;
  zone: string;
  status: TableStatus;
  tagCode: string;
  active: boolean;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  price: number;
  taxRate: number;
  available: boolean;
  description?: string;
  photoUrl?: string;
  allergens?: string[];
  vegetarian?: boolean;
  glutenFree?: boolean;
  translations?: Partial<Record<'fr' | 'ar' | 'en', { name: string; description: string }>>;
}

export interface BillLine {
  id: string;
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  note: string;
}

export interface Bill {
  id: string;
  restaurantId: string;
  tableId: string;
  waiterId: string;
  status: BillStatus;
  lines: BillLine[];
  quickTotal: number | null;
  discountPercent: number;
  createdAt: string;
  updatedAt: string;
  clientVisible: boolean;
  currency: 'EUR' | 'DZD';
  reviewOnly?: boolean;
  loyaltyCustomerId?: string;
  loyaltyAwarded?: boolean;
}

export interface Payment {
  id: string;
  restaurantId: string;
  billId: string;
  amount: number;
  mode: PaymentMode;
  status: 'paid' | 'pending' | 'manual';
  createdAt: string;
  reference: string;
}

export interface Tip {
  id: string;
  restaurantId: string;
  billId: string;
  waiterId: string;
  amount: number;
  currency: 'EUR' | 'DZD';
  status: 'paid' | 'pending' | 'manual';
  createdAt: string;
  pooled?: boolean;
}

export interface RestaurantReview {
  id: string;
  restaurantId: string;
  billId: string;
  tableId: string;
  waiterId: string;
  stars: number;
  comment: string;
  treated: boolean;
  createdAt: string;
  criteria?: Partial<Record<'dish' | 'service' | 'ambiance' | 'cleanliness', number>>;
  deviceFingerprint?: string;
}

export interface StarBonusTier {
  id: string;
  increase: number;
  amountEUR: number;
  active: boolean;
}

export interface StarBonusConfig {
  tiers: StarBonusTier[];
  mode: 'cumulative' | 'highest_only';
  monthlyCapEUR: number;
  minimumObservationDays: number;
  monthlySubscriptionEUR: number;
  monthEndFreshnessDays: number;
  anomalyWindowHours: number;
  anomalyReviewLimit: number;
  sameDeviceReviewLimit: number;
}

export interface GoogleRatingSnapshot {
  id: string;
  restaurantId: string;
  rating: number;
  reviewCount: number;
  observedAt: string;
  source: 'google_places' | 'manual' | 'demo';
  googleReviewUrl: string;
}

export interface StarBonusBaseline {
  restaurantId: string;
  rating: number | null;
  reviewCount: number | null;
  establishedAt: string;
  googleReviewUrl: string;
  updatedBy: 'super_admin';
}

export interface StarBonusAnomaly {
  id: string;
  restaurantId: string;
  kind: 'review_spike' | 'same_device';
  reviewCount: number;
  windowHours: number;
  deviceReviewCount: number;
  detectedAt: string;
  status: 'blocked' | 'verified';
  verifiedAt?: string;
}

export interface StarBonusInvoice {
  id: string;
  invoiceNumber: string;
  restaurantId: string;
  period: string;
  subscriptionEUR: number;
  bonusEUR: number;
  totalEUR: number;
  baselineRating: number | null;
  currentRating: number | null;
  reviewCount: number | null;
  increase: number;
  lines: Array<{ tierId: string; increase: number; amountEUR: number }>;
  status: 'example' | 'validated' | 'paid' | 'pending_manual';
  createdAt: string;
  providerReference?: string;
}

export interface StarBonusData {
  config: StarBonusConfig;
  baselines: StarBonusBaseline[];
  snapshots: GoogleRatingSnapshot[];
  invoices: StarBonusInvoice[];
  anomalies: StarBonusAnomaly[];
  billedTierIds: Record<string, string[]>;
}

export interface RestaurantOrder {
  id: string;
  restaurantId: string;
  tableId: string;
  waiterId: string;
  billId: string | null;
  status: OrderStatus;
  lines: Array<{ itemId: string; name: string; quantity: number; unitPrice: number; taxRate: number; note: string }>;
  customerNote: string;
  createdAt: string;
  updatedAt: string;
  readyAt: string | null;
}

export interface RestaurantAlert {
  id: string;
  restaurantId: string;
  tableId: string | null;
  orderId: string | null;
  reviewId: string | null;
  kind: 'call_server' | 'bill_request' | 'order_ready' | 'low_review';
  message: string;
  status: 'new' | 'acknowledged';
  createdAt: string;
}

export interface RestaurantActivity {
  id: string;
  restaurantId: string;
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
}

export interface LoyaltyReward {
  id: string;
  label: string;
  points: number;
}

export interface LoyaltyAccount {
  id: string;
  restaurantId: string;
  contact: string;
  name: string;
  points: number;
  visits: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralRecord {
  id: string;
  code: string;
  referrerRestaurantId: string;
  referredRestaurantId: string;
  status: 'rewarded';
  rewardedAt: string;
}

export type ResellerStatus = 'pending' | 'approved' | 'rejected';
export type ResellerCommissionStatus = 'payable' | 'paid';

export interface ResellerProfile {
  id: string;
  name: string;
  email: string;
  city: string;
  status: ResellerStatus;
  code: string | null;
  createdAt: string;
  approvedAt?: string;
}

export interface ResellerCommissionConfig {
  ratePercent: number;
  durationMonths: number;
  capEUR: number | null;
}

export interface ResellerPlatformPayment {
  id: string;
  resellerId: string;
  restaurantId: string;
  amountEUR: number;
  kind: 'installation' | 'subscription' | 'other';
  reference: string;
  status: 'pending' | 'validated' | 'rejected';
  createdAt: string;
  validatedAt?: string;
}

export interface ResellerCommission {
  id: string;
  resellerId: string;
  restaurantId: string;
  paymentId: string;
  month: string;
  amountEUR: number;
  status: ResellerCommissionStatus;
  createdAt: string;
  paidAt?: string;
  payoutId?: string;
}

export interface ResellerPayout {
  id: string;
  resellerId: string;
  month: string;
  amountEUR: number;
  status: 'pending' | 'paid';
  createdAt: string;
  paidAt?: string;
}

export interface ResellerProspect {
  id: string;
  resellerId: string;
  name: string;
  city: string;
  contact: string;
  followUpAt: string;
  status: 'prospect' | 'demo' | 'installed' | 'active' | 'terminated';
  createdAt: string;
}

export interface ResellerPaymentInput {
  restaurantId: string;
  amountEUR: number;
  kind: ResellerPlatformPayment['kind'];
  reference: string;
  status: ResellerPlatformPayment['status'];
}

export interface Scan {
  id: string;
  restaurantId: string;
  tableId: string;
  tagCode: string;
  createdAt: string;
}

export interface RestaurantAccount {
  id: string;
  name: string;
  address: string;
  city: string;
  googleReviewUrl: string;
  currency: 'EUR' | 'DZD';
  taxRate: number;
  logoUrl: string;
  accentColor: string;
  subscriptionStatus: 'trialing' | 'active' | 'suspended';
  trialEndsAt: string;
  createdAt: string;
  tipMode?: 'individual' | 'pool';
  tipAlertMinutes?: number;
  kitchenAlertMinutes?: number;
  referralCode?: string;
  referredBy?: string;
  resellerId?: string;
  installationAmountEUR?: number;
  referralRewardApplied?: boolean;
  loyalty?: { enabled: boolean; pointsPerVisit: number; rewards: LoyaltyReward[] };
  ownerGroupId?: string;
}

export interface Tag {
  code: string;
  restaurantId: string | null;
  tableId: string | null;
  active: boolean;
  createdAt: string;
}

export interface RestaurantData {
  version: 1;
  packPrices: number[];
  restaurants: RestaurantAccount[];
  users: RestaurantUser[];
  tags: Tag[];
  tables: RestaurantTable[];
  categories: MenuCategory[];
  items: MenuItem[];
  bills: Bill[];
  payments: Payment[];
  tips: Tip[];
  reviews: RestaurantReview[];
  scans: Scan[];
  orders: RestaurantOrder[];
  alerts: RestaurantAlert[];
  activity: RestaurantActivity[];
  loyaltyAccounts: LoyaltyAccount[];
  referrals: ReferralRecord[];
  resellers: ResellerProfile[];
  resellerCommissionConfig: ResellerCommissionConfig;
  resellerPayments: ResellerPlatformPayment[];
  resellerCommissions: ResellerCommission[];
  resellerPayouts: ResellerPayout[];
  resellerProspects: ResellerProspect[];
  starBonus: StarBonusData;
}

export interface Totals {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paid: number;
  balance: number;
}

const STORAGE_KEY = 'digifeel-restaurant-workspace-v1';
const CHANGE_EVENT = 'digifeel:restaurant-data-changed';
const demoRestaurantId = 'rest-palmier';
const demoWaiters = [
  { id: 'waiter-amina', name: 'Amina Benali', role: 'Serveuse', active: true, pin: '2401' },
  { id: 'waiter-yacine', name: 'Yacine Haddad', role: 'Chef de rang', active: true, pin: '2402' },
  { id: 'waiter-ines', name: 'Inès Cherif', role: 'Serveuse', active: true, pin: '2403' },
  { id: 'waiter-karim', name: 'Karim Mansouri', role: 'Serveur', active: true, pin: '2404' }
];

const seedWords = [
  'Service attentionné et assiettes généreuses.',
  'Très belle découverte, nous reviendrons.',
  'Cuisine savoureuse, accueil chaleureux.',
  'Un déjeuner agréable et bien servi.',
  'Le plat était excellent, merci à l’équipe.',
  'Cadre soigné et service efficace.',
  'Bon rapport qualité-prix, belle adresse.',
  'Une petite attente mais un très bon repas.',
  'Très bon accueil, dessert délicieux.',
  'Ambiance agréable et produits frais.'
];

function dateDaysAgo(days: number, hour = 12) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, (days * 13) % 60, 0, 0);
  return date.toISOString();
}

function monthEndMonthsAgo(monthsAgo: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo + 1, 0, 23, 59, 59)).toISOString();
}

function defaultStarBonusConfig(): StarBonusConfig {
  return {
    tiers: [
      { id: 'tier-half-star', increase: 0.5, amountEUR: 9, active: true },
      { id: 'tier-one-star', increase: 1, amountEUR: 11, active: true },
      { id: 'tier-three-stars', increase: 3, amountEUR: 28.99, active: true }
    ],
    mode: 'highest_only',
    monthlyCapEUR: 100,
    minimumObservationDays: 30,
    monthlySubscriptionEUR: 0,
    monthEndFreshnessDays: 7,
    anomalyWindowHours: 2,
    anomalyReviewLimit: 10,
    sameDeviceReviewLimit: 3
  };
}

function createStarBonusSeed(): StarBonusData {
  const restaurantId = demoRestaurantId;
  const googleReviewUrl = 'https://www.google.com/search?q=Le+Palmier+Alger+avis';
  const baselineAt = monthEndMonthsAgo(4);
  const snapshots: GoogleRatingSnapshot[] = [
    { id: 'rating-demo-0', restaurantId, rating: 3.8, reviewCount: 118, observedAt: baselineAt, source: 'demo', googleReviewUrl },
    { id: 'rating-demo-1', restaurantId, rating: 4.0, reviewCount: 134, observedAt: monthEndMonthsAgo(3), source: 'demo', googleReviewUrl },
    { id: 'rating-demo-2', restaurantId, rating: 4.2, reviewCount: 151, observedAt: monthEndMonthsAgo(2), source: 'demo', googleReviewUrl },
    { id: 'rating-demo-3', restaurantId, rating: 4.4, reviewCount: 171, observedAt: monthEndMonthsAgo(1), source: 'demo', googleReviewUrl },
    { id: 'rating-demo-4', restaurantId, rating: 4.6, reviewCount: 196, observedAt: new Date().toISOString(), source: 'demo', googleReviewUrl }
  ];
  const sampleInvoice: StarBonusInvoice = {
    id: 'invoice-demo-star-bonus',
    invoiceNumber: 'DGF-PRIME-DEMO-001',
    restaurantId,
    period: monthEndMonthsAgo(1).slice(0, 7),
    subscriptionEUR: 0,
    bonusEUR: 9,
    totalEUR: 9,
    baselineRating: 3.8,
    currentRating: 4.4,
    reviewCount: 171,
    increase: 0.6,
    lines: [{ tierId: 'tier-half-star', increase: 0.5, amountEUR: 9 }],
    status: 'example',
    createdAt: monthEndMonthsAgo(1)
  };
  return {
    config: defaultStarBonusConfig(),
    baselines: [{ restaurantId, rating: 3.8, reviewCount: 118, establishedAt: baselineAt, googleReviewUrl, updatedBy: 'super_admin' }],
    snapshots,
    invoices: [sampleInvoice],
    anomalies: [],
    billedTierIds: {}
  };
}

function makeSeedData(): RestaurantData {
  const categories: MenuCategory[] = [
    { id: 'cat-entrees', restaurantId: demoRestaurantId, name: 'Entrées', sortOrder: 1 },
    { id: 'cat-plats', restaurantId: demoRestaurantId, name: 'Plats', sortOrder: 2 },
    { id: 'cat-desserts', restaurantId: demoRestaurantId, name: 'Desserts', sortOrder: 3 },
    { id: 'cat-boissons', restaurantId: demoRestaurantId, name: 'Boissons', sortOrder: 4 }
  ];
  const items: MenuItem[] = [
    ['item-mechouia', 'Salade méchouia', 'cat-entrees', 650],
    ['item-bourek', 'Bourek maison', 'cat-entrees', 500],
    ['item-couscous', 'Couscous du Palmier', 'cat-plats', 1800],
    ['item-tajine', 'Tajine zitoune', 'cat-plats', 1650],
    ['item-grillade', 'Grillade du chef', 'cat-plats', 2200],
    ['item-tiramisu', 'Tiramisu maison', 'cat-desserts', 550],
    ['item-the', 'Thé à la menthe', 'cat-boissons', 200],
    ['item-eau', 'Eau minérale', 'cat-boissons', 120]
  ].map(([id, name, categoryId, price]) => ({
    id: String(id), name: String(name), categoryId: String(categoryId), price: Number(price), taxRate: 9, available: true, restaurantId: demoRestaurantId,
    description: `Préparé maison avec des produits frais.`, photoUrl: '', allergens: [], vegetarian: String(id) === 'item-mechouia' || String(id) === 'item-tiramisu',
    glutenFree: String(id) === 'item-mechouia' || String(id) === 'item-eau',
    translations: {
      en: { name: String(name), description: 'Made in-house with fresh ingredients.' },
      ar: { name: String(name), description: 'محضّر في المطعم بمكونات طازجة.' }
    }
  }));
  const tables: RestaurantTable[] = Array.from({ length: 12 }, (_, index) => ({
    id: `table-${index + 1}`,
    restaurantId: demoRestaurantId,
    name: `Table ${String(index + 1).padStart(2, '0')}`,
    zone: index < 8 ? 'Salle' : 'Terrasse',
    status: index === 1 || index === 5 ? 'bill_requested' : index === 2 || index === 7 || index === 9 ? 'occupied' : index === 3 ? 'paid' : 'free',
    tagCode: `PALM-${String(index + 1).padStart(4, '0')}`,
    active: true
  }));
  const restaurants: RestaurantAccount[] = [{
    id: demoRestaurantId,
    name: 'Le Palmier',
    address: '12 rue Didouche Mourad',
    city: 'Alger Centre',
    googleReviewUrl: 'https://www.google.com/search?q=Le+Palmier+Alger+avis',
    currency: 'DZD',
    taxRate: 9,
    logoUrl: '',
    accentColor: '#c99445',
    subscriptionStatus: 'trialing',
    trialEndsAt: dateDaysAgo(-20),
    createdAt: dateDaysAgo(140),
    ownerGroupId: 'group-palmier',
    tipMode: 'individual',
    tipAlertMinutes: 12,
    kitchenAlertMinutes: 12,
    referralCode: 'PALMIER-7K4Q',
    resellerId: 'reseller-demo-karim',
    installationAmountEUR: 100,
    loyalty: { enabled: true, pointsPerVisit: 10, rewards: [{ id: 'reward-coffee', label: 'Thé offert', points: 50 }, { id: 'reward-dessert', label: 'Dessert offert', points: 100 }] }
  }];
  const users: RestaurantUser[] = [
    { id: 'owner-palmier', restaurantId: demoRestaurantId, name: 'Nadia Bensalem', role: 'admin_restaurant', active: true, pin: '2025' },
    ...demoWaiters.map(waiter => ({ ...waiter, restaurantId: demoRestaurantId, title: waiter.role, role: 'serveur' as const }))
  ];
  const bills: Bill[] = [];
  const payments: Payment[] = [];
  const tips: Tip[] = [];
  for (let index = 0; index < 28; index += 1) {
    const day = index % 14;
    const table = tables[(index * 3) % tables.length];
    const waiter = demoWaiters[index % demoWaiters.length];
    const item = items[(index * 5) % items.length];
    const secondItem = items[(index * 5 + 3) % items.length];
    const createdAt = dateDaysAgo(day, [12, 13, 14, 19, 20][index % 5]);
    const bill: Bill = {
      id: `bill-seed-${index + 1}`,
      restaurantId: demoRestaurantId,
      tableId: table.id,
      waiterId: waiter.id,
      status: 'paid',
      lines: [
        { id: `line-${index}-a`, itemId: item.id, name: item.name, quantity: index % 3 + 1, unitPrice: item.price, taxRate: item.taxRate, note: '' },
        { id: `line-${index}-b`, itemId: secondItem.id, name: secondItem.name, quantity: 1, unitPrice: secondItem.price, taxRate: secondItem.taxRate, note: index % 4 === 0 ? 'Sans oignon' : '' }
      ],
      quickTotal: null,
      discountPercent: index % 7 === 0 ? 5 : 0,
      createdAt,
      updatedAt: createdAt,
      clientVisible: true,
      currency: 'DZD'
    };
    const total = billTotals(bill).total;
    bills.push(bill);
    payments.push({ id: `payment-seed-${index}`, restaurantId: demoRestaurantId, billId: bill.id, amount: total, mode: (['cash', 'terminal', 'baridimob'] as PaymentMode[])[index % 3], status: 'paid', createdAt, reference: '' });
    if (index % 2 === 0) tips.push({ id: `tip-seed-${index}`, restaurantId: demoRestaurantId, billId: bill.id, waiterId: waiter.id, amount: 100 + index * 10, currency: 'DZD', status: 'paid', createdAt, pooled: index % 4 === 0 });
  }
  const reviews: RestaurantReview[] = Array.from({ length: 80 }, (_, index) => {
    const bill = bills[index % bills.length];
    const rating = index % 17 === 0 ? 1 : index % 11 === 0 ? 2 : index % 8 === 0 ? 3 : index % 4 === 0 ? 4 : 5;
    return {
      id: `review-seed-${index + 1}`,
      restaurantId: demoRestaurantId,
      billId: bill.id,
      tableId: bill.tableId,
      waiterId: bill.waiterId,
      stars: rating,
      comment: rating <= 2
        ? ['Attente trop longue avant la prise de commande.', 'Le plat est arrivé tiède.', 'Service à améliorer, malgré une cuisine correcte.'][index % 3]
        : seedWords[index % seedWords.length],
      treated: index % 5 === 0,
      createdAt: dateDaysAgo(index % 90, [12, 13, 14, 18, 20][index % 5]),
      criteria: { dish: rating, service: index % 3 === 0 ? Math.max(1, rating - 1) : rating, ambiance: Math.min(5, rating + 1), cleanliness: rating }
    };
  });
  const scans = Array.from({ length: 210 }, (_, index) => {
    const table = tables[index % tables.length];
    return { id: `scan-seed-${index + 1}`, restaurantId: demoRestaurantId, tableId: table.id, tagCode: table.tagCode, createdAt: dateDaysAgo(index % 30, [11, 12, 13, 14, 19, 20, 21][index % 7]) };
  });
  const tags = tables.map(table => ({ code: table.tagCode, restaurantId: demoRestaurantId, tableId: table.id, active: true, createdAt: dateDaysAgo(100) }));
  const orders: RestaurantOrder[] = Array.from({ length: 8 }, (_, index) => {
    const table = tables[index % tables.length];
    const item = items[(index * 3) % items.length];
    const status: OrderStatus = ['pending', 'new', 'preparing', 'ready', 'new', 'preparing', 'ready', 'served'][index] as OrderStatus;
    const createdAt = new Date(Date.now() - [2, 5, 18, 4, 9, 33, 7, 55][index] * 60000).toISOString();
    return {
      id: `order-seed-${index + 1}`, restaurantId: demoRestaurantId, tableId: table.id, waiterId: demoWaiters[index % demoWaiters.length].id,
      billId: bills[index % bills.length].id, status, lines: [{ itemId: item.id, name: item.name, quantity: index % 2 + 1, unitPrice: item.price, taxRate: item.taxRate, note: index % 3 === 0 ? 'Sans oignon' : '' }],
      customerNote: index % 2 === 0 ? 'Merci de servir chaud.' : '', createdAt, updatedAt: createdAt, readyAt: status === 'ready' ? createdAt : null
    };
  });
  const alerts: RestaurantAlert[] = [
    { id: 'alert-seed-call', restaurantId: demoRestaurantId, tableId: tables[0].id, orderId: null, reviewId: null, kind: 'call_server', message: 'Un client appelle le serveur.', status: 'new', createdAt: new Date(Date.now() - 3 * 60000).toISOString() },
    { id: 'alert-seed-bill', restaurantId: demoRestaurantId, tableId: tables[1].id, orderId: null, reviewId: null, kind: 'bill_request', message: 'Addition demandée.', status: 'new', createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
    { id: 'alert-seed-review', restaurantId: demoRestaurantId, tableId: tables[2].id, orderId: null, reviewId: reviews[0].id, kind: 'low_review', message: 'Nouvel avis à 1 étoile.', status: 'new', createdAt: new Date(Date.now() - 8 * 60000).toISOString() }
  ];
  const activity: RestaurantActivity[] = Array.from({ length: 12 }, (_, index) => ({
    id: `activity-seed-${index}`, restaurantId: demoRestaurantId, actorId: demoWaiters[index % demoWaiters.length].id,
    actorName: demoWaiters[index % demoWaiters.length].name, action: ['a ajouté un plat', 'a mis à jour le menu', 'a envoyé une addition', 'a traité un avis'][index % 4],
    entity: ['addition', 'menu', 'table', 'avis'][index % 4], entityId: `DF-${index + 1}`, createdAt: dateDaysAgo(index, 11 + index % 9)
  }));
  const loyaltyAccounts: LoyaltyAccount[] = [
    { id: 'loyalty-seed-1', restaurantId: demoRestaurantId, contact: '+213555000111', name: 'Samir A.', points: 80, visits: 8, createdAt: dateDaysAgo(80), updatedAt: dateDaysAgo(2) },
    { id: 'loyalty-seed-2', restaurantId: demoRestaurantId, contact: 'lina@example.com', name: 'Lina B.', points: 30, visits: 3, createdAt: dateDaysAgo(35), updatedAt: dateDaysAgo(5) }
  ];
  const resellerPaymentCreatedAt = dateDaysAgo(55);
  const resellerPayment: ResellerPlatformPayment = {
    id: 'reseller-payment-demo-palmier', resellerId: 'reseller-demo-karim', restaurantId: demoRestaurantId,
    amountEUR: 100, kind: 'installation', reference: 'DEMO-INSTALL-PALMIER', status: 'validated',
    createdAt: resellerPaymentCreatedAt, validatedAt: resellerPaymentCreatedAt
  };
  return {
    version: 1, packPrices: [100, 90, 60], restaurants, users, tags, tables, categories, items, bills, payments, tips, reviews, scans,
    orders, alerts, activity, loyaltyAccounts, referrals: [],
    resellers: [{
      id: 'reseller-demo-karim', name: 'Karim Bensaïd', email: 'karim.demo@digifeel.app', city: 'Alger',
      status: 'approved', code: 'DGF-AGENT-7K4M', createdAt: dateDaysAgo(120), approvedAt: dateDaysAgo(119)
    }],
    resellerCommissionConfig: { ratePercent: 25, durationMonths: 12, capEUR: null },
    resellerPayments: [resellerPayment],
    resellerCommissions: [{
      id: 'reseller-commission-demo-palmier', resellerId: 'reseller-demo-karim', restaurantId: demoRestaurantId,
      paymentId: resellerPayment.id, month: resellerPaymentCreatedAt.slice(0, 7), amountEUR: 25,
      status: 'payable', createdAt: resellerPaymentCreatedAt
    }],
    resellerPayouts: [],
    resellerProspects: [],
    starBonus: createStarBonusSeed()
  };
}

export function billTotals(bill: Bill, payments: Payment[] = []): Totals {
  const subtotalBeforeDiscount = bill.quickTotal ?? bill.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const discount = Math.round(subtotalBeforeDiscount * bill.discountPercent / 100);
  const subtotal = Math.max(0, subtotalBeforeDiscount - discount);
  const tax = bill.quickTotal === null
    ? Math.round(bill.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice * line.taxRate / 100, 0) * (1 - bill.discountPercent / 100))
    : 0;
  const total = subtotal + tax;
  const paid = payments.filter(payment => payment.billId === bill.id && payment.status === 'paid').reduce((sum, payment) => sum + payment.amount, 0);
  return { subtotal, tax, discount, total, paid, balance: Math.max(0, total - paid) };
}

function isRestaurantData(value: unknown): value is RestaurantData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<RestaurantData>;
  return data.version === 1 && Array.isArray(data.restaurants) && Array.isArray(data.users) && Array.isArray(data.tables) &&
    Array.isArray(data.bills) && Array.isArray(data.items) && Array.isArray(data.reviews);
}

function notifyChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

function uniqueTagCode(data: RestaurantData, prefix: 'DF' | 'DG') {
  let code = '';
  do {
    code = `${prefix}-${crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`;
  } while (data.tags.some(tag => tag.code === code));
  return code;
}

function readData(): RestaurantData {
  if (typeof window === 'undefined') return makeSeedData();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (isRestaurantData(parsed)) {
        const legacyResellerData = !Array.isArray(parsed.resellers);
        if (!Array.isArray(parsed.packPrices)) parsed.packPrices = [100, 90, 60];
        if (!Array.isArray(parsed.orders)) parsed.orders = [];
        if (!Array.isArray(parsed.alerts)) parsed.alerts = [];
        if (!Array.isArray(parsed.activity)) parsed.activity = [];
        if (!Array.isArray(parsed.loyaltyAccounts)) parsed.loyaltyAccounts = [];
        if (!Array.isArray(parsed.referrals)) parsed.referrals = [];
        if (legacyResellerData) {
          const demoRestaurant = parsed.restaurants.find(item => item.id === demoRestaurantId);
          parsed.resellers = demoRestaurant ? [{
            id: 'reseller-demo-karim', name: 'Karim Bensaïd', email: 'karim.demo@digifeel.app', city: 'Alger',
            status: 'approved', code: 'DGF-AGENT-7K4M', createdAt: dateDaysAgo(120), approvedAt: dateDaysAgo(119)
          }] : [];
          if (demoRestaurant && !demoRestaurant.resellerId) {
            demoRestaurant.resellerId = 'reseller-demo-karim';
            demoRestaurant.installationAmountEUR = 100;
            const demoPaymentAt = dateDaysAgo(55);
            parsed.resellerPayments = [{
              id: 'reseller-payment-demo-palmier', resellerId: 'reseller-demo-karim', restaurantId: demoRestaurant.id,
              amountEUR: 100, kind: 'installation', reference: 'DEMO-INSTALL-PALMIER', status: 'validated',
              createdAt: demoPaymentAt, validatedAt: demoPaymentAt
            }];
            parsed.resellerCommissions = [{
              id: 'reseller-commission-demo-palmier', resellerId: 'reseller-demo-karim', restaurantId: demoRestaurant.id,
              paymentId: 'reseller-payment-demo-palmier', month: demoPaymentAt.slice(0, 7), amountEUR: 25,
              status: 'payable', createdAt: demoPaymentAt
            }];
          }
        }
        if (!parsed.resellerCommissionConfig) parsed.resellerCommissionConfig = { ratePercent: 25, durationMonths: 12, capEUR: null };
        if (!Array.isArray(parsed.resellerPayments)) parsed.resellerPayments = [];
        if (!Array.isArray(parsed.resellerCommissions)) parsed.resellerCommissions = [];
        if (!Array.isArray(parsed.resellerPayouts)) parsed.resellerPayouts = [];
        if (!Array.isArray(parsed.resellerProspects)) parsed.resellerProspects = [];
        if (!parsed.starBonus || typeof parsed.starBonus !== 'object') {
          const defaults = defaultStarBonusConfig();
          const demoRestaurant = parsed.restaurants.find(restaurant => restaurant.id === demoRestaurantId);
          parsed.starBonus = {
            config: defaults,
            baselines: parsed.restaurants.map(restaurant => restaurant.id === demoRestaurantId && demoRestaurant
              ? createStarBonusSeed().baselines[0]
              : { restaurantId: restaurant.id, rating: null, reviewCount: null, establishedAt: restaurant.createdAt, googleReviewUrl: restaurant.googleReviewUrl, updatedBy: 'super_admin' as const }),
            snapshots: demoRestaurant ? createStarBonusSeed().snapshots : [],
            invoices: demoRestaurant ? createStarBonusSeed().invoices : [],
            anomalies: [],
            billedTierIds: {}
          };
        } else {
          parsed.starBonus.config = { ...defaultStarBonusConfig(), ...parsed.starBonus.config };
          parsed.starBonus.baselines ??= [];
          parsed.starBonus.snapshots ??= [];
          parsed.starBonus.invoices = (parsed.starBonus.invoices ?? []).map(invoice => ({
            ...invoice,
            baselineRating: invoice.baselineRating ?? null,
            currentRating: invoice.currentRating ?? null,
            reviewCount: invoice.reviewCount ?? null,
            increase: invoice.increase ?? 0
          }));
          parsed.starBonus.anomalies ??= [];
          parsed.starBonus.billedTierIds ??= {};
          for (const restaurant of parsed.restaurants) {
            if (!parsed.starBonus.baselines.some(item => item.restaurantId === restaurant.id)) {
              parsed.starBonus.baselines.push({
                restaurantId: restaurant.id, rating: null, reviewCount: null,
                establishedAt: restaurant.createdAt, googleReviewUrl: restaurant.googleReviewUrl, updatedBy: 'super_admin'
              });
            }
          }
        }
        parsed.users = parsed.users.map(user => ({
          ...user,
          permissions: user.permissions ?? { manageMenu: false, manageReviews: true, manageCash: true }
        }));
        parsed.restaurants = parsed.restaurants.map(restaurant => ({
          ...restaurant,
          tipMode: restaurant.tipMode ?? 'individual',
          tipAlertMinutes: restaurant.tipAlertMinutes ?? 15,
          kitchenAlertMinutes: restaurant.kitchenAlertMinutes ?? 12,
          loyalty: restaurant.loyalty ?? { enabled: false, pointsPerVisit: 10, rewards: [] }
        }));
        parsed.items = parsed.items.map(item => ({
          ...item,
          description: item.description ?? '',
          photoUrl: item.photoUrl ?? '',
          allergens: item.allergens ?? [],
          vegetarian: item.vegetarian ?? false,
          glutenFree: item.glutenFree ?? false
        }));
        return parsed;
      }
    }
  } catch (error) {
    console.error('Données Digifeel locales illisibles.', error);
  }
  const initial = makeSeedData();
  writeData(initial);
  return initial;
}

function writeData(data: RestaurantData) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    notifyChange();
  } catch (error) {
    console.error('Données Digifeel locales non enregistrées.', error);
    throw new Error('Le stockage local est plein ou indisponible. Exportez les données avant de continuer.');
  }
}

function recordActivity(data: RestaurantData, restaurantId: string, action: string, entity: string, entityId: string, actorId = '') {
  const actor = data.users.find(user => user.id === actorId && user.restaurantId === restaurantId);
  const owner = data.users.find(user => user.restaurantId === restaurantId && user.role === 'admin_restaurant');
  data.activity.unshift({
    id: crypto.randomUUID(), restaurantId, actorId: actor?.id ?? owner?.id ?? '',
    actorName: actor?.name ?? owner?.name ?? 'Équipe', action: action.slice(0, 120),
    entity: entity.slice(0, 40), entityId: entityId.slice(0, 100), createdAt: new Date().toISOString()
  });
  if (data.activity.length > 2000) data.activity.length = 2000;
}

function createRestaurantAlert(data: RestaurantData, input: Omit<RestaurantAlert, 'id' | 'status' | 'createdAt'>) {
  data.alerts.unshift({ ...input, id: crypto.randomUUID(), status: 'new', createdAt: new Date().toISOString() });
  if (data.alerts.length > 500) data.alerts.length = 500;
}

export function subscribeRestaurantData(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

export async function getRestaurantData() {
  return readData();
}

function createResellerCode(data: RestaurantData) {
  let code = '';
  do {
    code = `DGF-AGENT-${crypto.randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()}`;
  } while (data.resellers.some(reseller => reseller.code === code));
  return code;
}

function addUtcMonthsClamped(start: Date, months: number) {
  const monthIndex = start.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), monthIndex + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    start.getUTCFullYear(), monthIndex, Math.min(start.getUTCDate(), lastDay),
    start.getUTCHours(), start.getUTCMinutes(), start.getUTCSeconds(), start.getUTCMilliseconds()
  ));
}

function creditResellerCommission(data: RestaurantData, payment: ResellerPlatformPayment) {
  if (payment.status !== 'validated' || data.resellerCommissions.some(item => item.paymentId === payment.id)) return;
  const reseller = data.resellers.find(item => item.id === payment.resellerId && item.status === 'approved');
  const restaurant = data.restaurants.find(item => item.id === payment.restaurantId && item.resellerId === payment.resellerId);
  if (!reseller || !restaurant) return;
  const config = data.resellerCommissionConfig;
  const partnershipStartedAt = new Date(restaurant.createdAt);
  const commissionEndsAt = addUtcMonthsClamped(partnershipStartedAt, config.durationMonths);
  const paymentDate = new Date(payment.createdAt);
  if (paymentDate < partnershipStartedAt || paymentDate >= commissionEndsAt) return;
  const alreadyEarned = data.resellerCommissions.filter(item => item.restaurantId === restaurant.id).reduce((sum, item) => sum + item.amountEUR, 0);
  const ceiling = config.capEUR === null ? Number.POSITIVE_INFINITY : Math.max(0, config.capEUR - alreadyEarned);
  const amountEUR = Math.round(Math.min(payment.amountEUR * config.ratePercent / 100, ceiling) * 100) / 100;
  if (amountEUR <= 0) return;
  data.resellerCommissions.push({
    id: crypto.randomUUID(), resellerId: reseller.id, restaurantId: restaurant.id, paymentId: payment.id,
    month: payment.createdAt.slice(0, 7), amountEUR, status: 'payable', createdAt: payment.validatedAt ?? payment.createdAt
  });
}

export async function applyAsReseller(input: { name: string; email: string; city: string }) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const city = input.city.trim();
  if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || city.length > 100) {
    throw new Error('Renseignez un nom, une adresse e-mail valide et une ville.');
  }
  const data = readData();
  if (data.resellers.some(item => item.email.toLowerCase() === email && item.status !== 'rejected')) {
    throw new Error('Une candidature existe déjà pour cette adresse e-mail.');
  }
  const reseller: ResellerProfile = {
    id: crypto.randomUUID(), name, email, city, status: 'pending', code: null, createdAt: new Date().toISOString()
  };
  data.resellers.push(reseller);
  writeData(data);
  return reseller;
}

export async function setResellerStatus(resellerId: string, status: Exclude<ResellerStatus, 'pending'>) {
  const data = readData();
  const reseller = data.resellers.find(item => item.id === resellerId);
  if (!reseller) throw new Error('Candidature revendeur introuvable.');
  reseller.status = status;
  if (status === 'approved') {
    reseller.approvedAt = new Date().toISOString();
    reseller.code ??= createResellerCode(data);
  }
  writeData(data);
  return reseller;
}

export async function setResellerCommissionConfig(config: ResellerCommissionConfig) {
  if (!Number.isFinite(config.ratePercent) || config.ratePercent < 20 || config.ratePercent > 30 ||
      !Number.isInteger(config.durationMonths) || config.durationMonths < 1 || config.durationMonths > 60 ||
      (config.capEUR !== null && (!Number.isFinite(config.capEUR) || config.capEUR < 0 || config.capEUR > 1_000_000))) {
    throw new Error('La commission doit être entre 20 et 30 %, la durée entre 1 et 60 mois et le plafond positif ou illimité.');
  }
  const data = readData();
  data.resellerCommissionConfig = { ...config, ratePercent: Math.round(config.ratePercent * 100) / 100 };
  writeData(data);
  return data.resellerCommissionConfig;
}

export async function addResellerProspect(input: Omit<ResellerProspect, 'id' | 'createdAt' | 'status'>) {
  const name = input.name.trim();
  const city = input.city.trim();
  const contact = input.contact.trim();
  const data = readData();
  if (name.length < 2 || name.length > 120 || city.length > 100 || contact.length < 3 || contact.length > 160 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.followUpAt) ||
      !data.resellers.some(item => item.id === input.resellerId && item.status === 'approved')) {
    throw new Error('Vérifiez le prospect, ses coordonnées, la date de rappel et le compte revendeur.');
  }
  const prospect: ResellerProspect = {
    id: crypto.randomUUID(), resellerId: input.resellerId, name, city, contact, followUpAt: input.followUpAt,
    status: 'prospect', createdAt: new Date().toISOString()
  };
  data.resellerProspects.push(prospect);
  writeData(data);
  return prospect;
}

export async function updateResellerProspect(prospectId: string, resellerId: string, status: ResellerProspect['status']) {
  const data = readData();
  const prospect = data.resellerProspects.find(item => item.id === prospectId && item.resellerId === resellerId);
  if (!prospect) throw new Error('Prospect introuvable pour ce compte revendeur.');
  prospect.status = status;
  writeData(data);
  return prospect;
}

export async function recordResellerPlatformPayment(input: ResellerPaymentInput) {
  if (!Number.isFinite(input.amountEUR) || input.amountEUR <= 0 || input.amountEUR > 1_000_000 || input.reference.trim().length > 120) {
    throw new Error('Le paiement Digifeel doit avoir un montant EUR valide et une référence courte.');
  }
  const data = readData();
  const restaurant = data.restaurants.find(item => item.id === input.restaurantId);
  if (!restaurant?.resellerId) return null;
  if (data.resellerPayments.some(item => item.reference === input.reference.trim())) {
    throw new Error('Cette référence de paiement est déjà enregistrée.');
  }
  const now = new Date().toISOString();
  const payment: ResellerPlatformPayment = {
    id: crypto.randomUUID(), resellerId: restaurant.resellerId, restaurantId: restaurant.id,
    amountEUR: Math.round(input.amountEUR * 100) / 100, kind: input.kind, reference: input.reference.trim(),
    status: input.status, createdAt: now,
    ...(input.status === 'validated' ? { validatedAt: now } : {})
  };
  data.resellerPayments.push(payment);
  creditResellerCommission(data, payment);
  writeData(data);
  return payment;
}

export async function validateResellerPlatformPayment(paymentId: string, accepted: boolean) {
  const data = readData();
  const payment = data.resellerPayments.find(item => item.id === paymentId && item.status === 'pending');
  if (!payment) throw new Error('Paiement en attente introuvable ou déjà traité.');
  payment.status = accepted ? 'validated' : 'rejected';
  if (accepted) {
    payment.validatedAt = new Date().toISOString();
    creditResellerCommission(data, payment);
  }
  writeData(data);
  return payment;
}

export async function approveResellerPayout(resellerId: string, month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('La période de versement est invalide.');
  const data = readData();
  if (data.resellerPayouts.some(item => item.resellerId === resellerId && item.month === month)) {
    throw new Error('Un versement existe déjà pour cette période.');
  }
  const due = data.resellerCommissions.filter(item => item.resellerId === resellerId && item.month === month && item.status === 'payable');
  if (!due.length) throw new Error('Aucune commission à verser pour cette période.');
  const payout: ResellerPayout = {
    id: crypto.randomUUID(), resellerId, month,
    amountEUR: Math.round(due.reduce((sum, item) => sum + item.amountEUR, 0) * 100) / 100,
    status: 'pending', createdAt: new Date().toISOString()
  };
  for (const commission of due) commission.payoutId = payout.id;
  data.resellerPayouts.push(payout);
  writeData(data);
  return payout;
}

export async function markResellerPayoutPaid(payoutId: string) {
  const data = readData();
  const payout = data.resellerPayouts.find(item => item.id === payoutId && item.status === 'pending');
  if (!payout) throw new Error('Versement approuvé introuvable ou déjà payé.');
  const paidAt = new Date().toISOString();
  payout.status = 'paid';
  payout.paidAt = paidAt;
  for (const commission of data.resellerCommissions) {
    if (commission.payoutId === payout.id && commission.status === 'payable') {
      commission.status = 'paid';
      commission.paidAt = paidAt;
    }
  }
  writeData(data);
  return payout;
}

export async function getResellerDashboard(resellerId: string) {
  const data = readData();
  const reseller = data.resellers.find(item => item.id === resellerId && item.status === 'approved');
  if (!reseller) throw new Error('Compte revendeur introuvable ou non validé.');
  const customers = data.restaurants.filter(item => item.resellerId === reseller.id);
  const commissions = data.resellerCommissions.filter(item => item.resellerId === reseller.id);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const cityCounts = new Map<string, number>();
  for (const customer of customers) {
    const city = customer.city || 'Ville non renseignée';
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  }
  const comingEUR = data.resellerPayments.filter(item => item.resellerId === reseller.id && item.status === 'pending').reduce((sum, payment) => {
    const restaurant = data.restaurants.find(item => item.id === payment.restaurantId);
    if (!restaurant) return sum;
    const startedAt = new Date(restaurant.createdAt);
    const endsAt = addUtcMonthsClamped(startedAt, data.resellerCommissionConfig.durationMonths);
    const paymentDate = new Date(payment.createdAt);
    return paymentDate >= startedAt && paymentDate < endsAt
      ? sum + payment.amountEUR * data.resellerCommissionConfig.ratePercent / 100 : sum;
  }, 0);
  return {
    reseller,
    customers: customers.map(restaurant => ({
      ...restaurant,
      status: restaurant.subscriptionStatus === 'suspended' ? 'terminated' as const :
        restaurant.subscriptionStatus === 'active' ? 'active' as const :
          restaurant.createdAt.slice(0, 7) === currentMonth ? 'installed' as const : 'demo' as const,
      scans: data.scans.filter(scan => scan.restaurantId === restaurant.id).length
    })),
    prospects: data.resellerProspects.filter(item => item.resellerId === reseller.id),
    commissions,
    payouts: data.resellerPayouts.filter(item => item.resellerId === reseller.id),
    totals: {
      customerCount: customers.length,
      installationsThisMonth: customers.filter(item => item.createdAt.slice(0, 7) === currentMonth).length,
      earnedEUR: commissions.filter(item => item.status === 'paid').reduce((sum, item) => sum + item.amountEUR, 0),
      dueEUR: commissions.filter(item => item.status === 'payable').reduce((sum, item) => sum + item.amountEUR, 0),
      comingEUR
    },
    cityRanking: [...cityCounts].map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count || a.city.localeCompare(b.city)),
    commissionConfig: data.resellerCommissionConfig
  };
}

export async function getResellerAdministration() {
  const data = readData();
  return {
    resellers: data.resellers,
    config: data.resellerCommissionConfig,
    pendingPayments: data.resellerPayments.filter(item => item.status === 'pending'),
    commissions: data.resellerCommissions,
    payouts: data.resellerPayouts,
    customers: data.restaurants.filter(item => item.resellerId).map(restaurant => ({
      restaurant,
      reseller: data.resellers.find(item => item.id === restaurant.resellerId) ?? null
    }))
  };
}

export async function getRestaurant(restaurantId = demoRestaurantId) {
  return readData().restaurants.find(restaurant => restaurant.id === restaurantId) ?? null;
}

export async function getWaiters(restaurantId = demoRestaurantId) {
  return readData().users.filter(user => user.restaurantId === restaurantId && user.role === 'serveur' && user.active);
}

export async function getTables(restaurantId = demoRestaurantId) {
  return readData().tables.filter(table => table.restaurantId === restaurantId && table.active);
}

export async function getMenu(restaurantId = demoRestaurantId) {
  const data = readData();
  return {
    categories: data.categories.filter(category => category.restaurantId === restaurantId).sort((a, b) => a.sortOrder - b.sortOrder),
    items: data.items.filter(item => item.restaurantId === restaurantId)
  };
}

export async function getBill(billId: string) {
  const data = readData();
  const bill = data.bills.find(item => item.id === billId);
  if (!bill) return null;
  return {
    bill,
    table: data.tables.find(table => table.id === bill.tableId) ?? null,
    restaurant: data.restaurants.find(restaurant => restaurant.id === bill.restaurantId) ?? null,
    waiter: data.users.find(user => user.id === bill.waiterId) ?? null,
    payments: data.payments.filter(payment => payment.billId === billId),
    tips: data.tips.filter(tip => tip.billId === billId),
    totals: billTotals(bill, data.payments)
  };
}

export async function getBillForTag(code: string) {
  const data = readData();
  const tag = data.tags.find(item => item.code.toLowerCase() === code.toLowerCase() && item.active);
  if (!tag) return { tag: null, bill: null };
  const table = data.tables.find(item => item.id === tag.tableId && item.active);
  const restaurant = data.restaurants.find(item => item.id === tag.restaurantId);
  if (!table || !restaurant) return { tag: null, bill: null };
  const openBill = data.bills.find(bill => bill.tableId === table.id && bill.status !== 'paid' && bill.clientVisible);
  return {
    tag: { ...tag, table, restaurant },
    bill: openBill ? await getBill(openBill.id) : null
  };
}

export async function getTagByCode(code: string) {
  return readData().tags.find(tag => tag.code.toLowerCase() === code.toLowerCase()) ?? null;
}

export async function activateTag(input: {
  code: string;
  restaurantName: string;
  ownerName: string;
  city: string;
  googleReviewUrl: string;
  currency: 'EUR' | 'DZD';
  packPrice: number;
  resellerCode?: string;
}) {
  const data = readData();
  const tag = data.tags.find(item => item.code.toLowerCase() === input.code.toLowerCase());
  if (!tag || !tag.active || tag.restaurantId) throw new Error('Cette puce est inconnue ou déjà activée.');
  const googleUrl = new URL(input.googleReviewUrl);
  if (googleUrl.protocol !== 'https:' || !/google\./i.test(googleUrl.hostname)) throw new Error('Saisissez un lien Google Avis sécurisé.');
  const created = await createRestaurant({
    name: input.restaurantName, city: input.city, currency: input.currency, packPrice: input.packPrice,
    resellerCode: input.resellerCode
  });
  const updated = await updateRestaurant(created.restaurant.id, { googleReviewUrl: googleUrl.toString() });
  const next = readData();
  const owner = next.users.find(user => user.restaurantId === updated.id && user.role === 'admin_restaurant');
  if (owner) owner.name = input.ownerName.trim().slice(0, 100);
  const table = next.tables.find(item => item.restaurantId === updated.id);
  const fallbackTag = table && next.tags.find(item => item.tableId === table.id);
  if (!table || !fallbackTag) throw new Error('La table initiale du restaurant est indisponible.');
  fallbackTag.active = false;
  table.tagCode = tag.code;
  tag.restaurantId = updated.id;
  tag.tableId = table.id;
  tag.active = true;
  writeData(next);
  return updated;
}

export async function createBill(tableId: string, waiterId: string, restaurantId = demoRestaurantId, currency?: 'EUR' | 'DZD') {
  const data = readData();
  if (!data.tables.some(table => table.id === tableId && table.restaurantId === restaurantId && table.active)) {
    throw new Error('Table introuvable ou désactivée.');
  }
  if (!data.users.some(user => user.id === waiterId && user.restaurantId === restaurantId && user.role === 'serveur' && user.active)) {
    throw new Error('Choisissez un serveur actif.');
  }
  const existing = data.bills.find(bill => bill.tableId === tableId && bill.status !== 'paid');
  if (existing) return existing;
  const restaurant = data.restaurants.find(item => item.id === restaurantId);
  if (!restaurant) throw new Error('Restaurant introuvable.');
  const now = new Date().toISOString();
  const bill: Bill = {
    id: crypto.randomUUID(),
    restaurantId,
    tableId,
    waiterId,
    status: 'draft',
    lines: [],
    quickTotal: null,
    discountPercent: 0,
    createdAt: now,
    updatedAt: now,
    clientVisible: false,
    currency: currency ?? restaurant.currency
  };
  data.bills.push(bill);
  const table = data.tables.find(item => item.id === tableId);
  if (table) table.status = 'occupied';
  recordActivity(data, restaurantId, 'a ouvert une addition', 'addition', bill.id, waiterId);
  writeData(data);
  return bill;
}

export async function addItem(billId: string, itemId: string, quantity = 1, note = '') {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('La quantité doit être comprise entre 1 et 99.');
  const data = readData();
  const bill = data.bills.find(item => item.id === billId && item.status !== 'paid');
  const menuItem = data.items.find(item => item.id === itemId && item.available);
  if (!bill || !menuItem || menuItem.restaurantId !== bill.restaurantId) throw new Error('Addition ou produit indisponible.');
  const current = bill.lines.find(line => line.itemId === itemId && line.note === note.trim());
  if (current) current.quantity += quantity;
  else bill.lines.push({ id: crypto.randomUUID(), itemId, name: menuItem.name, quantity, unitPrice: menuItem.price, taxRate: menuItem.taxRate, note: note.trim().slice(0, 120) });
  bill.quickTotal = null;
  bill.status = bill.status === 'draft' ? 'open' : bill.status;
  bill.updatedAt = new Date().toISOString();
  writeData(data);
  return getBill(billId);
}

export async function updateBillLine(billId: string, lineId: string, patch: { quantity?: number; note?: string }) {
  const data = readData();
  const bill = data.bills.find(item => item.id === billId && item.status !== 'paid');
  const line = bill?.lines.find(item => item.id === lineId);
  if (!bill || !line) throw new Error('Ligne d’addition introuvable.');
  if (patch.quantity !== undefined) {
    if (!Number.isInteger(patch.quantity) || patch.quantity < 1 || patch.quantity > 99) throw new Error('La quantité doit être comprise entre 1 et 99.');
    line.quantity = patch.quantity;
  }
  if (patch.note !== undefined) line.note = patch.note.trim().slice(0, 120);
  bill.updatedAt = new Date().toISOString();
  writeData(data);
  return getBill(billId);
}

export async function removeBillLine(billId: string, lineId: string) {
  const data = readData();
  const bill = data.bills.find(item => item.id === billId && item.status !== 'paid');
  if (!bill) throw new Error('Addition introuvable ou déjà réglée.');
  bill.lines = bill.lines.filter(line => line.id !== lineId);
  bill.updatedAt = new Date().toISOString();
  writeData(data);
  return getBill(billId);
}

export async function setQuickTotal(billId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) throw new Error('Saisissez un total valide.');
  const data = readData();
  const bill = data.bills.find(item => item.id === billId && item.status !== 'paid');
  if (!bill) throw new Error('Addition introuvable ou déjà réglée.');
  bill.lines = [];
  bill.quickTotal = Math.round(amount);
  bill.status = 'open';
  bill.updatedAt = new Date().toISOString();
  writeData(data);
  return getBill(billId);
}

export async function publishBill(billId: string, discountPercent?: number) {
  if (discountPercent !== undefined && (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100)) {
    throw new Error('La remise doit être comprise entre 0 et 100 %.');
  }
  const data = readData();
  const bill = data.bills.find(item => item.id === billId && item.status !== 'paid');
  if (!bill) throw new Error('Addition introuvable ou déjà réglée.');
  if (bill.lines.length === 0 && !bill.quickTotal) throw new Error('Ajoutez un plat ou saisissez un total avant d’envoyer l’addition.');
  if (discountPercent !== undefined) bill.discountPercent = discountPercent;
  bill.status = 'open';
  bill.clientVisible = true;
  bill.updatedAt = new Date().toISOString();
  const table = data.tables.find(item => item.id === bill.tableId);
  if (table && table.status !== 'paid') table.status = 'bill_requested';
  writeData(data);
  return getBill(billId);
}

export async function payBill(billId: string, amount: number, mode: PaymentMode, status: Payment['status'] = 'paid', reference = '') {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Le montant du paiement est invalide.');
  const data = readData();
  const bill = data.bills.find(item => item.id === billId && item.status !== 'paid');
  if (!bill) throw new Error('Addition déjà réglée ou introuvable.');
  const totals = billTotals(bill, data.payments);
  const paymentAmount = Math.min(Math.round(amount), totals.balance);
  if (paymentAmount <= 0) throw new Error('Cette addition est déjà réglée.');
  data.payments.push({
    id: crypto.randomUUID(),
    restaurantId: bill.restaurantId,
    billId,
    amount: paymentAmount,
    mode,
    status,
    createdAt: new Date().toISOString(),
    reference: reference.trim().slice(0, 120)
  });
  const updatedTotals = billTotals(bill, data.payments);
  if (updatedTotals.balance === 0 && status === 'paid') {
    bill.status = 'paid';
    const restaurant = data.restaurants.find(item => item.id === bill.restaurantId);
    const loyaltyAccount = data.loyaltyAccounts.find(item => item.id === bill.loyaltyCustomerId && item.restaurantId === bill.restaurantId);
    if (restaurant?.loyalty?.enabled && loyaltyAccount && !bill.loyaltyAwarded) {
      loyaltyAccount.points += restaurant.loyalty.pointsPerVisit;
      loyaltyAccount.visits += 1;
      loyaltyAccount.updatedAt = new Date().toISOString();
      bill.loyaltyAwarded = true;
    }
  }
  bill.updatedAt = new Date().toISOString();
  const table = data.tables.find(item => item.id === bill.tableId);
  if (table && bill.status === 'paid') table.status = 'paid';
  recordActivity(data, bill.restaurantId, `a enregistré un paiement ${mode}`, 'paiement', billId, bill.waiterId);
  writeData(data);
  return getBill(billId);
}

export async function confirmPendingPayment(paymentId: string) {
  const data = readData();
  const payment = data.payments.find(item => item.id === paymentId && item.status === 'pending');
  if (!payment) throw new Error('Paiement introuvable ou déjà validé.');
  const bill = data.bills.find(item => item.id === payment.billId);
  payment.status = 'paid';
  if (bill && bill.status !== 'paid' && billTotals(bill, data.payments).balance === 0) {
    bill.status = 'paid';
    bill.updatedAt = new Date().toISOString();
    const table = data.tables.find(item => item.id === bill.tableId);
    if (table) table.status = 'paid';
  }
  recordActivity(data, payment.restaurantId, `a validé un paiement ${payment.mode}`, 'paiement', payment.billId, bill?.waiterId);
  writeData(data);
}

export async function requestBill(tableId: string) {
  const data = readData();
  const table = data.tables.find(item => item.id === tableId);
  if (!table) throw new Error('Table introuvable.');
  if (table.status !== 'bill_requested') {
    table.status = 'bill_requested';
    createRestaurantAlert(data, { restaurantId: table.restaurantId, tableId, orderId: null, reviewId: null, kind: 'bill_request', message: `${table.name} demande l’addition.` });
  }
  recordActivity(data, table.restaurantId, 'a signalé une demande d’addition', 'table', tableId);
  writeData(data);
}

export async function callServer(tableId: string) {
  const data = readData();
  const table = data.tables.find(item => item.id === tableId && item.active);
  if (!table) throw new Error('Table introuvable ou inactive.');
  if (table.status !== 'bill_requested') table.status = 'server_called';
  createRestaurantAlert(data, { restaurantId: table.restaurantId, tableId, orderId: null, reviewId: null, kind: 'call_server', message: `Un client appelle le serveur à ${table.name}.` });
  recordActivity(data, table.restaurantId, 'a appelé le serveur', 'table', tableId);
  writeData(data);
}

export async function acknowledgeAlert(alertId: string) {
  const data = readData();
  const alert = data.alerts.find(item => item.id === alertId);
  if (!alert) throw new Error('Alerte introuvable.');
  alert.status = 'acknowledged';
  if (alert.kind === 'call_server' && alert.tableId) {
    const table = data.tables.find(item => item.id === alert.tableId);
    if (table?.status === 'server_called') table.status = 'occupied';
  }
  writeData(data);
}

export async function getPublicMenuForTag(code: string) {
  const data = readData();
  const tag = data.tags.find(item => item.code.toLowerCase() === code.toLowerCase() && item.active && item.restaurantId && item.tableId);
  if (!tag) return null;
  const restaurant = data.restaurants.find(item => item.id === tag.restaurantId);
  const table = data.tables.find(item => item.id === tag.tableId && item.active);
  if (!restaurant || !table) return null;
  const categories = data.categories.filter(category => category.restaurantId === restaurant.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const items = data.items.filter(item => item.restaurantId === restaurant.id);
  const orders = data.orders.filter(order => order.tableId === table.id && order.restaurantId === restaurant.id && order.status !== 'rejected').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  return { tag, restaurant, table, categories, items, orders };
}

export async function createGuestOrder(input: {
  tagCode: string;
  lines: Array<{ itemId: string; quantity: number; note?: string }>;
  customerNote?: string;
}) {
  if (input.lines.length < 1 || input.lines.length > 30) throw new Error('Une commande doit contenir de 1 à 30 produits.');
  if ((input.customerNote ?? '').length > 400) throw new Error('La note de commande ne peut pas dépasser 400 caractères.');
  const data = readData();
  const tag = data.tags.find(item => item.code.toLowerCase() === input.tagCode.toLowerCase() && item.active && item.restaurantId && item.tableId);
  const table = tag && data.tables.find(item => item.id === tag.tableId && item.active);
  const restaurant = tag && data.restaurants.find(item => item.id === tag.restaurantId);
  if (!tag || !table || !restaurant) throw new Error('Puce inconnue ou désactivée.');
  const waiter = data.users.find(user => user.restaurantId === restaurant.id && user.role === 'serveur' && user.active);
  const lines: RestaurantOrder['lines'] = input.lines.map(entry => {
    if (!Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > 20 || (entry.note ?? '').length > 120) {
      throw new Error('Vérifiez la quantité et les notes de commande.');
    }
    const item = data.items.find(product => product.id === entry.itemId && product.restaurantId === restaurant.id && product.available);
    if (!item) throw new Error('Un produit de votre commande n’est plus disponible.');
    return { itemId: item.id, name: item.name, quantity: entry.quantity, unitPrice: item.price, taxRate: item.taxRate, note: (entry.note ?? '').trim() };
  });
  const now = new Date().toISOString();
  const order: RestaurantOrder = {
    id: crypto.randomUUID(), restaurantId: restaurant.id, tableId: table.id, waiterId: waiter?.id ?? '',
    billId: null, status: 'pending', lines, customerNote: (input.customerNote ?? '').trim(), createdAt: now, updatedAt: now, readyAt: null
  };
  data.orders.unshift(order);
  recordActivity(data, restaurant.id, 'a envoyé une commande depuis la table', 'commande', order.id);
  writeData(data);
  return order;
}

export async function getOrders(restaurantId = demoRestaurantId) {
  return readData().orders.filter(order => order.restaurantId === restaurantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function acceptGuestOrder(orderId: string) {
  const data = readData();
  const order = data.orders.find(item => item.id === orderId && item.status === 'pending');
  if (!order) throw new Error('Cette commande a déjà été traitée ou n’existe plus.');
  const table = data.tables.find(item => item.id === order.tableId && item.active);
  const restaurant = data.restaurants.find(item => item.id === order.restaurantId);
  const waiter = data.users.find(user => user.restaurantId === order.restaurantId && user.role === 'serveur' && user.active);
  if (!table || !restaurant || !waiter) throw new Error('Aucune table ou aucun serveur actif pour cette commande.');
  let bill = data.bills.find(item => item.tableId === table.id && item.status !== 'paid' && !item.reviewOnly);
  const now = new Date().toISOString();
  if (!bill) {
    bill = {
      id: crypto.randomUUID(), restaurantId: restaurant.id, tableId: table.id, waiterId: waiter.id, status: 'open',
      lines: [], quickTotal: null, discountPercent: 0, createdAt: now, updatedAt: now, clientVisible: false, currency: restaurant.currency
    };
    data.bills.push(bill);
  }
  for (const orderLine of order.lines) {
    const existing = bill.lines.find(line => line.itemId === orderLine.itemId && line.note === orderLine.note);
    if (existing) existing.quantity += orderLine.quantity;
    else bill.lines.push({ ...orderLine, id: crypto.randomUUID() });
  }
  bill.status = 'open';
  bill.quickTotal = null;
  bill.updatedAt = now;
  order.waiterId = waiter.id;
  order.billId = bill.id;
  order.status = 'new';
  order.updatedAt = now;
  table.status = 'occupied';
  recordActivity(data, order.restaurantId, 'a validé une commande client', 'commande', order.id, waiter.id);
  writeData(data);
  return order;
}

export async function rejectGuestOrder(orderId: string, reason = '') {
  const data = readData();
  const order = data.orders.find(item => item.id === orderId && item.status === 'pending');
  if (!order) throw new Error('Cette commande a déjà été traitée ou n’existe plus.');
  order.status = 'rejected';
  order.customerNote = reason.trim().slice(0, 400) || order.customerNote;
  order.updatedAt = new Date().toISOString();
  recordActivity(data, order.restaurantId, 'a refusé une commande client', 'commande', order.id);
  writeData(data);
  return order;
}

const orderProgression: Record<Exclude<OrderStatus, 'pending' | 'rejected'>, OrderStatus | null> = {
  new: 'preparing',
  preparing: 'ready',
  ready: 'served',
  served: null
};

export async function advanceOrder(orderId: string, status?: Exclude<OrderStatus, 'pending' | 'rejected'>) {
  const data = readData();
  const order = data.orders.find(item => item.id === orderId && item.status !== 'pending' && item.status !== 'rejected');
  if (!order) throw new Error('Commande active introuvable.');
  const nextStatus = status ?? orderProgression[order.status as Exclude<OrderStatus, 'pending' | 'rejected'>];
  if (!nextStatus || nextStatus === 'pending' || nextStatus === 'rejected') throw new Error('Cette commande est déjà terminée.');
  const expected = orderProgression[order.status as Exclude<OrderStatus, 'pending' | 'rejected'>];
  if (nextStatus !== expected) throw new Error('Respectez l’ordre des étapes de préparation.');
  order.status = nextStatus;
  order.updatedAt = new Date().toISOString();
  if (nextStatus === 'ready') {
    order.readyAt = order.updatedAt;
    createRestaurantAlert(data, { restaurantId: order.restaurantId, tableId: order.tableId, orderId: order.id, reviewId: null, kind: 'order_ready', message: `La commande de ${data.tables.find(table => table.id === order.tableId)?.name ?? 'la table'} est prête.` });
  }
  recordActivity(data, order.restaurantId, `a passé une commande au statut ${nextStatus}`, 'commande', order.id);
  writeData(data);
  return order;
}

export async function updateKitchenSettings(restaurantId: string, delayMinutes: number) {
  if (!Number.isInteger(delayMinutes) || delayMinutes < 1 || delayMinutes > 180) throw new Error('Le délai doit être compris entre 1 et 180 minutes.');
  const data = readData();
  const restaurant = data.restaurants.find(item => item.id === restaurantId);
  if (!restaurant) throw new Error('Restaurant introuvable.');
  restaurant.kitchenAlertMinutes = delayMinutes;
  writeData(data);
  return restaurant.tipAlertMinutes;
}

export async function linkLoyaltyCustomer(billId: string, name: string, contact: string) {
  const cleanContact = contact.trim().toLowerCase();
  if (!/^(?:[^@\s]+@[^@\s]+\.[^@\s]+|\+?[0-9][0-9\s().-]{7,19})$/.test(cleanContact)) throw new Error('Saisissez un e-mail ou un numéro de téléphone valide.');
  const data = readData();
  const bill = data.bills.find(item => item.id === billId && item.status !== 'paid');
  if (!bill) throw new Error('Addition introuvable ou déjà réglée.');
  const ownerName = name.trim().slice(0, 100);
  let account = data.loyaltyAccounts.find(item => item.restaurantId === bill.restaurantId && item.contact === cleanContact);
  if (!account) {
    account = { id: crypto.randomUUID(), restaurantId: bill.restaurantId, contact: cleanContact, name: ownerName || 'Client', points: 0, visits: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    data.loyaltyAccounts.push(account);
  } else if (ownerName) account.name = ownerName;
  bill.loyaltyCustomerId = account.id;
  writeData(data);
  return account;
}

export async function updateLoyaltySettings(restaurantId: string, input: { enabled: boolean; pointsPerVisit: number; rewards: Array<{ label: string; points: number }> }) {
  if (!Number.isInteger(input.pointsPerVisit) || input.pointsPerVisit < 1 || input.pointsPerVisit > 1000 || input.rewards.length > 10) {
    throw new Error('Vérifiez la règle de points et les récompenses.');
  }
  const rewards = input.rewards.map(reward => {
    if (!reward.label.trim() || reward.label.length > 100 || !Number.isInteger(reward.points) || reward.points < 1 || reward.points > 100_000) {
      throw new Error('Chaque récompense doit avoir un nom et un palier valides.');
    }
    return { id: crypto.randomUUID(), label: reward.label.trim(), points: reward.points };
  });
  const data = readData();
  const restaurant = data.restaurants.find(item => item.id === restaurantId);
  if (!restaurant) throw new Error('Restaurant introuvable.');
  restaurant.loyalty = { enabled: input.enabled, pointsPerVisit: input.pointsPerVisit, rewards };
  recordActivity(data, restaurantId, 'a modifié le programme de fidélité', 'fidélité', restaurantId);
  writeData(data);
  return restaurant.loyalty;
}

export async function redeemLoyaltyReward(accountId: string, rewardId: string) {
  const data = readData();
  const account = data.loyaltyAccounts.find(item => item.id === accountId);
  const restaurant = account && data.restaurants.find(item => item.id === account.restaurantId);
  const reward = restaurant?.loyalty?.rewards.find(item => item.id === rewardId);
  if (!account || !restaurant || !reward) throw new Error('Compte fidélité ou récompense introuvable.');
  if (account.points < reward.points) throw new Error('Le solde de points est insuffisant.');
  account.points -= reward.points;
  account.updatedAt = new Date().toISOString();
  recordActivity(data, restaurant.id, `a échangé ${reward.points} points pour ${account.name}`, 'fidélité', account.id);
  writeData(data);
  return account;
}

export async function updateTipMode(restaurantId: string, mode: 'individual' | 'pool') {
  const data = readData();
  const restaurant = data.restaurants.find(item => item.id === restaurantId);
  if (!restaurant) throw new Error('Restaurant introuvable.');
  restaurant.tipMode = mode;
  recordActivity(data, restaurantId, mode === 'pool' ? 'a activé le pot commun de pourboires' : 'a activé les pourboires individuels', 'pourboires', restaurantId);
  writeData(data);
  return mode;
}

export async function getRestaurantActivity(restaurantId = demoRestaurantId) {
  return readData().activity.filter(item => item.restaurantId === restaurantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 300);
}

export async function recordNotificationSimulation(restaurantId: string, reviewId: string, channel: 'email' | 'whatsapp') {
  const data = readData();
  if (!data.reviews.some(review => review.id === reviewId && review.restaurantId === restaurantId)) throw new Error('Avis introuvable.');
  recordActivity(data, restaurantId, `a préparé une alerte ${channel} (simulation)`, 'notification', reviewId);
  writeData(data);
}

export async function assignTagToTable(tagCode: string, tableId: string) {
  const data = readData();
  const tag = data.tags.find(item => item.code === tagCode);
  const table = data.tables.find(item => item.id === tableId);
  if (!tag || !table || (tag.restaurantId && tag.restaurantId !== table.restaurantId)) {
    throw new Error('Puce ou table introuvable, ou rattachée à un autre restaurant.');
  }
  const previous = data.tags.find(item => item.tableId === table.id && item.code !== tag.code);
  if (previous) previous.active = false;
  tag.restaurantId = table.restaurantId;
  tag.tableId = table.id;
  tag.active = true;
  table.tagCode = tag.code;
  writeData(data);
  return tag;
}

export async function updateBillWaiter(billId: string, waiterId: string) {
  const data = readData();
  const bill = data.bills.find(item => item.id === billId && item.status !== 'paid');
  const waiter = data.users.find(item => item.id === waiterId && item.role === 'serveur' && item.active);
  if (!bill || !waiter || waiter.restaurantId !== bill.restaurantId) throw new Error('Addition ou serveur introuvable.');
  bill.waiterId = waiter.id;
  bill.updatedAt = new Date().toISOString();
  writeData(data);
  return bill;
}

export async function addTip(billId: string, amount: number, status: Tip['status'] = 'paid') {
  if (!Number.isFinite(amount) || amount < 0 || amount > 100_000_000) throw new Error('Montant de pourboire invalide.');
  if (amount === 0) return null;
  const data = readData();
  const bill = data.bills.find(item => item.id === billId);
  if (!bill) throw new Error('Addition introuvable.');
  const pooled = data.restaurants.find(item => item.id === bill.restaurantId)?.tipMode === 'pool';
  const tip: Tip = {
    id: crypto.randomUUID(),
    restaurantId: bill.restaurantId,
    billId,
    waiterId: bill.waiterId,
    amount: Math.round(amount),
    currency: bill.currency,
    status,
    createdAt: new Date().toISOString(),
    pooled
  };
  data.tips.push(tip);
  recordActivity(data, bill.restaurantId, pooled ? 'a ajouté un pourboire au pot commun' : 'a ajouté un pourboire individuel', 'pourboire', tip.id, bill.waiterId);
  writeData(data);
  return tip;
}

export async function validateManualTip(tipId: string) {
  const data = readData();
  const tip = data.tips.find(item => item.id === tipId);
  if (!tip) throw new Error('Pourboire introuvable.');
  if (tip.status === 'paid') return tip;
  tip.status = 'paid';
  recordActivity(data, tip.restaurantId, 'a confirmé manuellement un pourboire', 'pourboire', tip.id);
  writeData(data);
  return tip;
}

export async function createReview(input: Omit<RestaurantReview, 'id' | 'createdAt' | 'treated'>) {
  if (!Number.isInteger(input.stars) || input.stars < 1 || input.stars > 5) throw new Error('La note doit être comprise entre 1 et 5.');
  if (input.comment.length > 1200) throw new Error('Le commentaire est trop long.');
  if (input.criteria && Object.values(input.criteria).some(value => value !== undefined && (!Number.isInteger(value) || value < 1 || value > 5))) {
    throw new Error('Les notes détaillées doivent être comprises entre 1 et 5.');
  }
  const data = readData();
  const bill = data.bills.find(item => item.id === input.billId && item.restaurantId === input.restaurantId);
  if (!bill) throw new Error('Addition introuvable.');
  const createdAt = new Date().toISOString();
  const existing = data.reviews.find(review => review.billId === input.billId);
  if (existing) return existing;
  const review: RestaurantReview = { ...input, id: crypto.randomUUID(), comment: input.comment.trim(), treated: false, createdAt };
  data.reviews.push(review);
  if (review.stars <= 2) {
    createRestaurantAlert(data, { restaurantId: review.restaurantId, tableId: review.tableId, orderId: null, reviewId: review.id, kind: 'low_review', message: `Nouvel avis à ${review.stars} étoile(s).` });
  }
  detectStarBonusAnomalies(data, review.restaurantId);
  recordActivity(data, review.restaurantId, 'a reçu un avis client', 'avis', review.id);
  writeData(data);
  return review;
}

export async function createReviewForTag(code: string, stars: number, comment: string, waiterId?: string, criteria?: RestaurantReview['criteria'], deviceFingerprint?: string) {
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new Error('La note doit être comprise entre 1 et 5.');
  if (comment.length > 1200) throw new Error('Le commentaire est trop long.');
  if (criteria && Object.values(criteria).some(value => value !== undefined && (!Number.isInteger(value) || value < 1 || value > 5))) {
    throw new Error('Les notes détaillées doivent être comprises entre 1 et 5.');
  }
  const data = readData();
  const tag = data.tags.find(item => item.code.toLowerCase() === code.toLowerCase() && item.active && item.restaurantId && item.tableId);
  const table = tag && data.tables.find(item => item.id === tag.tableId);
  const restaurant = tag && data.restaurants.find(item => item.id === tag.restaurantId);
  if (!tag || !table || !restaurant) throw new Error('Puce inconnue ou inactive.');
  if (waiterId && !data.users.some(user => user.id === waiterId && user.restaurantId === restaurant.id && user.role === 'serveur' && user.active)) {
    throw new Error('Le serveur sélectionné est indisponible.');
  }
  const now = new Date().toISOString();
  const fallbackWaiter = data.users.find(user => user.restaurantId === restaurant.id && user.role === 'serveur' && user.active);
  const billId = crypto.randomUUID();
  data.bills.push({
    id: billId, restaurantId: restaurant.id, tableId: table.id, waiterId: waiterId ?? fallbackWaiter?.id ?? '',
    status: 'paid', lines: [], quickTotal: 0, discountPercent: 0, createdAt: now, updatedAt: now,
    clientVisible: false, currency: restaurant.currency, reviewOnly: true
  });
  const review: RestaurantReview = {
    id: crypto.randomUUID(), restaurantId: restaurant.id, billId, tableId: table.id,
    waiterId: waiterId ?? fallbackWaiter?.id ?? '', stars, comment: comment.trim(), treated: false, createdAt: now, criteria, deviceFingerprint
  };
  data.reviews.push(review);
  if (review.stars <= 2) {
    createRestaurantAlert(data, { restaurantId: review.restaurantId, tableId: review.tableId, orderId: null, reviewId: review.id, kind: 'low_review', message: `Nouvel avis à ${review.stars} étoile(s).` });
  }
  detectStarBonusAnomalies(data, review.restaurantId);
  recordActivity(data, review.restaurantId, 'a reçu un avis client', 'avis', review.id);
  writeData(data);
  return review;
}

export async function markReviewTreated(reviewId: string, treated: boolean) {
  const data = readData();
  const review = data.reviews.find(item => item.id === reviewId);
  if (!review) throw new Error('Avis introuvable.');
  review.treated = treated;
  recordActivity(data, review.restaurantId, treated ? 'a marqué un avis comme traité' : 'a rouvert un avis', 'avis', review.id);
  writeData(data);
  return review;
}

export async function createWaiter(input: { restaurantId: string; name: string; role: string }) {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 100) throw new Error('Le nom du serveur doit contenir entre 2 et 100 caractères.');
  const data = readData();
  const user: RestaurantUser = { id: crypto.randomUUID(), restaurantId: input.restaurantId, name, role: 'serveur', title: input.role.trim() || 'Serveur', active: true, pin: String(Math.floor(1000 + Math.random() * 9000)), permissions: { manageMenu: false, manageReviews: true, manageCash: true } };
  data.users.push(user);
  recordActivity(data, input.restaurantId, 'a ajouté un membre à l’équipe', 'équipe', user.id);
  writeData(data);
  return user;
}

export async function updateWaiter(waiterId: string, patch: { name?: string; role?: string; active?: boolean }) {
  const data = readData();
  const user = data.users.find(item => item.id === waiterId && item.role === 'serveur');
  if (!user) throw new Error('Serveur introuvable.');
  if (patch.name !== undefined) user.name = patch.name.trim().slice(0, 100);
  if (patch.role !== undefined) user.title = patch.role.trim().slice(0, 80);
  if (patch.active !== undefined) user.active = patch.active;
  recordActivity(data, user.restaurantId, patch.active === undefined ? 'a modifié un serveur' : patch.active ? 'a réactivé un serveur' : 'a désactivé un serveur', 'équipe', user.id);
  writeData(data);
  return user;
}

export async function updateWaiterPermissions(waiterId: string, permissions: StaffPermissions) {
  const data = readData();
  const waiter = data.users.find(item => item.id === waiterId && item.role === 'serveur');
  if (!waiter) throw new Error('Serveur introuvable.');
  waiter.permissions = {
    manageMenu: Boolean(permissions.manageMenu),
    manageReviews: Boolean(permissions.manageReviews),
    manageCash: Boolean(permissions.manageCash)
  };
  recordActivity(data, waiter.restaurantId, 'a modifié les accès d’un serveur', 'permissions', waiter.id);
  writeData(data);
  return waiter;
}

export async function updateRestaurantOwner(restaurantId: string, name: string) {
  const cleanName = name.trim();
  if (cleanName.length < 2 || cleanName.length > 100) throw new Error('Le nom du gérant doit contenir entre 2 et 100 caractères.');
  const data = readData();
  const owner = data.users.find(user => user.restaurantId === restaurantId && user.role === 'admin_restaurant');
  if (!owner) throw new Error('Compte gérant introuvable.');
  owner.name = cleanName;
  writeData(data);
  return owner;
}

export async function updateRestaurant(restaurantId: string, patch: Partial<Pick<RestaurantAccount, 'name' | 'address' | 'city' | 'googleReviewUrl' | 'currency' | 'taxRate' | 'logoUrl' | 'accentColor' | 'subscriptionStatus' | 'tipAlertMinutes' | 'kitchenAlertMinutes'>>) {
  const data = readData();
  const restaurant = data.restaurants.find(item => item.id === restaurantId);
  if (!restaurant) throw new Error('Restaurant introuvable.');
  const previousGoogleUrl = restaurant.googleReviewUrl;
  Object.assign(restaurant, patch);
  if (patch.googleReviewUrl !== undefined && patch.googleReviewUrl !== previousGoogleUrl) {
    const baseline = data.starBonus.baselines.find(item => item.restaurantId === restaurantId);
    const hasRatingSnapshots = data.starBonus.snapshots.some(snapshot => snapshot.restaurantId === restaurantId);
    if (baseline && baseline.rating === null && !hasRatingSnapshots) baseline.googleReviewUrl = patch.googleReviewUrl;
  }
  recordActivity(data, restaurantId, 'a modifié les réglages du restaurant', 'restaurant', restaurantId);
  writeData(data);
  return restaurant;
}

export async function upsertTable(input: Partial<RestaurantTable> & { restaurantId: string; name: string; zone: string }) {
  const name = input.name.trim();
  const zone = input.zone.trim();
  if (name.length < 1 || name.length > 60 || zone.length < 1 || zone.length > 60) throw new Error('Le nom et la zone de la table sont obligatoires.');
  const data = readData();
  const existing = input.id ? data.tables.find(table => table.id === input.id && table.restaurantId === input.restaurantId) : null;
  if (existing) {
    existing.name = name;
    existing.zone = zone;
    existing.active = input.active ?? existing.active;
    writeData(data);
    return existing;
  }
  const table: RestaurantTable = {
    id: crypto.randomUUID(),
    restaurantId: input.restaurantId,
    name,
    zone,
    status: 'free',
    tagCode: input.tagCode ?? uniqueTagCode(data, 'DF'),
    active: true
  };
  data.tables.push(table);
  data.tags.push({ code: table.tagCode, restaurantId: table.restaurantId, tableId: table.id, active: true, createdAt: new Date().toISOString() });
  recordActivity(data, input.restaurantId, 'a créé une table et sa puce', 'table', table.id);
  writeData(data);
  return table;
}

export async function upsertCategory(input: { id?: string; restaurantId: string; name: string }) {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60) throw new Error('Le nom de catégorie doit contenir entre 2 et 60 caractères.');
  const data = readData();
  const existing = input.id ? data.categories.find(item => item.id === input.id && item.restaurantId === input.restaurantId) : null;
  if (existing) existing.name = name;
  else data.categories.push({ id: crypto.randomUUID(), restaurantId: input.restaurantId, name, sortOrder: data.categories.filter(item => item.restaurantId === input.restaurantId).length + 1 });
  recordActivity(data, input.restaurantId, existing ? 'a renommé une catégorie' : 'a créé une catégorie', 'menu', existing?.id ?? name);
  writeData(data);
  return data.categories.filter(item => item.restaurantId === input.restaurantId);
}

export async function upsertMenuItem(input: { id?: string; restaurantId: string; categoryId: string; name: string; price: number; taxRate: number; available: boolean }) {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 100 || !Number.isFinite(input.price) || input.price < 0 ||
      !Number.isFinite(input.taxRate) || input.taxRate < 0 || input.taxRate > 30) {
    throw new Error('Vérifiez le nom, le prix et le taux de TVA.');
  }
  const data = readData();
  const category = data.categories.find(item => item.id === input.categoryId && item.restaurantId === input.restaurantId);
  if (!category) throw new Error('Catégorie introuvable.');
  const existing = input.id ? data.items.find(item => item.id === input.id && item.restaurantId === input.restaurantId) : null;
  if (existing) Object.assign(existing, { categoryId: input.categoryId, name, price: Math.round(input.price), taxRate: input.taxRate, available: input.available });
  else data.items.push({ id: crypto.randomUUID(), restaurantId: input.restaurantId, categoryId: input.categoryId, name, price: Math.round(input.price), taxRate: input.taxRate, available: input.available });
  recordActivity(data, input.restaurantId, existing ? 'a modifié un produit du menu' : 'a ajouté un produit au menu', 'menu', existing?.id ?? name);
  writeData(data);
  return data.items.filter(item => item.restaurantId === input.restaurantId);
}

export async function toggleMenuItem(itemId: string, available: boolean) {
  const data = readData();
  const item = data.items.find(entry => entry.id === itemId);
  if (!item) throw new Error('Produit introuvable.');
  item.available = available;
  recordActivity(data, item.restaurantId, available ? 'a rendu un produit disponible' : 'a masqué un produit', 'menu', item.id);
  writeData(data);
  return item;
}

export async function deleteMenuItem(itemId: string) {
  const data = readData();
  const index = data.items.findIndex(item => item.id === itemId);
  if (index < 0) throw new Error('Produit introuvable.');
  const restaurantId = data.items[index].restaurantId;
  data.items.splice(index, 1);
  recordActivity(data, restaurantId, 'a supprimé un produit', 'menu', itemId);
  writeData(data);
}

export async function toggleTableTag(tableId: string, active: boolean) {
  const data = readData();
  const table = data.tables.find(item => item.id === tableId);
  const tag = data.tags.find(item => item.tableId === tableId);
  if (!table || !tag) throw new Error('Table ou puce introuvable.');
  tag.active = active;
  table.active = active;
  recordActivity(data, table.restaurantId, active ? 'a activé une puce de table' : 'a désactivé une puce de table', 'table', tableId);
  writeData(data);
}

export async function getDashboardData(restaurantId = demoRestaurantId) {
  const data = readData();
  const restaurant = data.restaurants.find(item => item.id === restaurantId);
  if (!restaurant) return null;
  const bills = data.bills.filter(bill => bill.restaurantId === restaurantId && !bill.reviewOnly);
  const payments = data.payments.filter(payment => payment.restaurantId === restaurantId && payment.status === 'paid');
  const reviews = data.reviews.filter(review => review.restaurantId === restaurantId);
  const tips = data.tips.filter(tip => tip.restaurantId === restaurantId && tip.status === 'paid');
  const scans = data.scans.filter(scan => scan.restaurantId === restaurantId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthReviews = reviews.filter(review => new Date(review.createdAt) >= monthStart);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.stars, 0) / reviews.length : 0;
  const revenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const todayRevenue = payments.filter(payment => new Date(payment.createdAt).toDateString() === now.toDateString()).reduce((sum, payment) => sum + payment.amount, 0);
  const itemSales = new Map<string, { name: string; quantity: number; total: number }>();
  for (const bill of bills) for (const line of bill.lines) {
    const sale = itemSales.get(line.itemId) ?? { name: line.name, quantity: 0, total: 0 };
    sale.quantity += line.quantity;
    sale.total += line.quantity * line.unitPrice;
    itemSales.set(line.itemId, sale);
  }
  const activeWaiters = data.users.filter(user => user.restaurantId === restaurantId && user.role === 'serveur' && user.active);
  const pooledTips = tips.filter(tip => tip.pooled).reduce((sum, tip) => sum + tip.amount, 0);
  const byWaiter = data.users.filter(user => user.restaurantId === restaurantId && user.role === 'serveur').map(waiter => {
    const waiterReviews = reviews.filter(review => review.waiterId === waiter.id);
    const waiterBills = bills.filter(bill => bill.waiterId === waiter.id);
    const waiterRevenue = payments.filter(payment => waiterBills.some(bill => bill.id === payment.billId)).reduce((sum, payment) => sum + payment.amount, 0);
    return {
      ...waiter,
      reviews: waiterReviews.length,
      averageRating: waiterReviews.length ? waiterReviews.reduce((sum, review) => sum + review.stars, 0) / waiterReviews.length : 0,
      revenue: waiterRevenue,
      tips: tips.filter(tip => !tip.pooled && tip.waiterId === waiter.id).reduce((sum, tip) => sum + tip.amount, 0) +
        (activeWaiters.length ? pooledTips / activeWaiters.length : 0)
    };
  });
  const daily = Array.from({ length: 30 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - offset));
    const key = date.toLocaleDateString('en-CA');
    return {
      label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      revenue: payments.filter(payment => new Date(payment.createdAt).toLocaleDateString('en-CA') === key).reduce((sum, payment) => sum + payment.amount, 0),
      reviews: reviews.filter(review => new Date(review.createdAt).toLocaleDateString('en-CA') === key).length
    };
  });
  const peakHours = Array.from({ length: 6 }, (_, index) => {
    const hour = 11 + index * 2;
    return { hour: `${hour}h`, count: bills.filter(bill => new Date(bill.createdAt).getHours() >= hour && new Date(bill.createdAt).getHours() < hour + 2).length };
  });
  const scansToday = scans.filter(scan => new Date(scan.createdAt).toDateString() === now.toDateString()).length;
  const openBills = bills.filter(bill => bill.status !== 'paid');
  const averageBasket = bills.length ? revenue / Math.max(1, bills.filter(bill => bill.status === 'paid').length) : 0;
  const byTable = data.tables.filter(table => table.restaurantId === restaurantId).map(table => {
    const tableBills = bills.filter(bill => bill.tableId === table.id);
    const tableBillIds = new Set(tableBills.map(bill => bill.id));
    const tableRevenue = payments.filter(payment => tableBillIds.has(payment.billId)).reduce((sum, payment) => sum + payment.amount, 0);
    const tableReviews = reviews.filter(review => review.tableId === table.id);
    return {
      table,
      scans: scans.filter(scan => scan.tableId === table.id).length,
      reviews: tableReviews.length,
      averageRating: tableReviews.length ? tableReviews.reduce((sum, review) => sum + review.stars, 0) / tableReviews.length : 0,
      revenue: tableRevenue,
      averageBasket: tableBills.length ? tableRevenue / Math.max(1, tableBills.filter(bill => bill.status === 'paid').length) : 0
    };
  });
  return {
    restaurant, bills, payments, reviews, tips, scans, byWaiter, byTable, daily, peakHours, openBills,
    totalRevenue: revenue, todayRevenue, averageBasket, averageRating: average,
    monthReviews: monthReviews.length, scansToday,
    tipsTotal: tips.reduce((sum, tip) => sum + tip.amount, 0),
    topProducts: [...itemSales.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
    lowReviews: reviews.filter(review => review.stars <= 2 && !review.treated).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  };
}

export async function getWaiterStats(restaurantId = demoRestaurantId) {
  const dashboard = await getDashboardData(restaurantId);
  return dashboard?.byWaiter ?? [];
}

export async function getAllBills() {
  return readData().bills;
}

export async function getAllReviews() {
  return readData().reviews;
}

export async function getAllScans() {
  return readData().scans;
}

export async function createRestaurant(input: { name: string; city: string; currency: 'EUR' | 'DZD'; packPrice: number; referralCode?: string; resellerCode?: string; ownerGroupId?: string }) {
  if (input.name.trim().length < 2 || input.name.trim().length > 100) throw new Error('Le nom du restaurant doit contenir entre 2 et 100 caractères.');
  if (!Number.isFinite(input.packPrice) || input.packPrice < 0) throw new Error('Le prix du pack est invalide.');
  const data = readData();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const reseller = input.resellerCode?.trim()
    ? data.resellers.find(item => item.code?.toLowerCase() === input.resellerCode?.trim().toLowerCase() && item.status === 'approved')
    : undefined;
  if (input.resellerCode?.trim() && !reseller) throw new Error('Code revendeur inconnu ou en attente de validation.');
  const referrer = input.referralCode ? data.restaurants.find(item => item.referralCode?.toLowerCase() === input.referralCode?.trim().toLowerCase()) : undefined;
  const trialEndsAt = new Date(Date.now() + (referrer ? 60 : 30) * 86400000).toISOString();
  const restaurant: RestaurantAccount = {
    id, name: input.name.trim(), city: input.city.trim(), address: '', googleReviewUrl: '',
    currency: input.currency, taxRate: input.currency === 'DZD' ? 9 : 10, logoUrl: '', accentColor: '#c99445',
    subscriptionStatus: 'trialing', trialEndsAt, createdAt: now,
    ownerGroupId: input.ownerGroupId ?? crypto.randomUUID(),
    resellerId: reseller?.id,
    installationAmountEUR: input.packPrice,
    referralCode: `DGF-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`,
    referredBy: referrer?.id,
    referralRewardApplied: Boolean(referrer)
  };
  const current = data.starBonus ?? createStarBonusSeed();
  current.baselines.push({
    restaurantId: id, rating: null, reviewCount: null, establishedAt: now,
    googleReviewUrl: restaurant.googleReviewUrl, updatedBy: 'super_admin'
  });
  data.starBonus = current;
  data.restaurants.push(restaurant);
  data.users.push({ id: crypto.randomUUID(), restaurantId: id, name: 'Gérant', role: 'admin_restaurant', active: true, pin: '2025' });
  const defaultCategory: MenuCategory = { id: crypto.randomUUID(), restaurantId: id, name: 'Menu', sortOrder: 1 };
  data.categories.push(defaultCategory);
  for (let index = 0; index < 6; index += 1) {
    const table: RestaurantTable = { id: crypto.randomUUID(), restaurantId: id, name: `Table ${String(index + 1).padStart(2, '0')}`, zone: 'Salle', status: 'free', tagCode: uniqueTagCode(data, 'DF'), active: true };
    data.tables.push(table);
    data.tags.push({ code: table.tagCode, restaurantId: id, tableId: table.id, active: true, createdAt: now });
  }
  if (referrer) {
    const previousEnd = new Date(referrer.trialEndsAt);
    referrer.trialEndsAt = new Date(Math.max(previousEnd.getTime(), Date.now()) + 30 * 86400000).toISOString();
    data.referrals.push({ id: crypto.randomUUID(), code: referrer.referralCode ?? '', referrerRestaurantId: referrer.id, referredRestaurantId: id, status: 'rewarded', rewardedAt: now });
    recordActivity(data, referrer.id, 'a parrainé un nouveau restaurant', 'parrainage', id);
  }
  window.localStorage.setItem('digifeel-selected-restaurant', id);
  writeData(data);
  return { restaurant };
}

export async function createTagBatch(restaurantId: string | null, count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 250) throw new Error('Choisissez un lot de 1 à 250 puces.');
  const data = readData();
  const created: Tag[] = [];
  for (let index = 0; index < count; index += 1) {
    const code = uniqueTagCode(data, 'DG');
    const tag: Tag = { code, restaurantId, tableId: null, active: true, createdAt: new Date().toISOString() };
    data.tags.push(tag);
    created.push(tag);
  }
  writeData(data);
  return created;
}

export async function getPackPrices() {
  return [...readData().packPrices];
}

export async function setPackPrices(prices: number[]) {
  if (prices.length !== 3 || prices.some(price => !Number.isFinite(price) || price < 0 || price > 100_000)) {
    throw new Error('Saisissez trois tarifs valides.');
  }
  const data = readData();
  data.packPrices = prices.map(price => Math.round(price));
  writeData(data);
  return data.packPrices;
}

export async function getStarBonusConfig() {
  return readData().starBonus.config;
}

export async function updateStarBonusConfig(config: StarBonusConfig, actorRole: RestaurantRole) {
  if (actorRole !== 'super_admin') throw new Error('Seul le super-admin peut modifier les règles de prime.');
  if (!['cumulative', 'highest_only'].includes(config.mode) ||
    !Number.isFinite(config.monthlyCapEUR) || config.monthlyCapEUR < 0 || config.monthlyCapEUR > 1_000_000 ||
    !Number.isFinite(config.minimumObservationDays) || config.minimumObservationDays < 0 || config.minimumObservationDays > 3650 ||
    !Number.isFinite(config.monthlySubscriptionEUR) || config.monthlySubscriptionEUR < 0 || config.monthlySubscriptionEUR > 1_000_000 ||
    !Number.isInteger(config.monthEndFreshnessDays) || config.monthEndFreshnessDays < 1 || config.monthEndFreshnessDays > 31 ||
    !Number.isInteger(config.anomalyWindowHours) || config.anomalyWindowHours < 1 || config.anomalyWindowHours > 720 ||
    !Number.isInteger(config.anomalyReviewLimit) || config.anomalyReviewLimit < 2 || config.anomalyReviewLimit > 100_000 ||
    !Number.isInteger(config.sameDeviceReviewLimit) || config.sameDeviceReviewLimit < 2 || config.sameDeviceReviewLimit > 1000 ||
    !Array.isArray(config.tiers) || config.tiers.length < 1 || config.tiers.length > 20) {
    throw new Error('Les règles de prime contiennent des valeurs invalides.');
  }
  const ids = new Set<string>();
  for (const tier of config.tiers) {
    if (!/^[a-zA-Z0-9_-]{2,60}$/.test(tier.id) || ids.has(tier.id) || !Number.isFinite(tier.increase) ||
      tier.increase <= 0 || tier.increase > 5 || !Number.isFinite(tier.amountEUR) ||
      tier.amountEUR < 0 || tier.amountEUR > 1_000_000) {
      throw new Error('Chaque palier doit avoir un identifiant unique et des valeurs positives.');
    }
    ids.add(tier.id);
  }
  const data = readData();
  data.starBonus.config = {
    ...config,
    tiers: config.tiers.map(tier => ({ ...tier })).sort((a, b) => a.increase - b.increase)
  };
  writeData(data);
  return data.starBonus.config;
}

export async function setStarBonusBaseline(input: {
  restaurantId: string;
  rating: number;
  reviewCount: number;
  establishedAt: string;
}, actorRole: RestaurantRole) {
  if (actorRole !== 'super_admin') throw new Error('La note de départ est modifiable uniquement par le super-admin.');
  if (!Number.isFinite(input.rating) || input.rating < 0 || input.rating > 5 ||
    !Number.isInteger(input.reviewCount) || input.reviewCount < 0 ||
    !Number.isFinite(Date.parse(input.establishedAt))) {
    throw new Error('Saisissez une note Google, un nombre d’avis et une date valides.');
  }
  const data = readData();
  const restaurant = data.restaurants.find(item => item.id === input.restaurantId);
  if (!restaurant) throw new Error('Restaurant introuvable.');
  const baseline: StarBonusBaseline = {
    restaurantId: restaurant.id, rating: Math.round(input.rating * 10) / 10, reviewCount: input.reviewCount,
    establishedAt: new Date(input.establishedAt).toISOString(), googleReviewUrl: restaurant.googleReviewUrl,
    updatedBy: 'super_admin'
  };
  const index = data.starBonus.baselines.findIndex(item => item.restaurantId === restaurant.id);
  if (index >= 0) data.starBonus.baselines[index] = baseline;
  else data.starBonus.baselines.push(baseline);
  data.starBonus.snapshots = data.starBonus.snapshots.filter(snapshot => snapshot.restaurantId !== restaurant.id || Date.parse(snapshot.observedAt) < Date.parse(baseline.establishedAt));
  if (baseline.rating !== null && baseline.reviewCount !== null) {
    data.starBonus.snapshots.push({
      id: crypto.randomUUID(), restaurantId: restaurant.id, rating: baseline.rating, reviewCount: baseline.reviewCount,
      observedAt: baseline.establishedAt, source: 'manual', googleReviewUrl: baseline.googleReviewUrl
    });
  }
  writeData(data);
  return baseline;
}

export async function addGoogleRatingSnapshot(input: {
  restaurantId: string;
  rating: number;
  reviewCount: number;
  source: GoogleRatingSnapshot['source'];
}, actorRole: RestaurantRole) {
  if (actorRole !== 'super_admin' && actorRole !== 'admin_restaurant' && actorRole !== 'manager') {
    throw new Error('Vous n’avez pas les droits pour mettre à jour la note Google.');
  }
  if (!Number.isFinite(input.rating) || input.rating < 0 || input.rating > 5 ||
    !Number.isInteger(input.reviewCount) || input.reviewCount < 0) {
    throw new Error('La note doit être entre 0 et 5 et le nombre d’avis un entier positif.');
  }
  const data = readData();
  const restaurant = data.restaurants.find(item => item.id === input.restaurantId);
  if (!restaurant) throw new Error('Restaurant introuvable.');
  const baseline = data.starBonus.baselines.find(item => item.restaurantId === restaurant.id);
  if (!baseline) throw new Error('La note de départ doit d’abord être définie par le super-admin.');
  const snapshot: GoogleRatingSnapshot = {
    id: crypto.randomUUID(), restaurantId: restaurant.id, rating: Math.round(input.rating * 10) / 10,
    reviewCount: input.reviewCount, observedAt: new Date().toISOString(), source: input.source,
    googleReviewUrl: restaurant.googleReviewUrl
  };
  data.starBonus.snapshots.push(snapshot);
  data.starBonus.snapshots.sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  detectStarBonusAnomalies(data, restaurant.id);
  writeData(data);
  return snapshot;
}

function monthPeriodBounds(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error('La période doit être au format AAAA-MM.');
  const [year, month] = period.split('-').map(Number);
  return {
    start: Date.UTC(year, month - 1, 1),
    end: Date.UTC(year, month, 0, 23, 59, 59, 999)
  };
}

export function calculateStarBonus(data: RestaurantData, restaurantId: string, period: string) {
  const bounds = monthPeriodBounds(period);
  const restaurant = data.restaurants.find(item => item.id === restaurantId);
  const baseline = data.starBonus.baselines.find(item => item.restaurantId === restaurantId);
  const result = { eligible: false, reason: '', baselineRating: baseline?.rating ?? null, currentRating: null as number | null, reviewCount: null as number | null, increase: 0, lines: [] as StarBonusInvoice['lines'], bonusEUR: 0, subscriptionEUR: data.starBonus.config.monthlySubscriptionEUR };
  if (!restaurant || !baseline) { result.reason = 'Note de départ indisponible.'; return result; }
  if (baseline.rating === null) { result.reason = 'Note de départ à définir par le super-admin.'; return result; }
  if (!restaurant.googleReviewUrl || baseline.googleReviewUrl !== restaurant.googleReviewUrl) { result.reason = 'Lien Google modifié : revalidez la note de départ.'; return result; }
  const previousMonth = new Date().toISOString().slice(0, 7);
  if (period >= previousMonth) { result.reason = 'La période doit être clôturée avant validation.'; return result; }
  const periodSnapshots = data.starBonus.snapshots
    .filter(snapshot => snapshot.restaurantId === restaurantId && Date.parse(snapshot.observedAt) >= bounds.start && Date.parse(snapshot.observedAt) <= bounds.end)
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  const latest = periodSnapshots[0];
  if (!latest) { result.reason = 'Aucune note relevée pendant cette période.'; return result; }
  result.currentRating = latest.rating;
  result.reviewCount = latest.reviewCount;
  const freshnessMs = data.starBonus.config.monthEndFreshnessDays * 86400000;
  if (bounds.end - Date.parse(latest.observedAt) > freshnessMs) { result.reason = 'La note doit être relevée près de la clôture du mois.'; return result; }
  if (bounds.end - Date.parse(baseline.establishedAt) < data.starBonus.config.minimumObservationDays * 86400000) { result.reason = 'Période minimale d’observation non atteinte.'; return result; }
  if (data.starBonus.anomalies.some(item => item.restaurantId === restaurantId && item.status === 'blocked')) { result.reason = 'Prime bloquée : anomalie en attente de vérification.'; return result; }
  result.increase = Math.round((latest.rating - baseline.rating) * 10) / 10;
  if (result.increase <= 0) { result.reason = 'Aucune prime : la note n’a pas progressé.'; return result; }
  const invoiced = new Set(data.starBonus.billedTierIds[restaurantId] ?? []);
  const activeTiers = data.starBonus.config.tiers.filter(tier => tier.active && tier.increase <= result.increase && !invoiced.has(tier.id));
  const selectedTiers = data.starBonus.config.mode === 'highest_only'
    ? activeTiers.slice(-1)
    : activeTiers;
  const previousBonus = data.starBonus.invoices
    .filter(invoice => invoice.restaurantId === restaurantId && invoice.period === period && invoice.status !== 'example')
    .reduce((sum, invoice) => sum + invoice.bonusEUR, 0);
  let remainingCap = Math.max(0, data.starBonus.config.monthlyCapEUR - previousBonus);
  for (const tier of selectedTiers) {
    if (tier.amountEUR <= remainingCap) {
      result.lines.push({ tierId: tier.id, increase: tier.increase, amountEUR: tier.amountEUR });
      remainingCap -= tier.amountEUR;
    }
  }
  result.bonusEUR = result.lines.reduce((sum, line) => sum + line.amountEUR, 0);
  if (result.bonusEUR === 0) { result.reason = 'Aucun nouveau palier facturable ou plafond mensuel atteint.'; return result; }
  result.eligible = true;
  return result;
}

export async function getStarBonusSummary(restaurantId: string) {
  const data = readData();
  const baseline = data.starBonus.baselines.find(item => item.restaurantId === restaurantId) ?? null;
  const snapshots = data.starBonus.snapshots.filter(item => item.restaurantId === restaurantId).sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  const latest = snapshots.at(-1) ?? null;
  const increase = baseline?.rating !== null && baseline?.rating !== undefined && latest ? Math.round((latest.rating - baseline.rating) * 10) / 10 : null;
  const nextTier = increase === null ? null : data.starBonus.config.tiers
    .filter(tier => tier.active && tier.increase > increase)
    .sort((a, b) => a.increase - b.increase)[0] ?? null;
  const inaccessibleTiers = baseline?.rating === null || baseline?.rating === undefined
    ? []
    : data.starBonus.config.tiers.filter(tier => tier.active && tier.increase > Math.round((5 - baseline.rating!) * 10) / 10);
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const currentEstimate = calculateStarBonus(data, restaurantId, currentPeriod);
  return {
    baseline, latest, snapshots: snapshots.slice(-12), increase, nextTier, inaccessibleTiers, currentEstimate,
    linkChanged: Boolean(baseline && data.restaurants.find(item => item.id === restaurantId)?.googleReviewUrl !== baseline.googleReviewUrl),
    blocked: data.starBonus.anomalies.some(item => item.restaurantId === restaurantId && item.status === 'blocked'),
    invoices: data.starBonus.invoices.filter(invoice => invoice.restaurantId === restaurantId).sort((a, b) => b.period.localeCompare(a.period))
  };
}

function detectStarBonusAnomalies(data: RestaurantData, restaurantId: string) {
  const config = data.starBonus.config;
  const cutoff = Date.now() - config.anomalyWindowHours * 3600000;
  const recent = data.reviews.filter(review => review.restaurantId === restaurantId && Date.parse(review.createdAt) >= cutoff);
  const byDevice = new Map<string, number>();
  for (const review of recent) {
    if (review.deviceFingerprint) byDevice.set(review.deviceFingerprint, (byDevice.get(review.deviceFingerprint) ?? 0) + 1);
  }
  const largestDeviceCount = Math.max(0, ...byDevice.values());
  const candidates: Array<{ kind: StarBonusAnomaly['kind']; reviewCount: number; deviceReviewCount: number }> = [];
  if (recent.length >= config.anomalyReviewLimit) candidates.push({ kind: 'review_spike', reviewCount: recent.length, deviceReviewCount: largestDeviceCount });
  if (largestDeviceCount >= config.sameDeviceReviewLimit) candidates.push({ kind: 'same_device', reviewCount: recent.length, deviceReviewCount: largestDeviceCount });
  for (const candidate of candidates) {
    const exists = data.starBonus.anomalies.some(item =>
      item.restaurantId === restaurantId && item.kind === candidate.kind && item.status === 'blocked' &&
      Date.now() - Date.parse(item.detectedAt) < 86400000
    );
    if (!exists) data.starBonus.anomalies.unshift({
      id: crypto.randomUUID(), restaurantId, kind: candidate.kind,
      reviewCount: candidate.reviewCount, windowHours: config.anomalyWindowHours,
      deviceReviewCount: candidate.deviceReviewCount, detectedAt: new Date().toISOString(), status: 'blocked'
    });
  }
}

export async function getStarBonusAdminData(period = new Date().toISOString().slice(0, 7)) {
  const data = readData();
  return {
    config: data.starBonus.config,
    restaurants: data.restaurants.map(restaurant => ({
      restaurant,
      baseline: data.starBonus.baselines.find(item => item.restaurantId === restaurant.id) ?? null,
      calculation: calculateStarBonus(data, restaurant.id, period),
      latest: data.starBonus.snapshots.filter(item => item.restaurantId === restaurant.id).sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0] ?? null,
      blocked: data.starBonus.anomalies.some(item => item.restaurantId === restaurant.id && item.status === 'blocked')
    })),
    invoices: [...data.starBonus.invoices].sort((a, b) => b.period.localeCompare(a.period)),
    anomalies: [...data.starBonus.anomalies].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
  };
}

export async function verifyStarBonusAnomaly(anomalyId: string, actorRole: RestaurantRole) {
  if (actorRole !== 'super_admin') throw new Error('Seul le super-admin peut vérifier cette anomalie.');
  const data = readData();
  const anomaly = data.starBonus.anomalies.find(item => item.id === anomalyId);
  if (!anomaly) throw new Error('Alerte antifraude introuvable.');
  anomaly.status = 'verified';
  anomaly.verifiedAt = new Date().toISOString();
  writeData(data);
  return anomaly;
}

export async function validateStarBonusPeriod(input: { restaurantId: string; period: string; method: import('./paymentProvider').PaymentMethod }, actorRole: RestaurantRole) {
  if (actorRole !== 'super_admin') throw new Error('Seul le super-admin peut valider une facture de prime.');
  const data = readData();
  const calculation = calculateStarBonus(data, input.restaurantId, input.period);
  if (input.period >= new Date().toISOString().slice(0, 7)) throw new Error('La période doit être clôturée avant validation.');
  if (!calculation.eligible && calculation.subscriptionEUR <= 0) throw new Error(calculation.reason || 'Aucune prime ou facture à valider.');
  if (data.starBonus.invoices.some(invoice => invoice.restaurantId === input.restaurantId && invoice.period === input.period && invoice.status !== 'example')) {
    throw new Error('Une facture existe déjà pour ce restaurant et cette période.');
  }
  const totalEUR = calculation.subscriptionEUR + calculation.bonusEUR;
  if (totalEUR <= 0) throw new Error('Le montant de facture doit être supérieur à zéro.');
  const { paymentProvider } = await import('./paymentProvider');
  const payment = await paymentProvider.charge({
    amount: totalEUR, currency: 'EUR', method: input.method,
    description: `Abonnement et prime Digifeel · ${input.period}`
  });
  const invoice: StarBonusInvoice = {
    id: crypto.randomUUID(),
    invoiceNumber: `DGF-${input.period.replace('-', '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    restaurantId: input.restaurantId, period: input.period,
    subscriptionEUR: calculation.subscriptionEUR, bonusEUR: calculation.bonusEUR, totalEUR,
    baselineRating: calculation.baselineRating, currentRating: calculation.currentRating,
    reviewCount: calculation.reviewCount, increase: calculation.increase,
    lines: calculation.lines,
    status: payment.status === 'paid' ? 'paid' : 'pending_manual',
    createdAt: new Date().toISOString(), providerReference: payment.reference
  };
  const attributedRestaurant = data.restaurants.find(restaurant => restaurant.id === input.restaurantId && restaurant.resellerId);
  if (attributedRestaurant?.resellerId) {
    const resellerPayment: ResellerPlatformPayment = {
      id: crypto.randomUUID(), resellerId: attributedRestaurant.resellerId,
      restaurantId: input.restaurantId, amountEUR: totalEUR, kind: 'subscription', reference: payment.reference,
      status: payment.status === 'paid' ? 'validated' : 'pending', createdAt: invoice.createdAt,
      ...(payment.status === 'paid' ? { validatedAt: invoice.createdAt } : {})
    };
    data.resellerPayments.push(resellerPayment);
    creditResellerCommission(data, resellerPayment);
  }
  data.starBonus.invoices.unshift(invoice);
  const billed = data.starBonus.billedTierIds[input.restaurantId] ?? [];
  data.starBonus.billedTierIds[input.restaurantId] = [...new Set([...billed, ...calculation.lines.map(line => line.tierId)])];
  writeData(data);
  return invoice;
}

export async function setSubscriptionStatus(restaurantId: string, status: RestaurantAccount['subscriptionStatus']) {
  return updateRestaurant(restaurantId, { subscriptionStatus: status });
}

export async function getSuperAdminOverview() {
  const data = readData();
  const dashboard = await Promise.all(data.restaurants.map(async restaurant => ({
    restaurant,
    overview: await getDashboardData(restaurant.id)
  })));
  return {
    restaurants: data.restaurants,
    tags: data.tags,
    totalScans: data.scans.length,
    totalPayments: data.payments.filter(payment => payment.status === 'paid').reduce((sum, payment) => sum + payment.amount, 0),
    totalTips: data.tips.filter(tip => tip.status === 'paid').reduce((sum, tip) => sum + tip.amount, 0),
    dashboards: dashboard,
    referrals: data.referrals
  };
}

export async function getSelectedRestaurantId() {
  if (typeof window === 'undefined') return demoRestaurantId;
  return window.localStorage.getItem('digifeel-selected-restaurant') ?? demoRestaurantId;
}

export async function selectRestaurant(restaurantId: string) {
  const data = readData();
  if (!data.restaurants.some(restaurant => restaurant.id === restaurantId)) throw new Error('Restaurant introuvable.');
  window.localStorage.setItem('digifeel-selected-restaurant', restaurantId);
  notifyChange();
}

export async function getOwnerOverview(ownerGroupId: string) {
  const data = readData();
  const restaurants = data.restaurants.filter(restaurant => restaurant.ownerGroupId === ownerGroupId);
  const dashboards = await Promise.all(restaurants.map(restaurant => getDashboardData(restaurant.id)));
  const entries = dashboards.filter((dashboard): dashboard is NonNullable<typeof dashboard> => Boolean(dashboard));
  const reviews = entries.flatMap(dashboard => dashboard.reviews);
  return {
    restaurants,
    revenue: entries.reduce((sum, dashboard) => sum + dashboard.totalRevenue, 0),
    revenueToday: entries.reduce((sum, dashboard) => sum + dashboard.todayRevenue, 0),
    scans: entries.reduce((sum, dashboard) => sum + dashboard.scans.length, 0),
    tips: entries.reduce((sum, dashboard) => sum + dashboard.tipsTotal, 0),
    reviews: reviews.length,
    averageRating: reviews.length ? reviews.reduce((sum, review) => sum + review.stars, 0) / reviews.length : 0,
    byRestaurant: entries.map(dashboard => ({ id: dashboard.restaurant.id, name: dashboard.restaurant.name, revenue: dashboard.totalRevenue, scans: dashboard.scans.length, reviews: dashboard.reviews.length, averageRating: dashboard.averageRating }))
  };
}

export async function loadPalmierDemo() {
  const data = makeSeedData();
  writeData(data);
  if (typeof window !== 'undefined') window.localStorage.setItem('digifeel-demo-mode', '1');
  return data;
}

export function isDemoModeEnabled() {
  return typeof window !== 'undefined' && window.localStorage.getItem('digifeel-demo-mode') === '1';
}

export async function recordTagScan(code: string) {
  const data = readData();
  const tag = data.tags.find(item => item.code.toLowerCase() === code.toLowerCase() && item.active && item.tableId);
  if (!tag?.restaurantId || !tag.tableId) return false;
  const rateLimitKey = `digifeel-scan:${tag.code.toLowerCase()}`;
  const lastScanAt = Number(window.localStorage.getItem(rateLimitKey) ?? 0);
  if (Date.now() - lastScanAt < 30_000) return false;
  window.localStorage.setItem(rateLimitKey, String(Date.now()));
  const scan: Scan = { id: crypto.randomUUID(), restaurantId: tag.restaurantId, tableId: tag.tableId, tagCode: tag.code, createdAt: new Date().toISOString() };
  data.scans.push(scan);
  writeData(data);
  return true;
}
