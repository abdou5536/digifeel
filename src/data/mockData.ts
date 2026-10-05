import { RestaurantConfig, Waiter, Review, TableItem, StarTier, ProviderPayoutConfig, EmailLog, FaqItem } from '../types';
import { generateRealisticHistoricalReviews } from '../utils/analyticsData';
import { DEFAULT_TIP_SHARING_CONFIG } from '../utils/tipSharingUtils';

export const DEFAULT_PROVIDER_PAYOUT: ProviderPayoutConfig = {
  accountHolder: '',
  iban: '',
  bic: '',
  bankName: '',
  visaCardNumber: '',
  ccpAccountNumber: '',
  ccpKey: '',
  baridiMobRip: '',
  phonePayment: '',
  stripePaymentLink: '',
  contactEmail: '',
  whatsappNumber: ''
};

export const DEFAULT_STAR_TIERS: StarTier[] = [
  {
    id: 'tier-1',
    stars: 1,
    name: 'Palier 1 Étoile',
    badge: 'Départ Base',
    servicePrice: 100,
    serverBonus: 25,
    tagline: 'Mise en place initiale des puces NFC & QR',
    perks: [
      'Installation des puces serveurs et chevalets',
      'Accès initial au tableau de bord'
    ]
  },
  {
    id: 'tier-2',
    stars: 2,
    name: 'Palier 2 Étoiles',
    badge: 'Progression Initiale',
    servicePrice: 200,
    serverBonus: 50,
    tagline: 'Amorçage de la réputation du restaurant',
    perks: [
      'Filtrage des avis négatifs en salle',
      'Premières augmentations de pourboires'
    ]
  },
  {
    id: 'tier-3',
    stars: 3,
    name: 'Palier 3 Étoiles',
    badge: 'Standard Atteint',
    servicePrice: 300,
    serverBonus: 80,
    tagline: 'Service régulier et conforme aux attentes',
    perks: [
      'Rapports hebdomadaires de satisfaction',
      'Statistiques détaillées par serveur et par table'
    ]
  },
  {
    id: 'tier-3-5',
    stars: 3.5,
    name: 'Palier 3 Étoiles et demie',
    badge: 'Forte Progression (+0.5★)',
    servicePrice: 350,
    serverBonus: 120,
    tagline: '150 € pour le cap des 0.5 étoiles franchi !',
    perks: [
      'Booster d’avis Google Maps activé',
      '+35% de pourboires dématérialisés pour l’équipe'
    ]
  },
  {
    id: 'tier-4',
    stars: 4,
    name: 'Palier 4 Étoiles',
    badge: 'Haute Réputation',
    servicePrice: 400,
    serverBonus: 150,
    tagline: 'Restaurant très apprécié et recommandé',
    perks: [
      'Redirection automatique des avis positifs',
      'Affluence en hausse sur Google Maps'
    ]
  },
  {
    id: 'tier-5',
    stars: 5,
    name: 'Palier 5 Étoiles',
    badge: 'Excellence Suprême',
    servicePrice: 500,
    serverBonus: 200,
    tagline: 'Perfection absolue, réputation n°1 du quartier',
    perks: [
      'Certification Restaurant d’Élite 5★',
      '100% de redirection vers Google Reviews',
      'Prime maximale versée à l’équipe'
    ]
  }
];

// Demo Establishments (Restaurant & Hotel)
export const INITIAL_RESTAURANTS: RestaurantConfig[] = [
  {
    id: 'resto-demo',
    establishmentType: 'restaurant',
    slug: 'bistro-parisien',
    username: 'bistro-parisien',
    accessPin: '2025',
    name: 'Le Bistro Parisien (Compte Restaurant)',
    ownerName: 'David M.',
    email: 'david.gerant@lebistroparisien.fr',
    address: '24 Rue de la Paix',
    city: 'Paris (75002)',
    phone: '',
    googleReviewUrl: 'https://g.page/r/bistro-parisien/review',
    setupKitCost: 100,
    tableCount: 16,
    currency: '€',
    baselineRating: 2.0, // Le restaurant était à 2 étoiles au départ !
    starTiers: DEFAULT_STAR_TIERS,
    hasWebsite: false,
    websiteUrl: '',
    equipmentChoice: 'full_pack',
    shippingPreference: 'on_site',
    hardwareStatus: 'installed_on_site',
    tipSharingConfig: DEFAULT_TIP_SHARING_CONFIG,
    createdAt: '2025-01-15'
  },
  {
    id: 'hotel-demo',
    establishmentType: 'hotel',
    slug: 'grand-hotel-riviera',
    username: 'grand-hotel-riviera',
    accessPin: '5555',
    name: 'Grand Hôtel Riviera & Palace 5★ (Compte Hôtel)',
    ownerName: 'Édouard de Montmirail',
    email: 'direction@grandhotelriviera.fr',
    address: '45 Boulevard de la Croisette',
    city: 'Cannes (06400)',
    phone: '04 93 39 00 00',
    googleReviewUrl: 'https://g.page/r/grand-hotel-riviera/review',
    setupKitCost: 100,
    tableCount: 20, // 20 Chambres & Suites
    currency: '€',
    baselineRating: 3.5,
    starTiers: DEFAULT_STAR_TIERS,
    hasWebsite: true,
    websiteUrl: 'https://grandhotelriviera.fr',
    equipmentChoice: 'full_pack',
    shippingPreference: 'on_site',
    hardwareStatus: 'installed_on_site',
    tipSharingConfig: {
      ...DEFAULT_TIP_SHARING_CONFIG,
      waiterHours: {
        'waiter-alexandre': 39,
        'waiter-camille': 35,
        'waiter-maxime': 35,
        'waiter-sofia': 30
      },
      waiterCoefficients: {
        'waiter-alexandre': 1.2,
        'waiter-camille': 1.0,
        'waiter-maxime': 1.0,
        'waiter-sofia': 1.0
      }
    },
    createdAt: '2025-01-20'
  }
];

export const INITIAL_WAITERS: Waiter[] = [
  // Restaurant staff
  {
    id: 'waiter-david',
    restaurantId: 'resto-demo',
    name: 'David',
    role: 'Chef de rang & Fondateur',
    avatarUrl: '/src/assets/images/waiter_pro_portrait_1790438496943.jpg',
    nfcUid: 'NFC-DAV-001',
    tablesAssigned: [1, 2, 3, 4, 5],
    ratingAverage: 4.9,
    totalReviews: 86,
    totalTips: 215,
    joinedDate: '2025-01-10'
  },
  {
    id: 'waiter-sarah',
    restaurantId: 'resto-demo',
    name: 'Sarah',
    role: 'Serveuse principale',
    nfcUid: 'NFC-SAR-002',
    tablesAssigned: [6, 7, 8, 9, 10],
    ratingAverage: 4.8,
    totalReviews: 64,
    totalTips: 168,
    joinedDate: '2025-02-01'
  },
  {
    id: 'waiter-lucas',
    restaurantId: 'resto-demo',
    name: 'Lucas',
    role: 'Chef de rang terrasse',
    nfcUid: 'NFC-LUC-003',
    tablesAssigned: [11, 12, 13, 14, 15, 16],
    ratingAverage: 4.7,
    totalReviews: 52,
    totalTips: 142,
    joinedDate: '2025-03-15'
  },
  // Hotel staff
  {
    id: 'waiter-alexandre',
    restaurantId: 'hotel-demo',
    name: 'Alexandre',
    role: 'Chef Concierge Clefs d\'Or',
    nfcUid: 'NFC-HTL-001',
    tablesAssigned: [101, 102, 103, 104, 201, 202],
    ratingAverage: 5.0,
    totalReviews: 92,
    totalTips: 480,
    joinedDate: '2025-01-10'
  },
  {
    id: 'waiter-camille',
    restaurantId: 'hotel-demo',
    name: 'Camille',
    role: 'Responsable Réception & Guest Relations',
    nfcUid: 'NFC-HTL-002',
    tablesAssigned: [105, 106, 107, 108, 203, 204],
    ratingAverage: 4.9,
    totalReviews: 76,
    totalTips: 320,
    joinedDate: '2025-01-15'
  },
  {
    id: 'waiter-maxime',
    restaurantId: 'hotel-demo',
    name: 'Maxime',
    role: 'Responsable Room Service & Bar de Nuit',
    nfcUid: 'NFC-HTL-003',
    tablesAssigned: [205, 206, 207, 208, 301, 302],
    ratingAverage: 4.8,
    totalReviews: 68,
    totalTips: 290,
    joinedDate: '2025-02-01'
  },
  {
    id: 'waiter-sofia',
    restaurantId: 'hotel-demo',
    name: 'Sofia',
    role: 'Gouvernante Principale d\'Étage',
    nfcUid: 'NFC-HTL-004',
    tablesAssigned: [303, 304, 305, 306, 401, 402],
    ratingAverage: 4.9,
    totalReviews: 54,
    totalTips: 245,
    joinedDate: '2025-02-10'
  }
];

export const COMPLIMENT_OPTIONS = [
  'Sourire & Accueil chaleureux',
  'Service ultra-rapide',
  'Excellents conseils vins & plats',
  'Très attentionné & pro',
  'Ambiance au top',
  'Discret et efficace'
];

const LATEST_LIVE_REVIEWS: Review[] = [
  {
    id: 'rev-001',
    restaurantId: 'resto-demo',
    waiterId: 'waiter-david',
    waiterName: 'David',
    tableNumber: 3,
    rating: 5,
    compliments: ['Sourire & Accueil chaleureux', 'Excellents conseils vins & plats'],
    comment: 'David a été formidable, des conseils vins précis et un service très fluide !',
    tipAmount: 5,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    googleReviewClicked: true
  },
  {
    id: 'rev-002',
    restaurantId: 'resto-demo',
    waiterId: 'waiter-sarah',
    waiterName: 'Sarah',
    tableNumber: 8,
    rating: 5,
    compliments: ['Service ultra-rapide', 'Très attentionné & pro'],
    comment: 'Superbe expérience, service rapide pendant notre déjeuner.',
    tipAmount: 3,
    createdAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    googleReviewClicked: true
  },
  {
    id: 'rev-003',
    restaurantId: 'resto-demo',
    waiterId: 'waiter-lucas',
    waiterName: 'Lucas',
    tableNumber: 12,
    rating: 4,
    compliments: ['Ambiance au top', 'Sourire & Accueil chaleureux'],
    comment: 'Terrasse très agréable et serveur plein d’énergie positive.',
    tipAmount: 2,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    googleReviewClicked: false
  },
  {
    id: 'rev-004',
    restaurantId: 'resto-demo',
    waiterId: 'waiter-david',
    waiterName: 'David',
    tableNumber: 2,
    rating: 5,
    compliments: ['Discret et efficace', 'Excellents conseils vins & plats'],
    comment: 'Un sans-faute pour notre dîner d’équipe. Merci David !',
    tipAmount: 10,
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    googleReviewClicked: true
  }
];

const HOTEL_LIVE_REVIEWS: Review[] = [
  {
    id: 'rev-h01',
    restaurantId: 'hotel-demo',
    waiterId: 'waiter-alexandre',
    waiterName: 'Alexandre',
    tableNumber: 201, // Suite 201
    rating: 5,
    compliments: ['Accueil d\'exception', 'Conciergerie au top', 'Très attentionné & pro'],
    comment: 'Alexandre a organisé nos réservations et transferts avec une perfection digne des plus grands palaces !',
    tipAmount: 20,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    googleReviewClicked: true
  },
  {
    id: 'rev-h02',
    restaurantId: 'hotel-demo',
    waiterId: 'waiter-camille',
    waiterName: 'Camille',
    tableNumber: 104, // Chambre 104
    rating: 5,
    compliments: ['Sourire & Accueil chaleureux', 'Service ultra-rapide'],
    comment: 'Check-in rapide, surclassement inattendu avec vue sur la Croisette, merci Camille !',
    tipAmount: 15,
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    googleReviewClicked: true
  },
  {
    id: 'rev-h03',
    restaurantId: 'hotel-demo',
    waiterId: 'waiter-maxime',
    waiterName: 'Maxime',
    tableNumber: 301, // Penthouse 301
    rating: 5,
    compliments: ['Excellents conseils vins & plats', 'Discret et efficace'],
    comment: 'Room service de nuit impeccable, champagne servi à température idéale.',
    tipAmount: 25,
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    googleReviewClicked: true
  }
];

export const INITIAL_REVIEWS: Review[] = [
  ...LATEST_LIVE_REVIEWS,
  ...generateRealisticHistoricalReviews('resto-demo', INITIAL_WAITERS.filter(w => w.restaurantId === 'resto-demo'), 2.0),
  ...HOTEL_LIVE_REVIEWS,
  ...generateRealisticHistoricalReviews('hotel-demo', INITIAL_WAITERS.filter(w => w.restaurantId === 'hotel-demo'), 3.5)
];

const RESTO_TABLES: TableItem[] = Array.from({ length: 16 }, (_, i) => {
  const num = i + 1;
  const waiterId = num <= 5 ? 'waiter-david' : num <= 10 ? 'waiter-sarah' : 'waiter-lucas';
  const zone = num <= 5 ? 'Salle Principale' : num <= 10 ? 'Véranda' : 'Terrasse';
  return {
    number: num,
    restaurantId: 'resto-demo',
    zone,
    assignedWaiterId: waiterId,
    totalScans: 15 + (num % 7) * 4,
    lastRating: 4.8
  };
});

const HOTEL_ROOMS: TableItem[] = [
  // 1er étage - Chambres Deluxe
  { number: 101, restaurantId: 'hotel-demo', zone: '1er Étage - Deluxe', assignedWaiterId: 'waiter-alexandre', totalScans: 38, lastRating: 5.0 },
  { number: 102, restaurantId: 'hotel-demo', zone: '1er Étage - Deluxe', assignedWaiterId: 'waiter-alexandre', totalScans: 44, lastRating: 4.9 },
  { number: 103, restaurantId: 'hotel-demo', zone: '1er Étage - Deluxe', assignedWaiterId: 'waiter-alexandre', totalScans: 29, lastRating: 5.0 },
  { number: 104, restaurantId: 'hotel-demo', zone: '1er Étage - Deluxe', assignedWaiterId: 'waiter-camille', totalScans: 51, lastRating: 4.9 },
  { number: 105, restaurantId: 'hotel-demo', zone: '1er Étage - Deluxe', assignedWaiterId: 'waiter-camille', totalScans: 33, lastRating: 4.8 },
  // 2e étage - Suites Exécutives
  { number: 201, restaurantId: 'hotel-demo', zone: '2e Étage - Suites', assignedWaiterId: 'waiter-alexandre', totalScans: 62, lastRating: 5.0 },
  { number: 202, restaurantId: 'hotel-demo', zone: '2e Étage - Suites', assignedWaiterId: 'waiter-alexandre', totalScans: 58, lastRating: 5.0 },
  { number: 203, restaurantId: 'hotel-demo', zone: '2e Étage - Suites', assignedWaiterId: 'waiter-camille', totalScans: 47, lastRating: 4.9 },
  { number: 204, restaurantId: 'hotel-demo', zone: '2e Étage - Suites', assignedWaiterId: 'waiter-camille', totalScans: 39, lastRating: 5.0 },
  { number: 205, restaurantId: 'hotel-demo', zone: '2e Étage - Suites', assignedWaiterId: 'waiter-maxime', totalScans: 41, lastRating: 4.8 },
  // 3e étage - Penthouses & Rooftop
  { number: 301, restaurantId: 'hotel-demo', zone: '3e Étage - Penthouses', assignedWaiterId: 'waiter-maxime', totalScans: 75, lastRating: 5.0 },
  { number: 302, restaurantId: 'hotel-demo', zone: '3e Étage - Penthouses', assignedWaiterId: 'waiter-maxime', totalScans: 68, lastRating: 4.9 },
  { number: 303, restaurantId: 'hotel-demo', zone: '3e Étage - Penthouses', assignedWaiterId: 'waiter-sofia', totalScans: 52, lastRating: 4.9 },
  { number: 304, restaurantId: 'hotel-demo', zone: '3e Étage - Penthouses', assignedWaiterId: 'waiter-sofia', totalScans: 46, lastRating: 5.0 }
];

export const INITIAL_TABLES: TableItem[] = [
  ...RESTO_TABLES,
  ...HOTEL_ROOMS
];

export const INITIAL_EMAIL_LOGS: EmailLog[] = [
  {
    id: 'mail-init-demo',
    to: 'david.gerant@lebistroparisien.fr',
    restaurantId: 'resto-demo',
    restaurantName: 'Le Bistro Parisien',
    ownerName: 'David M.',
    slug: 'bistro-parisien',
    pin: '2025',
    dashboardUrl: '/?resto=bistro-parisien&view=manager',
    subject: '🎉 Vos identifiants & activation du Pack NFC (100 €) - Le Bistro Parisien',
    sentAt: '2025-01-15T10:30:00Z',
    status: 'delivered',
    chipsCount: 5,
    qrCount: 16,
    paymentAmount: 100
  }
];

export const INITIAL_FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    restaurantId: 'resto-demo',
    question: 'Comment fonctionne le pourboire sans contact ?',
    answer: 'Il vous suffit de sélectionner le pourcentage ou le montant souhaité, puis de valider votre règlement via Apple Pay, Google Pay ou carte bancaire sans contact. 100% de la somme est directement reversée au serveur sans intermédiaire.',
    category: 'paiement',
    isPublic: true,
    order: 1,
    updatedAt: '2025-01-15T10:00:00Z'
  },
  {
    id: 'faq-2',
    restaurantId: 'resto-demo',
    question: 'Est-ce que 100% du pourboire revient à mon serveur(se) ?',
    answer: 'Oui, absolument. Le restaurant et la plateforme Digifeel garantissent une redistribution intégrale et instantanée de vos gratifications sur le compte individuel du serveur.',
    category: 'paiement',
    isPublic: true,
    order: 2,
    updatedAt: '2025-01-15T10:00:00Z'
  },
  {
    id: 'faq-3',
    restaurantId: 'resto-demo',
    question: 'Comment fonctionne la puce NFC sur la table ou le badge ?',
    answer: 'Approchez simplement le haut de votre smartphone à 2 cm du disque noir ou du badge. Aucune application ni inscription n’est requise, la page de votre table s’ouvre en moins de 0.2 seconde.',
    category: 'service',
    isPublic: true,
    order: 3,
    updatedAt: '2025-01-15T10:00:00Z'
  },
  {
    id: 'faq-4',
    restaurantId: 'resto-demo',
    question: 'Comment mon avis 5 étoiles est-il synchronisé avec Google Maps ?',
    answer: 'Si vous attribuez une note de 4 ou 5 étoiles, un bouton direct vous permet de publier votre recommandation sur notre fiche officielle Google Maps en 1 clic pour soutenir notre brigade.',
    category: 'reputation',
    isPublic: true,
    order: 4,
    updatedAt: '2025-01-15T10:00:00Z'
  },
  {
    id: 'faq-5',
    restaurantId: 'resto-demo',
    question: 'Puis-je obtenir une facture ou un reçu de mon règlement ?',
    answer: 'Oui, un récapitulatif numérique certifié est affiché immédiatement après confirmation et peut être téléchargé ou consulté pour vos notes de frais.',
    category: 'restaurant',
    isPublic: true,
    order: 5,
    updatedAt: '2025-01-15T10:00:00Z'
  },
  {
    id: 'faq-6',
    restaurantId: 'resto-demo',
    question: 'Mes coordonnées bancaires sont-elles sécurisées ?',
    answer: 'Le protocole utilise le chiffrement bancaire de niveau 1 certifié PCI-DSS et Apple Pay / Google Pay. Aucune donnée bancaire n’est stockée sur nos serveurs.',
    category: 'paiement',
    isPublic: true,
    order: 6,
    updatedAt: '2025-01-15T10:00:00Z'
  },
  // Hotel FAQs
  {
    id: 'faq-h1',
    restaurantId: 'hotel-demo',
    question: 'Comment gratifier le personnel de l\'hôtel (Conciergerie, Room Service, Gouvernante) ?',
    answer: 'Flânez simplement sur le chevalet NFC posé sur votre bureau ou table de chevet en chambre. Vous pouvez choisir quel membre de l\'équipe gratifier directement ou partager sur le pot de l\'équipe hôtelière.',
    category: 'paiement',
    isPublic: true,
    order: 1,
    updatedAt: '2025-01-20T10:00:00Z'
  },
  {
    id: 'faq-h2',
    restaurantId: 'hotel-demo',
    question: 'Est-il possible de laisser un avis Google Maps 5 étoiles pour l\'hôtel ?',
    answer: 'Oui ! Dès validation de votre note de séjour, un lien instantané vous redirige vers la fiche officielle Google Maps de l\'établissement pour partager votre recommandation aux futurs voyageurs.',
    category: 'reputation',
    isPublic: true,
    order: 2,
    updatedAt: '2025-01-20T10:00:00Z'
  },
  {
    id: 'faq-h3',
    restaurantId: 'hotel-demo',
    question: 'La conciergerie ou le room service reçoivent-ils immédiatement mon pourboire ?',
    answer: 'Absolument. Chaque collaborateur dispose de son badge NFC ou de son affectation de chambre. Le versement est instantané, sans frais et exonéré de cotisations sociales.',
    category: 'service',
    isPublic: true,
    order: 3,
    updatedAt: '2025-01-20T10:00:00Z'
  }
];
