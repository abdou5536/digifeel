// Données fictives de démo (pures, sans accès réseau) : utilisées par seed.mjs et testées par PGlite.
export const DEMO_PASSWORD = 'Demo-Digifeel-2026!';

export const SUPERADMIN = { email: 'superadmin@digifeel.demo', name: 'Équipe Digifeel' };

export const RESTAURANTS = [
  {
    name: 'Le Comptoir d’Alger', slug: 'comptoir-alger', color: '#c2410c', initials: 'CA', tables: 8,
    google: 'https://search.google.com/local/writereview?placeid=DEMO_COMPTOIR',
    admin: { email: 'admin@comptoir-alger.demo', name: 'Samir Benali' },
    server: { email: 'serveur@comptoir-alger.demo' },
    servers: ['Yasmine K.', 'Rachid M.', 'Lina T.'],
    products: [['Chorba', 'Entrées', 450], ['Brick à l’œuf', 'Entrées', 350], ['Couscous royal', 'Plats', 1600], ['Tajine d’agneau', 'Plats', 1800], ['Thé à la menthe', 'Boissons', 200]],
  },
  {
    name: 'Pizzeria Bella Vita', slug: 'bella-vita', color: '#b91c1c', initials: 'BV', tables: 6,
    google: 'https://search.google.com/local/writereview?placeid=DEMO_BELLAVITA',
    admin: { email: 'admin@bella-vita.demo', name: 'Marco Rinaldi' },
    server: { email: 'serveur@bella-vita.demo' },
    servers: ['Giulia R.', 'Karim D.'],
    products: [['Margherita', 'Pizzas', 900], ['Quattro Formaggi', 'Pizzas', 1300], ['Tiramisu', 'Desserts', 500], ['Limonade maison', 'Boissons', 250]],
  },
  {
    name: 'Café Oasis', slug: 'cafe-oasis', color: '#0f766e', initials: 'CO', tables: 5,
    google: 'https://search.google.com/local/writereview?placeid=DEMO_OASIS',
    admin: { email: 'admin@cafe-oasis.demo', name: 'Nadia Haddad' },
    server: { email: 'serveur@cafe-oasis.demo' },
    servers: ['Amine S.', 'Sara B.'],
    products: [['Café crème', 'Boissons', 180], ['Jus d’orange pressé', 'Boissons', 350], ['Croissant', 'Viennoiseries', 150], ['Sandwich poulet', 'Snacks', 600]],
  },
];

export function logoDataUri({ initials, color }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="${color}"/><text x="48" y="60" font-family="Arial,sans-serif" font-size="38" font-weight="700" fill="#fff" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

const COMMENTS = {
  5: ['Accueil chaleureux et plats délicieux, on reviendra.', 'Service rapide, tout était parfait.', 'Meilleure table du quartier.', ''],
  4: ['Très bon repas, un peu d’attente pour l’addition.', 'Belle cuisine, ambiance agréable.', ''],
  3: ['Correct sans plus, le plat est arrivé tiède.', 'Bon rapport qualité-prix mais bruyant.'],
  2: ['Longue attente avant d’être servis.'],
  1: ['Commande oubliée, déçu.'],
};

// Générateur pseudo-aléatoire déterministe : le même seed donne toujours les mêmes données.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

/**
 * Construit avis et additions d'un restaurant.
 * ctx : { restaurantId, chipIds[], serverIds[], tableLabels[], products: [{id,name,price}], now }
 */
export function buildActivity(def, ctx) {
  const rand = rng([...def.slug].reduce((a, c) => a + c.charCodeAt(0), 7));
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const day = 86_400_000;
  const reviews = [];
  for (let i = 0; i < 24; i += 1) {
    const r = rand();
    const stars = r < 0.5 ? 5 : r < 0.8 ? 4 : r < 0.92 ? 3 : r < 0.97 ? 2 : 1;
    reviews.push({
      restaurant_id: ctx.restaurantId, chip_id: pick(ctx.chipIds), server_id: pick(ctx.serverIds), stars,
      comment: pick(COMMENTS[stars]), device_hash: `demo-${def.slug}-${i}`.padEnd(64, '0'),
      created_at: new Date(ctx.now - Math.floor(rand() * 30 * day)).toISOString(),
    });
  }
  const bills = []; const billItems = []; const payments = [];
  for (let i = 0; i < 12; i += 1) {
    const billId = ctx.billIds[i];
    const created = new Date(ctx.now - Math.floor(rand() * 14 * day)).toISOString();
    const isOpen = i >= 10;
    bills.push({ id: billId, restaurant_id: ctx.restaurantId, table_label: pick(ctx.tableLabels), status: isOpen ? 'open' : 'paid', created_at: created, closed_at: isOpen ? null : created });
    let total = 0;
    for (let j = 0; j < 2 + Math.floor(rand() * 3); j += 1) {
      const product = pick(ctx.products); const quantity = 1 + Math.floor(rand() * 3);
      total += quantity * product.price;
      billItems.push({ bill_id: billId, restaurant_id: ctx.restaurantId, product_id: product.id, product_name: product.name, quantity, unit_price_dzd: product.price, created_at: created });
    }
    if (!isOpen) {
      payments.push({ bill_id: billId, restaurant_id: ctx.restaurantId, amount_dzd: total, tip_dzd: Math.round(total * 0.05), method: pick(['cash', 'card', 'baridimob']), status: 'succeeded', idempotency_key: `demo-${def.slug}-${i}-payment`, validated_at: created, created_at: created });
    }
  }
  const scans = Array.from({ length: 60 }, (_, i) => ({
    restaurant_id: ctx.restaurantId, chip_id: ctx.chipIds[i % ctx.chipIds.length],
    device_hash: `demo-scan-${def.slug}-${i}`.padEnd(64, '0'),
    created_at: new Date(ctx.now - Math.floor(((i * 7919) % 3000) / 100 * day / 1)).toISOString(),
  }));
  return { reviews, bills, billItems, payments, scans };
}