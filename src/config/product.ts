export const PRODUCT_PRICING = {
  monthlySubscriptionEuros: 19,
  subscriptionName: 'Tableau de bord Digifeel',
  subscriptionTrialDays: 30,
  installationPacks: {
    nfc: {
      id: 'nfc',
      priceEuros: 60,
      name: 'Pack NFC',
      summary: '5 puces NFC prêtes à poser',
      features: ['5 puces personnalisées', 'Lien direct vers votre avis Google', 'Installation guidée']
    },
    qr: {
      id: 'qr',
      priceEuros: 90,
      name: 'Pack QR',
      summary: 'Des QR codes pour toutes vos tables',
      features: ['QR code unique par table', 'Supports de table inclus', 'Lien direct vers votre avis Google']
    },
    complete: {
      id: 'complete',
      priceEuros: 100,
      name: 'Pack complet',
      summary: 'NFC et QR pour tout votre restaurant',
      features: ['5 puces NFC personnalisées', 'QR codes pour vos tables', 'Accompagnement à l’installation']
    }
  }
} as const;

export const INSTALLATION_PACKS = Object.values(PRODUCT_PRICING.installationPacks);
