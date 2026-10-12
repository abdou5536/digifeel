import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { buildReportModel, type ExportData } from '../src/lib/reports/model.ts';
import { buildPdfReport } from '../src/lib/reports/pdf.ts';
import { buildExcelReport } from '../src/lib/reports/excel.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = process.argv[2];
if (!outputDirectory) throw new Error('Indiquez le dossier de sortie, par exemple : scripts/generate-portfolio.mts "C:\\Users\\...\\Downloads".');
await fs.mkdir(outputDirectory, { recursive: true });

const colors = {
  ink: [17, 26, 22] as [number, number, number],
  panel: [29, 41, 34] as [number, number, number],
  panelLight: [38, 52, 43] as [number, number, number],
  paper: [248, 246, 240] as [number, number, number],
  gold: [211, 172, 103] as [number, number, number],
  goldSoft: [238, 222, 190] as [number, number, number],
  white: [250, 249, 245] as [number, number, number],
  muted: [174, 182, 173] as [number, number, number],
  green: [131, 183, 143] as [number, number, number],
  red: [214, 139, 116] as [number, number, number],
  line: [72, 84, 74] as [number, number, number],
  darkText: [39, 47, 41] as [number, number, number],
  softText: [104, 114, 105] as [number, number, number]
};

const pageWidth = 297;
const pageHeight = 210;
const margin = 17;
const contentWidth = pageWidth - margin * 2;
const portfolio = new jsPDF({ orientation: 'landscape', format: 'a4', unit: 'mm' });
portfolio.setProperties({
  title: 'Digifeel — Portfolio fonctionnel',
  subject: 'Présentation du logiciel et exemples de rapports',
  author: 'Digifeel',
  creator: 'Digifeel'
});

function fill(color: [number, number, number]) {
  portfolio.setFillColor(...color);
}

function ink(color: [number, number, number]) {
  portfolio.setTextColor(...color);
}

function line(color = colors.line) {
  portfolio.setDrawColor(...color);
}

function text(value: string, x: number, y: number, size = 10, color = colors.white, bold = false, align: 'left' | 'right' | 'center' = 'left') {
  portfolio.setFont('helvetica', bold ? 'bold' : 'normal');
  portfolio.setFontSize(size);
  ink(color);
  portfolio.text(value, x, y, { align });
}

function paragraph(value: string, x: number, y: number, width: number, size = 9, color = colors.muted, leading = 4.6) {
  portfolio.setFont('helvetica', 'normal');
  portfolio.setFontSize(size);
  ink(color);
  const rows = portfolio.splitTextToSize(value, width) as string[];
  portfolio.text(rows, x, y, { lineHeightFactor: (leading * 72 / 25.4) / size });
  return y + rows.length * leading;
}

function box(x: number, y: number, width: number, height: number, color = colors.panel, radius = 3) {
  fill(color);
  portfolio.roundedRect(x, y, width, height, radius, radius, 'F');
}

function divider(x1: number, y1: number, x2: number, y2: number, color = colors.line) {
  line(color);
  portfolio.setLineWidth(0.25);
  portfolio.line(x1, y1, x2, y2);
}

function pill(label: string, x: number, y: number, width: number, color = colors.panelLight, labelColor = colors.goldSoft) {
  box(x, y, width, 7, color, 3.5);
  text(label, x + width / 2, y + 4.8, 7, labelColor, true, 'center');
}

function pageHeader(section: string, title: string, subtitle: string) {
  fill(colors.ink);
  portfolio.rect(0, 0, pageWidth, pageHeight, 'F');
  text('DIGIFEEL', margin, 13, 8, colors.gold, true);
  text(section.toUpperCase(), pageWidth - margin, 13, 7, colors.muted, true, 'right');
  divider(margin, 18, pageWidth - margin, 18);
  text(title, margin, 34, 23, colors.white, true);
  text(subtitle, margin, 43, 9, colors.muted);
}

function pageFooter(pageNumber: number, note = 'Exemple de présentation · Données fictives') {
  divider(margin, 193, pageWidth - margin, 193);
  text(note, margin, 200, 6.5, colors.muted);
  text(`${String(pageNumber).padStart(2, '0')} / 09`, pageWidth - margin, 200, 6.5, colors.gold, true, 'right');
}

function addPage(section: string, title: string, subtitle: string, number: number, note?: string) {
  portfolio.addPage();
  pageHeader(section, title, subtitle);
  pageFooter(number, note);
}

function kpi(x: number, y: number, width: number, label: string, value: string, hint: string) {
  box(x, y, width, 22);
  text(label.toUpperCase(), x + 4, y + 6, 6.5, colors.muted, true);
  text(value, x + 4, y + 14, 13, colors.white, true);
  text(hint, x + 4, y + 19, 6.5, colors.goldSoft);
}

function tableRow(x: number, y: number, widths: number[], values: string[], options: { header?: boolean; total?: boolean; rowHeight?: number } = {}) {
  const height = options.rowHeight ?? 8;
  if (options.header) {
    fill(colors.panelLight);
    portfolio.roundedRect(x, y, widths.reduce((a, b) => a + b, 0), height, 1.5, 1.5, 'F');
  } else if (options.total) {
    fill(colors.panelLight);
    portfolio.rect(x, y, widths.reduce((a, b) => a + b, 0), height, 'F');
  } else {
    divider(x, y + height, x + widths.reduce((a, b) => a + b, 0), y + height);
  }
  let offset = 0;
  values.forEach((value, index) => {
    const isRight = index === values.length - 1;
    const size = options.header ? 6.4 : 7.2;
    portfolio.setFont('helvetica', options.header || options.total ? 'bold' : 'normal');
    portfolio.setFontSize(size);
    while (portfolio.getTextWidth(value) > widths[index] - 4 && portfolio.getFontSize() > 5.5) {
      portfolio.setFontSize(portfolio.getFontSize() - 0.2);
    }
    text(value, isRight ? x + offset + widths[index] - 2 : x + offset + 2, y + 5.3, portfolio.getFontSize(),
      options.header ? colors.goldSoft : options.total ? colors.white : colors.muted,
      Boolean(options.header || options.total), isRight ? 'right' : 'left');
    offset += widths[index];
  });
}

function drawMiniChart(x: number, y: number, width: number, height: number, values: number[]) {
  divider(x, y + height, x + width, y + height);
  const max = Math.max(...values);
  const slot = width / values.length;
  values.forEach((value, index) => {
    const barHeight = (value / max) * (height - 6);
    fill(index === values.length - 2 ? colors.white : colors.gold);
    portfolio.roundedRect(x + index * slot + 1, y + height - barHeight, slot - 2, barHeight, 1, 1, 'F');
  });
}

function addPhoneMockup(x: number, y: number, width: number, height: number) {
  box(x, y, width, height, colors.panelLight, 6);
  box(x + 2.5, y + 3, width - 5, height - 6, colors.paper, 4);
  text('LE JARDIN D’ORAN', x + width / 2, y + 12, 6, colors.darkText, true, 'center');
  text('Comment était votre repas ?', x + width / 2, y + 23, 7.5, colors.darkText, true, 'center');
  text('Votre retour nous aide à progresser.', x + width / 2, y + 30, 5.5, colors.softText, false, 'center');
  for (let star = 0; star < 5; star += 1) {
    fill(star < 4 ? colors.gold : [211, 211, 201]);
    portfolio.circle(x + 10 + star * ((width - 20) / 4), y + 41, 2.2, 'F');
  }
  box(x + 6, y + 49, width - 12, 11, colors.ink, 2);
  text('Continuer', x + width / 2, y + 56, 5.5, colors.white, true, 'center');
  text('Le lien Google est proposé à tous.', x + width / 2, y + 67, 4.8, colors.softText, false, 'center');
}

function drawCashierScreen(x: number, y: number) {
  const width = 263;
  const height = 127;
  box(x, y, width, height, [14, 21, 18], 4);
  box(x + 3, y + 3, 36, height - 6, [24, 34, 29], 2);
  text('DIGIFEEL', x + 7, y + 12, 6.4, colors.gold, true);
  text('Caisse', x + 7, y + 24, 5.8, colors.white, true);
  text('Produits', x + 7, y + 35, 5.3, colors.muted);
  text('Historique', x + 7, y + 45, 5.3, colors.muted);
  text('Connectée', x + 7, y + height - 8, 4.7, colors.green);

  text('Caisse · Service du soir', x + 45, y + 12, 7, colors.white, true);
  text('Le Jardin d’Oran · Données fictives', x + width - 7, y + 12, 4.3, colors.muted, false, 'right');
  const dishes = [
    ['Couscous maison', '1 800 DZD'],
    ['Tajine de poulet', '2 200 DZD'],
    ['Poisson grillé', '2 500 DZD'],
    ['Chorba', '650 DZD'],
    ['Eau minérale', '150 DZD'],
    ['Thé à la menthe', '200 DZD']
  ];
  dishes.forEach(([name, price], index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const cardX = x + 45 + col * 40;
    const cardY = y + 21 + row * 33;
    box(cardX, cardY, 36, 28, colors.panel, 2);
    text(name, cardX + 2, cardY + 10, 4.6, colors.white, true);
    text(price, cardX + 2, cardY + 20, 4.4, colors.goldSoft);
    box(cardX + 29, cardY + 2, 5, 5, colors.panelLight, 2.5);
    text('+', cardX + 31.5, cardY + 5.6, 5, colors.white, true, 'center');
  });

  box(x + 174, y + 19, 82, 101, colors.panel, 2);
  text('Ticket #000124', x + 179, y + 28, 6, colors.white, true);
  text('Couscous maison', x + 179, y + 39, 4.5, colors.muted);
  text('× 2', x + 250, y + 39, 4.5, colors.muted, false, 'right');
  text('Eau minérale', x + 179, y + 48, 4.5, colors.muted);
  text('× 2', x + 250, y + 48, 4.5, colors.muted, false, 'right');
  divider(x + 179, y + 56, x + 250, y + 56);
  text('TOTAL', x + 179, y + 67, 5.6, colors.muted, true);
  text('3 900 DZD', x + 250, y + 67, 7, colors.white, true, 'right');
  ['Espèces', 'Carte', 'BaridiMob'].forEach((method, index) => {
    box(x + 179 + index * 24, y + 76, 22, 12, index === 0 ? colors.gold : colors.panelLight, 2);
    text(method, x + 190 + index * 24, y + 83.4, 3.8, index === 0 ? colors.ink : colors.white, true, 'center');
  });
  box(x + 179, y + 94, 71, 17, colors.green, 2);
  text('ENREGISTRER LA VENTE', x + 214.5, y + 104, 4.7, colors.ink, true, 'center');
}

function money(value: number) {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)} DZD`;
}

function sale(number: number, soldAt: string, cashier: string, payment: string, lines: Array<[string, string, number, number]>) {
  return {
    id: `exemple-${number}`,
    ticket_no: number,
    sold_at: soldAt,
    total_dzd: lines.reduce((sum, [, , quantity, price]) => sum + quantity * price, 0),
    payment_method: payment,
    cashier_name: cashier,
    lines: lines.map(([product_name, category, quantity, unit_price_dzd]) => ({
      product_name,
      category,
      quantity,
      unit_price_dzd,
      line_total_dzd: quantity * unit_price_dzd
    }))
  };
}

const sales = [
  sale(121, '2026-09-02T18:30:00.000Z', 'Samir', 'cash', [['Couscous maison', 'Plats', 2, 1800], ['Eau minérale', 'Boissons', 2, 150], ['Salade méchouia', 'Entrées', 1, 700]]),
  sale(122, '2026-09-03T19:05:00.000Z', 'Yasmine', 'card', [['Chorba', 'Entrées', 2, 650], ['Tajine de poulet', 'Plats', 1, 2200], ['Eau minérale', 'Boissons', 1, 150]]),
  sale(123, '2026-09-05T12:00:00.000Z', 'Samir', 'cash', [['Poisson grillé', 'Plats', 1, 2500], ['Frites maison', 'Accompagnements', 1, 500], ['Eau minérale', 'Boissons', 1, 150]]),
  sale(124, '2026-09-07T20:00:00.000Z', 'Yasmine', 'baridimob', [['Couscous maison', 'Plats', 3, 1800], ['Thé à la menthe', 'Boissons', 2, 200]]),
  sale(125, '2026-09-12T19:00:00.000Z', 'Samir', 'card', [['Couscous maison', 'Plats', 3, 1800], ['Eau minérale', 'Boissons', 4, 150]]),
  sale(126, '2026-09-17T19:30:00.000Z', 'Yasmine', 'cash', [['Tajine de poulet', 'Plats', 2, 2200], ['Salade méchouia', 'Entrées', 1, 700]]),
  sale(127, '2026-09-23T18:45:00.000Z', 'Samir', 'baridimob', [['Poisson grillé', 'Plats', 2, 2500], ['Thé à la menthe', 'Boissons', 2, 200]]),
  sale(128, '2026-09-29T20:15:00.000Z', 'Yasmine', 'card', [['Couscous maison', 'Plats', 2, 1800], ['Poisson grillé', 'Plats', 1, 2500]])
];

const reviews = [
  ['Samir', 5, 'Service rapide et couscous excellent.'],
  ['Yasmine', 4, 'Très bon accueil, nous reviendrons.'],
  ['Yasmine', 5, 'Une belle adresse pour le déjeuner.'],
  ['Samir', 4, 'Poisson très frais, merci à l’équipe.'],
  ['Samir', 5, 'Repas en famille, tout était parfait.'],
  ['Yasmine', 3, 'Bon repas, attente un peu longue.'],
  ['Samir', 4, 'Très bon thé à la menthe.'],
  ['Yasmine', 5, 'Couscous généreux et savoureux.']
].map(([server_name, stars, comment], index) => ({
  id: `avis-exemple-${index + 1}`,
  stars: Number(stars),
  comment: String(comment),
  created_at: `2026-09-${String(4 + index * 3).padStart(2, '0')}T17:00:00.000Z`,
  server_id: index % 2 ? 'serveur-yasmine' : 'serveur-samir',
  server_name: String(server_name),
  handled: true
}));

const exportData: ExportData = {
  restaurantName: 'Le Jardin d’Oran — exemple',
  periodDays: 30,
  periodFrom: '2026-09-01T00:00:00.000Z',
  generatedAt: '2026-09-30T22:00:00.000Z',
  demo: true,
  scansCount: 86,
  scansByDay: [
    { date: '2026-09-24', count: 8 },
    { date: '2026-09-25', count: 11 },
    { date: '2026-09-26', count: 13 },
    { date: '2026-09-27', count: 10 },
    { date: '2026-09-28', count: 15 },
    { date: '2026-09-29', count: 16 },
    { date: '2026-09-30', count: 13 }
  ],
  reviewCount: reviews.length,
  averageRating: reviews.reduce((sum, review) => sum + review.stars, 0) / reviews.length,
  reviews,
  sales: {
    totalDzd: sales.reduce((sum, item) => sum + item.total_dzd, 0),
    salesCount: sales.length,
    sales,
    byServer: [],
    byMonth: [],
    voidedCount: 1,
    voidedDzd: 900
  }
};
const report = buildReportModel(exportData);
if (report.revenue !== 39800 || report.orderCount !== 8 || report.itemsSold !== 34) {
  throw new Error(`Les totaux de l’exemple de rapport sont incohérents : ${JSON.stringify({ revenue: report.revenue, orders: report.orderCount, items: report.itemsSold })}.`);
}

const moneyShort = (value: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);

function coverPage() {
  fill(colors.ink);
  portfolio.rect(0, 0, pageWidth, pageHeight, 'F');
  fill(colors.gold);
  portfolio.roundedRect(margin, 20, 12, 12, 3, 3, 'F');
  text('D', margin + 6, 28.5, 13, colors.ink, true, 'center');
  text('DIGIFEEL', margin + 17, 28.5, 12, colors.white, true);
  text('PORTFOLIO FONCTIONNEL', margin, 62, 8, colors.gold, true);
  text('Le service garde', margin, 82, 29, colors.white, true);
  text('son rythme.', margin, 112, 29, colors.gold, true);
  paragraph('Caisse, avis clients et gestion : des outils concrets pour accompagner chaque service, du premier scan au rapport de fin de mois.', margin, 126, 116, 11, colors.muted, 5.5);
  pill('VUE D’ENSEMBLE', margin, 162, 34);
  pill('EXEMPLE CAISSE', margin + 39, 162, 37);
  pill('RAPPORTS PDF + EXCEL', margin + 81, 162, 48);
  box(158, 25, 121, 154, colors.panel, 5);
  text('UN OUTIL PENSÉ POUR LA SALLE', 169, 40, 7, colors.gold, true);
  text('Le Jardin d’Oran', 169, 52, 18, colors.white, true);
  text('Restaurant · exemple de présentation', 169, 60, 7, colors.muted);
  kpi(169, 72, 51, 'Ventes du mois', money(report.revenue), '8 tickets · exemple fictif');
  kpi(226, 72, 42, 'Avis', '4,4 / 5', '8 retours clients');
  drawMiniChart(171, 112, 92, 42, [7, 11, 8, 14, 9, 18, 12, 16]);
  text('Une démonstration transparente.', 169, 160, 8, colors.white, true);
  text('Les chiffres du dossier sont fictifs et servent uniquement à illustrer les écrans et exports.', margin, 182, 7, colors.muted);
  divider(margin, 189, pageWidth - margin, 189);
  text('DIGIFEEL · DOCUMENT DE PRÉSENTATION', margin, 196, 6.5, colors.muted);
  text('01 / 09', pageWidth - margin, 196, 6.5, colors.gold, true, 'right');
}

coverPage();

addPage('01 · Gestion', 'Un tableau de bord utile au quotidien', 'Le responsable suit les indicateurs du restaurant sans perdre de vue le service.', 2);
const metricY = 59;
kpi(margin, metricY, 58, 'Chiffre d’affaires', money(report.revenue), 'du 1 au 30 septembre · exemple');
kpi(margin + 63, metricY, 45, 'Commandes', String(report.orderCount), 'ventes enregistrées');
kpi(margin + 113, metricY, 50, 'Panier moyen', money(report.averageBasket ?? 0), 'calculé sur la période');
kpi(margin + 168, metricY, 48, 'Scans QR / NFC', '86', '7 derniers jours présentés');
kpi(margin + 221, metricY, 42, 'Avis clients', '4,4 / 5', '8 retours');
box(margin, 90, 155, 94);
text('ÉVOLUTION DES VENTES', margin + 8, 102, 7, colors.gold, true);
text('Chaque barre correspond à une journée de service.', margin + 8, 109, 7, colors.muted);
drawMiniChart(margin + 10, 122, 132, 46, [4, 10, 7, 13, 9, 18, 14, 11, 16, 12, 17, 10, 19, 15, 13, 20]);
box(181, 90, 99, 94);
text('ÉQUIPE · EXEMPLE', 190, 102, 7, colors.gold, true);
tableRow(190, 111, [39, 19, 24], ['Serveur', 'Tickets', 'CA'], { header: true });
tableRow(190, 120, [39, 19, 24], ['Yasmine', '4', moneyShort(20650)]);
tableRow(190, 129, [39, 19, 24], ['Samir', '4', moneyShort(19350)]);
text('L’activité par serveur est une lecture de gestion,', 190, 151, 6.1, colors.muted);
text('pas un outil d’évaluation individuelle.', 190, 159, 6.1, colors.muted);
text('Période sélectionnable · ventes · annulations · paiements · produits · équipe · avis · scans.', margin, 184, 7.2, colors.goldSoft);

addPage('02 · Caisse', 'Encaisser clairement, même quand le réseau coupe', 'Exemple de l’écran actuel : catalogue, panier, choix du moyen de paiement et ticket.', 3);
drawCashierScreen(margin, 55);
box(margin, 151, 126, 34);
text('DANS LA CAISSE', margin + 6, 161, 6.5, colors.gold, true);
paragraph('Catalogue de produits · quantités · modes espèces / carte / BaridiMob · tickets 58 mm, 80 mm ou A4 · historique · annulation avec motif.', margin + 6, 169, 113, 7, colors.white, 4);
box(153, 151, 127, 34, [54, 40, 31]);
text('À FINALISER POUR UNE CAISSE DE SALLE COMPLÈTE', 160, 161, 6.2, colors.goldSoft, true);
paragraph('Plan graphique des tables, additions partagées, notes cuisine, terminal bancaire intégré et clôture Z ne sont pas encore livrés dans cet écran.', 160, 169, 113, 7, colors.white, 4);
text('Carte et BaridiMob sont enregistrés comme moyens de paiement ; le paiement réel doit être vérifié hors de Digifeel.', margin, 184, 6.7, colors.muted);

addPage('03 · QR, NFC & avis', 'Une table, un lien, un parcours simple', 'Le client scanne sans installer d’application ; le restaurateur retrouve les retours dans son espace.', 4);
box(margin, 57, 86, 124);
text('01 · IDENTIFIER LA TABLE', margin + 7, 69, 6.5, colors.gold, true);
const qr = await QRCode.toDataURL('https://demo.example/r/le-jardin-oran/t/04', { width: 400, margin: 1, errorCorrectionLevel: 'H' });
portfolio.addImage(qr, 'PNG', margin + 9, 78, 50, 50);
text('QR TABLE 04', margin + 34, 137, 7, colors.white, true, 'center');
paragraph('Un QR code par table. Fichier image ou fiche PDF individuelle prête à imprimer.', margin + 7, 149, 71, 7, colors.muted, 4);
box(111, 57, 84, 124);
text('02 · DONNER SON AVIS', 119, 69, 6.5, colors.gold, true);
addPhoneMockup(133, 77, 42, 89);
box(204, 57, 76, 124);
text('03 · SUIVRE', 212, 69, 6.5, colors.gold, true);
kpi(212, 78, 60, 'Avis du mois', '8', 'fictifs');
kpi(212, 106, 60, 'Note moyenne', '4,4 / 5', 'fictive');
paragraph('Le lien Google est proposé à tous les clients, quelle que soit leur note.', 212, 143, 59, 7, colors.white, 4.2);
paragraph('La création des QR est disponible. L’écriture d’une puce NFC par le logiciel et le test matériel du lecteur restent à mettre en place.', 212, 167, 59, 6.5, colors.muted, 3.7);
text('QR de démonstration : son adresse doit être remplacée par celle du restaurant déployé.', margin, 184, 6.6, colors.muted);

addPage('04 · Rapport PDF', 'Un rapport prêt à relire et à partager', 'Extrait de démonstration. Le fichier PDF complet correspondant est livré séparément.', 5);
box(margin, 55, 174, 128, colors.paper, 2);
fill(colors.panel);
portfolio.rect(margin, 55, 174, 26, 'F');
text('LE JARDIN D’ORAN — EXEMPLE', margin + 8, 66, 11, colors.white, true);
text('RAPPORT DE GESTION · SEPTEMBRE 2026', margin + 8, 75, 6.5, colors.goldSoft);
const pdfKpis = [
  ['CA NET', money(report.revenue)],
  ['COMMANDES', String(report.orderCount)],
  ['PANIER MOYEN', money(report.averageBasket ?? 0)],
  ['AVIS', '4,4 / 5']
];
pdfKpis.forEach(([label, value], index) => {
  const x = margin + 8 + index * 40;
  text(label, x, 94, 5.5, colors.softText, true);
  text(value, x, 103, 9, colors.darkText, true);
});
text('Moyens de paiement', margin + 8, 118, 7, colors.darkText, true);
const paymentRows = report.payments.map((payment) => [payment.label, `${payment.orders} ticket(s)`, moneyShort(payment.revenue)]);
tableRow(margin + 8, 123, [52, 48, 36], ['Mode', 'Tickets', 'Total DZD'], { header: true });
paymentRows.slice(0, 3).forEach((row, index) => tableRow(margin + 8, 132 + index * 8, [52, 48, 36], row));
text('Annulation de vente', margin + 8, 163, 6.2, colors.softText, true);
text('1 vente · 900 DZD · exclue du chiffre d’affaires affiché', margin + 8, 171, 6.2, colors.darkText);
box(205, 55, 75, 128);
text('DANS LE PDF', 213, 69, 7, colors.gold, true);
['Synthèse et indicateurs', 'Ventes et paiements', 'Produits et catégories', 'Équipe et activité', 'Avis et notes', 'Scans QR / NFC'].forEach((label, index) => {
  fill(colors.gold);
  portfolio.circle(215, 83 + index * 13, 1, 'F');
  text(label, 220, 84 + index * 13, 6.8, colors.white);
});
paragraph('Le rapport PDF utilise les mêmes données calculées que le classeur Excel joint à ce portfolio.', 213, 169, 59, 6.5, colors.muted, 3.8);
text('Exemple de gestion, pas document fiscal : la ventilation de TVA n’est pas incluse dans les exports actuels.', margin, 184, 6.8, colors.red);

addPage('05 · Rapport Excel', 'Des données détaillées, feuille par feuille', 'Le classeur fourni est généré avec le même moteur de rapport que l’export de l’application.', 6);
box(margin, 56, 188, 127, colors.paper, 2);
fill(colors.panel);
portfolio.roundedRect(margin, 56, 188, 14, 2, 2, 'F');
text('VENTES', margin + 8, 65, 6, colors.white, true);
text('LE JARDIN D’ORAN · SEPTEMBRE 2026 · DONNÉES DE DÉMONSTRATION', margin + 8, 78, 6, colors.softText, true);
tableRow(margin + 8, 84, [20, 42, 32, 22, 31, 24], ['Ticket', 'Produit', 'Serveur', 'Quantité', 'Paiement', 'Total'], { header: true });
const excelRows = report.orders.slice(0, 7).map((order) => [
  `#${order.ticketNo}`,
  order.lines[0]?.product ?? 'Vente',
  order.server,
  String(order.lines.reduce((sum, item) => sum + item.quantity, 0)),
  order.payment,
  moneyShort(order.total)
]);
excelRows.forEach((row, index) => tableRow(margin + 8, 94 + index * 9, [20, 42, 32, 22, 31, 24], row));
tableRow(margin + 8, 160, [20, 42, 32, 22, 31, 24], ['TOTAL', '', '', String(report.itemsSold), '', moneyShort(report.revenue)], { total: true });
text('Onglets inclus', 221, 68, 7, colors.gold, true);
['Synthèse', 'Ventes', 'Produits', 'Équipe', 'Avis clients', 'NFC & Google'].forEach((label, index) => {
  pill(label, 221, 77 + index * 12, 58, colors.panelLight, colors.white);
});
paragraph('Tri, filtres et colonnes détaillées pour faciliter les contrôles et les analyses. Aucun chiffre de cet exemple n’est issu d’un vrai établissement.', 221, 157, 57, 6.5, colors.muted, 3.8);
text('Le classeur joint s’ouvre avec Excel ou un logiciel compatible XLSX.', margin, 184, 7, colors.goldSoft);

addPage('06 · Comptes & gestion', 'Les accès sont séparés par restaurant', 'Un espace de travail par établissement, avec des rôles et une période d’essai.', 7);
box(margin, 58, 122, 119);
text('UNE VUE PAR MÉTIER', margin + 8, 71, 7, colors.gold, true);
const roles = [
  ['Super-admin', 'Vue multi-restaurants'],
  ['Administrateur', 'Réglages et pilotage'],
  ['Serveur', 'Accès opérationnel'],
  ['Cuisine', 'Rôle prévu par l’espace'],
  ['Revendeur', 'Portail dédié']
];
roles.forEach(([role, detail], index) => {
  const y = 83 + index * 16;
  text(role, margin + 8, y, 7.4, colors.white, true);
  text(detail, margin + 54, y, 6.5, colors.muted);
  divider(margin + 8, y + 5, margin + 111, y + 5);
});
box(151, 58, 129, 119);
text('PÉRIMÈTRE DE SÉCURITÉ', 159, 71, 7, colors.gold, true);
const securityItems = [
  'Connexion gérée par Supabase Auth ; mots de passe hachés.',
  'Règles RLS testées pour isoler les données par restaurant.',
  'Création d’un établissement avec 30 jours d’essai.',
  'Accès au tableau de bord lié à l’état du compte.'
];
securityItems.forEach((item, index) => {
  fill(colors.green);
  portfolio.circle(161, 84 + index * 21, 1.1, 'F');
  paragraph(item, 167, 86 + index * 21, 104, 7, colors.white, 4);
});
paragraph('En production, la durée maximale et l’inactivité de session doivent être configurées dans le projet Supabase. Les fonctions super-admin et les droits sont pilotés côté serveur et par les politiques de base.', margin, 181, 260, 6.5, colors.muted, 3.8);

addPage('07 · Fiabilité & langues', 'Prévu pour s’adapter au terrain', 'Les fonctions utiles sont distinguées des chantiers qui restent à terminer.', 8);
const colWidth = 126;
box(margin, 57, colWidth, 123);
text('DÉJÀ PRÉSENT', margin + 8, 70, 7, colors.green, true);
[
  'Caisse web avec catalogue et historique.',
  'Cache local du catalogue et ventes mises en attente hors ligne.',
  'Synchronisation des ventes lorsque le réseau revient.',
  'Rapports PDF et Excel, annulations visibles à part.',
  'Interface FR / EN / AR, avec prise en charge RTL en arabe.',
  'Journal local de l’application Windows.'
].forEach((item, index) => {
  fill(colors.green);
  portfolio.circle(margin + 9, 82 + index * 14, 1, 'F');
  paragraph(item, margin + 15, 84 + index * 14, 106, 6.7, colors.white, 3.8);
});
box(margin + 136, 57, colWidth + 8, 123, [54, 40, 31]);
text('À METTRE EN PLACE AVANT UNE VENTE À GRANDE ÉCHELLE', margin + 144, 70, 6.2, colors.goldSoft, true);
[
  'Sauvegarde automatique quotidienne et restauration vérifiée.',
  'TVA, réglages € / DZD et exports adaptés à chaque pays.',
  'Plan de salle, notes cuisine, partage d’addition et clôture Z.',
  'Terminal bancaire intégré ; la caisse ne vérifie pas le paiement carte.',
  'Écriture NFC depuis l’application et test du lecteur.',
  'Pourboires et primes étoilées à migrer avant facturation réelle : paliers indicatifs +0,5 = 9 €, +1 = 11 €, +3 = 28,99 €.',
  'Valider l’interface tactile et le parcours complet sur un compte de production.'
].forEach((item, index) => {
  fill(colors.gold);
  portfolio.circle(margin + 145, 82 + index * 14, 1, 'F');
  paragraph(item, margin + 151, 84 + index * 14, 106, 6.2, colors.white, 3.4);
});
text('Hors ligne : catalogue téléchargé une première fois, ventes en attente dans ce navigateur. Les autres pages ne sont pas garanties hors connexion.', margin, 184, 6.1, colors.muted);

addPage('08 · Mise en place', 'Une base concrète, avec un périmètre annoncé', 'Digifeel s’installe après configuration du site hébergé et du compte du restaurant.', 9);
box(margin, 58, 115, 120);
text('MISE EN ROUTE', margin + 8, 72, 7, colors.gold, true);
[
  ['01', 'Créer l’espace restaurant'],
  ['02', 'Ajouter le catalogue et l’équipe'],
  ['03', 'Renseigner le lien Google'],
  ['04', 'Générer et imprimer les QR']
].forEach(([number, label], index) => {
  const y = 89 + index * 19;
  text(number, margin + 8, y, 8, colors.gold, true);
  text(label, margin + 25, y, 7.2, colors.white, true);
  if (index < 3) divider(margin + 12, y + 4, margin + 12, y + 15);
});
text('Tarif d’installation QR communiqué', margin + 8, 165, 6.5, colors.muted);
text('9 € par table · premier mois offert', margin + 8, 173, 7, colors.white, true);
box(145, 58, 135, 120);
text('POUR TESTER LES EXEMPLES JOINTS', 153, 72, 7, colors.gold, true);
text('01', 153, 89, 8, colors.gold, true);
text('Ouvrir Digifeel-Portfolio-client.pdf', 171, 89, 7.5, colors.white, true);
text('02', 153, 108, 8, colors.gold, true);
text('Vérifier les pages PDF et Excel', 171, 108, 7.5, colors.white, true);
text('03', 153, 127, 8, colors.gold, true);
text('Essayer la caisse avec un compte test', 171, 127, 7.5, colors.white, true);
paragraph('Le paquet Windows est un shell Electron pour le site hébergé : une URL HTTPS réelle est nécessaire. L’installateur de test n’est pas destiné à être distribué. Le certificat Windows, les mises à jour publiées et les réglages de production restent à configurer.', 153, 142, 115, 7, colors.muted, 4.1);
text('Exemples joints : Digifeel-rapport-client-exemple.pdf · Digifeel-rapport-client-exemple.xlsx', margin, 184, 6.7, colors.goldSoft, true);

const pdfBlob = await buildPdfReport(report);
const excelBlob = await buildExcelReport(report);
await Promise.all([
  fs.writeFile(path.join(outputDirectory, 'Digifeel-Portfolio-client.pdf'), Buffer.from(portfolio.output('arraybuffer'))),
  fs.writeFile(path.join(outputDirectory, 'Digifeel-rapport-client-exemple.pdf'), Buffer.from(await pdfBlob.arrayBuffer())),
  fs.writeFile(path.join(outputDirectory, 'Digifeel-rapport-client-exemple.xlsx'), Buffer.from(await excelBlob.arrayBuffer()))
]);

console.log(`Portfolio et exemples fictifs générés dans ${outputDirectory}`);
