export interface StarTier {
  id: string;
  stars: number; // 1, 2, 3, 3.5, 4, 5
  name: string;
  badge: string;
  servicePrice: number; // 100€ pour 1★, 200€ pour 2★, 300€ pour 3★, 350€ pour 3.5★, 400€ pour 4★, 500€ pour 5★
  serverBonus: number;  // Prime débloquée pour l'équipe
  tagline: string;
  perks: string[];
}

export type EquipmentChoice = 'full_pack' | 'nfc_servers_only' | 'qr_tables_only';
export type ShippingPreference = 'on_site' | 'postal_shipping';
export type HardwareStatus = 'pending_encoding' | 'encoded' | 'shipped' | 'installed_on_site';
export type EstablishmentType = 'restaurant' | 'hotel';

export interface Waiter {
  id: string;
  restaurantId: string;
  name: string;
  role: string;
  avatarUrl?: string;
  nfcUid?: string;
  tablesAssigned?: number[];
  ratingAverage: number;
  totalReviews: number;
  totalTips: number;
  joinedDate: string;
}

export interface Review {
  id: string;
  restaurantId: string;
  waiterId: string;
  waiterName: string;
  tableNumber: number;
  rating: number; // 1 to 5, can be half stars (e.g. 3.5)
  compliments: string[];
  comment?: string;
  photoUrl?: string; // Base64 or URL of dish / atmosphere photo taken by customer
  tipAmount: number; // in Euros
  createdAt: string; // ISO date
  googleReviewClicked?: boolean;
}

export interface TableItem {
  number: number;
  restaurantId: string;
  zone: string;
  assignedWaiterId?: string;
  totalScans: number;
  lastRating?: number;
}

export interface RegisteredNfcChip {
  id: string; // e.g. "chip-1"
  uid: string; // NFC serial number (e.g. "04:8F:2A:B1:4C:6D:80")
  customName?: string; // Nom personnalisé de la puce (ex: "Puce Porte-Clé Serveur #1")
  restaurantId: string; // Restaurant auquel elle appartient
  restaurantName?: string;
  targetType: 'server' | 'table';
  targetId: string; // waiterId or tableNumber string
  targetName: string; // e.g. "David (Serveur)" or "Table N°4"
  assignedWaiterId?: string; // Serveur auquel elle appartient
  assignedTableNumbers?: number[]; // Tables assignées (ex: [1, 2, 3])
  payloadUrl: string; // e.g. "https://...?resto=david&server=waiter-1"
  status: 'active' | 'pending';
  encodedAt: string;
  lastScannedAt?: string;
  totalScans?: number;
}

export type MirrorThemeId = 'ice_glass' | 'specular_chrome' | 'amber_gold' | 'emerald_palace' | 'sapphire_cobalt' | 'ruby_velvet' | 'pure_gold';

export interface MirrorThemeConfig {
  id: MirrorThemeId;
  name: string;
  tagline: string;
  emoji: string;
  primaryColor: string;
  accentColor: string;
  bgGlow: string;
  borderGlow: string;
  gradient: string;
}

export interface RestaurantConfig {
  id: string;
  establishmentType?: EstablishmentType;
  slug: string; // for unique URL e.g. /?resto=david
  username: string; // Identifiant privé du restaurant
  accessPin: string; // Code secret PIN (ex: 2025)
  name: string;
  ownerName: string;
  email?: string;
  address: string;
  city: string;
  phone?: string;
  googleMapsUrl?: string;
  googleReviewUrl: string;
  googlePlaceId?: string;
  appCustomName?: string;
  setupKitCost: number; // 100
  tableCount: number;
  currency: string;
  baselineRating: number; // Note de départ du restaurant (ex: 2.0★ avant l'installation)
  starTiers: StarTier[];
  hasWebsite: boolean;
  websiteUrl?: string;
  equipmentChoice: EquipmentChoice;
  shippingPreference: ShippingPreference;
  hardwareStatus?: HardwareStatus;
  tipSharingConfig?: TipSharingConfig;
  registeredNfcChips?: RegisteredNfcChip[];
  mirrorTheme?: MirrorThemeId;
  mirrorSpecularMode?: boolean; // True for Silver Specular Mirror Glass Light Reflection
  createdAt?: string;
}

export type TipSharingMethod = 'hours_worked' | 'table_volume' | 'hybrid_pool' | 'equal_split' | 'individual';

export interface TipSharingConfig {
  enabled: boolean;
  method: TipSharingMethod;
  kitchenSupportCutPercentage: number; // % reserved for kitchen/bar support (e.g. 10%)
  individualRetentionPercentage: number; // For hybrid mode: % kept individually (e.g. 60%)
  waiterHours: { [waiterId: string]: number }; // Hours worked by waiter (e.g. 35)
  waiterCoefficients?: { [waiterId: string]: number }; // Role coefficients (e.g. 1.0, 1.2)
  payoutFrequency: 'shift' | 'weekly' | 'monthly';
  updatedAt?: string;
}

export interface WaiterTipDistribution {
  waiterId: string;
  waiterName: string;
  role: string;
  rawTipsCollected: number; // Tips directly scanned on waiter's NFC/tables
  hoursWorked: number;
  tablesServedCount: number;
  kitchenContribution: number;
  finalCalculatedPayout: number;
  differenceVsRaw: number; // positive or negative vs direct collection
  sharePercentage: number;
}

export interface TipPoolCalculationResult {
  totalGrossTips: number;
  totalKitchenCut: number;
  netDistributableTips: number;
  methodUsed: TipSharingMethod;
  totalHoursWorked: number;
  totalTablesServed: number;
  distributions: WaiterTipDistribution[];
}

export type PaymentMethodChoice = 'card_stripe' | 'ccp_algerie' | 'bank_transfer' | 'instant_phone' | 'on_delivery';

export interface ProviderPayoutConfig {
  accountHolder: string; // Nom du titulaire (Rahou Abdallah)
  iban: string;          // Votre IBAN pour recevoir les virements
  bic: string;           // Code BIC/SWIFT
  bankName: string;      // Nom de votre banque
  visaCardNumber?: string; // N° Carte Visa pour réception directe
  ccpAccountNumber?: string; // N° Compte CCP Algérie (ex: 0012345678)
  ccpKey?: string;           // Clé CCP Algérie (ex: 99)
  baridiMobRip?: string;     // RIP BaridiMob 20 chiffres (ex: 00799999001234567899)
  phonePayment: string;  // Numéro pour Wero / Paylib / BaridiMob
  stripePaymentLink?: string; // Lien de paiement par carte (optionnel)
  contactEmail: string;  // Votre email de notification (rahouabdallah27@gmail.com)
  whatsappNumber: string; // Votre WhatsApp pour recevoir le message
}

export interface FaqItem {
  id: string;
  restaurantId: string;
  question: string;
  answer: string;
  category: 'paiement' | 'service' | 'reputation' | 'restaurant' | 'general';
  isPublic: boolean;
  order: number;
  updatedAt?: string;
}

export interface EmailLog {
  id: string;
  to: string;
  restaurantId: string;
  restaurantName: string;
  ownerName: string;
  slug: string;
  pin: string;
  dashboardUrl: string;
  subject: string;
  sentAt: string;
  status: 'delivered' | 'opened' | 'pending';
  chipsCount: number;
  qrCount: number;
  paymentAmount: number;
  invoiceNumber?: string;
  transactionId?: string;
  shippingPreference?: ShippingPreference;
  trackingNumber?: string;
  smtpServer?: string;
  tlsVersion?: string;
  dkimStatus?: string;
}

export type ManagerNotificationType = 'new_review' | 'new_tip' | 'review_and_tip';

export interface ManagerToastNotification {
  id: string;
  type: ManagerNotificationType;
  restaurantId: string;
  restaurantName: string;
  waiterId: string;
  waiterName: string;
  tableNumber: number;
  rating: number;
  tipAmount: number;
  compliments: string[];
  comment?: string;
  photoUrl?: string;
  createdAt: string;
  read: boolean;
}
