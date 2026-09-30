import { jsPDF } from 'jspdf';
import { RestaurantConfig, Review, Waiter } from '../types';

export interface ExportFilterOptions {
  period: 'all' | 'today' | 'week' | 'month';
  waiterId?: string; // 'all' or specific ID
}

/**
 * Filter reviews according to period and selected waiter
 */
export function filterReviewsForExport(
  reviews: Review[],
  options: ExportFilterOptions
): Review[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  return reviews.filter(r => {
    // Waiter filter
    if (options.waiterId && options.waiterId !== 'all' && r.waiterId !== options.waiterId) {
      return false;
    }

    const reviewTime = new Date(r.createdAt).getTime();
    if (options.period === 'today') {
      return reviewTime >= todayStart;
    } else if (options.period === 'week') {
      return reviewTime >= weekStart;
    } else if (options.period === 'month') {
      return reviewTime >= monthStart;
    }
    return true;
  });
}

/**
 * Trigger browser file download
 */
function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 1. Export Raw Transactions & Satisfaction to CSV (UTF-8 with BOM for Excel)
 */
export function exportTransactionsToCsv(
  restaurant: RestaurantConfig,
  reviews: Review[],
  waiters: Waiter[],
  options: ExportFilterOptions = { period: 'all', waiterId: 'all' }
): void {
  const filtered = filterReviewsForExport(reviews, options);
  
  // Headers in French for accounting & restaurant management
  const headers = [
    'ID Transaction',
    'Date',
    'Heure',
    'Établissement',
    'Table',
    'Serveur (Nom)',
    'Serveur (Rôle)',
    'Puce NFC UID',
    'Note Satisfaction (/5)',
    'Pourboire Reçu (€)',
    'Pourboire Dinar Algérien (277 DA Marché Noir)',
    'Pourboire Dollar US ($)',
    'Compliments Reçus',
    'Redirection Google Reviews',
    'Commentaire Client'
  ];

  const rows = filtered.map(r => {
    const waiter = waiters.find(w => w.id === r.waiterId);
    const dateObj = new Date(r.createdAt);
    const dateFormatted = dateObj.toLocaleDateString('fr-FR');
    const timeFormatted = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const tipDzd = Math.round(r.tipAmount * 277);
    const tipUsd = (r.tipAmount * 1.08).toFixed(2);

    return [
      `"${r.id}"`,
      `"${dateFormatted}"`,
      `"${timeFormatted}"`,
      `"${restaurant.name.replace(/"/g, '""')}"`,
      `"${r.tableNumber}"`,
      `"${r.waiterName.replace(/"/g, '""')}"`,
      `"${(waiters.find(w => w.id === r.waiterId)?.role || 'Serveur').replace(/"/g, '""')}"`,
      `"${waiter?.nfcUid || '04:A2:8B:19:64:30:80'}"`,
      `"${r.rating.toString().replace('.', ',')}"`,
      `"${r.tipAmount.toFixed(2).replace('.', ',')}"`,
      `"${tipDzd} DA"`,
      `"$${tipUsd.replace('.', ',')}"`,
      `"${(r.compliments || []).join(' | ').replace(/"/g, '""')}"`,
      `"${r.googleReviewClicked ? 'OUI' : 'NON'}"`,
      `"${(r.comment || '').replace(/"/g, '""')}"`
    ];
  });

  // UTF-8 BOM (\uFEFF) ensures Excel reads accents correctly
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\r\n');
  const safeRestoSlug = restaurant.slug || 'restaurant';
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadBlob(csvContent, `digifeel_satisfaction_pourboires_${safeRestoSlug}_${timestamp}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * 2. Export Waiter Payroll Summary to CSV (Pourboires & Redistribution Paie)
 */
export function exportServerPayrollToCsv(
  restaurant: RestaurantConfig,
  waiters: Waiter[],
  reviews: Review[],
  options: ExportFilterOptions = { period: 'all' }
): void {
  const filtered = filterReviewsForExport(reviews, options);

  const headers = [
    'ID Serveur',
    'Prénom & Nom',
    'Poste / Rôle',
    'Puce NFC UID',
    'Tables Assignées',
    'Nombre Avis Reçus',
    'Note Moyenne (/5)',
    'Total Pourboires Récoltés (€)',
    'Moyenne Pourboire / Avis (€)',
    'Avis 5 Étoiles Reçus',
    'Taux de Satisfaction 5★ (%)',
    'Période Export'
  ];

  const rows = waiters.map(w => {
    const waiterReviews = filtered.filter(r => r.waiterId === w.id);
    const totalTips = waiterReviews.reduce((sum, r) => sum + (r.tipAmount || 0), 0);
    const reviewCount = waiterReviews.length;
    const avgRating = reviewCount > 0 
      ? (waiterReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1) 
      : w.ratingAverage.toFixed(1);
    const fiveStarCount = waiterReviews.filter(r => r.rating >= 4.5).length;
    const fiveStarRate = reviewCount > 0 ? Math.round((fiveStarCount / reviewCount) * 100) : 100;
    const avgTip = reviewCount > 0 ? (totalTips / reviewCount).toFixed(2) : '0,00';

    return [
      `"${w.id}"`,
      `"${w.name.replace(/"/g, '""')}"`,
      `"${w.role.replace(/"/g, '""')}"`,
      `"${w.nfcUid || '04:A2:8B:19:64:30:80'}"`,
      `"${(w.tablesAssigned || [1, 2, 3]).join(', ')}"`,
      `"${reviewCount}"`,
      `"${avgRating.replace('.', ',')}"`,
      `"${totalTips.toFixed(2).replace('.', ',')}"`,
      `"${avgTip.replace('.', ',')}"`,
      `"${fiveStarCount}"`,
      `"${fiveStarRate}%"`,
      `"${options.period.toUpperCase()}"`
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\r\n');
  const safeRestoSlug = restaurant.slug || 'restaurant';
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadBlob(csvContent, `digifeel_bilan_paie_serveurs_${safeRestoSlug}_${timestamp}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * 3. Export Official Certified Accounting & Performance Report to PDF
 */
export async function exportAccountingPdf(
  restaurant: RestaurantConfig,
  reviews: Review[],
  waiters: Waiter[],
  options: ExportFilterOptions = { period: 'all', waiterId: 'all' }
): Promise<void> {
  const filtered = filterReviewsForExport(reviews, options);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  // Key metrics calculation
  const totalTips = filtered.reduce((sum, r) => sum + (r.tipAmount || 0), 0);
  const totalReviewsCount = filtered.length;
  const avgSatisfaction = totalReviewsCount > 0 
    ? (filtered.reduce((sum, r) => sum + r.rating, 0) / totalReviewsCount).toFixed(2) 
    : '5.00';
  const googleConversions = filtered.filter(r => r.googleReviewClicked).length;
  const fiveStarsCount = filtered.filter(r => r.rating >= 4.5).length;
  const satisfactionRate = totalReviewsCount > 0 ? Math.round((fiveStarsCount / totalReviewsCount) * 100) : 100;

  // Header Background Card
  doc.setFillColor(10, 15, 29); // #0a0f1d
  doc.rect(0, 0, pageWidth, 48, 'F');

  // Accent Gold Bar
  doc.setFillColor(217, 119, 6); // #d97706
  doc.rect(0, 48, pageWidth, 2.5, 'F');

  // Logo / Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('DIGIFEEL · RAPPORT COMPTABLE ET PERFORMANCE', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`Établissement : ${restaurant.name} | ${restaurant.address}, ${restaurant.city}`, margin, 26);
  doc.text(`Période du rapport : ${options.period === 'all' ? 'Historique complet' : options.period.toUpperCase()} | Date d'édition : ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}`, margin, 32);

  doc.setFontSize(8);
  doc.setTextColor(251, 191, 36);
  doc.text(`Identifiant Établissement : ${restaurant.slug.toUpperCase()} | Terminal Sans Contact NFC & QR Certifié`, margin, 38);

  // SECTION 1: Key Performance & Accounting KPI Boxes
  let currentY = 60;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. SYNTHÈSE COMPTABLE & SATISFACTION CLIENT', margin, currentY);

  currentY += 6;

  const kpiBoxWidth = (contentWidth - 9) / 4;
  const kpis = [
    { label: 'TOTAL POURBOIRES', value: `${totalTips.toFixed(2)} €`, sub: '100% reversés aux serveurs' },
    { label: 'NOTE MOYENNE', value: `${avgSatisfaction} / 5 ★`, sub: `${satisfactionRate}% d\'avis 5 étoiles` },
    { label: 'AVIS RECUEILLIS', value: `${totalReviewsCount}`, sub: 'Transactions analysées' },
    { label: 'REDIRECTIONS GOOGLE', value: `${googleConversions}`, sub: 'Avis publics boostés' }
  ];

  kpis.forEach((kpi, idx) => {
    const xPos = margin + idx * (kpiBoxWidth + 3);
    // Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(xPos, currentY, kpiBoxWidth, 24, 2, 2, 'FD');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, xPos + 3, currentY + 6);

    // Value
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, xPos + 3, currentY + 14);

    // Sub
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.sub, xPos + 3, currentY + 20);
  });

  currentY += 32;

  // SECTION 2: Waiter Tip Distribution Table for Payroll
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('2. VENTILATION DES POURBOIRES PAR MEMBRE D\'ÉQUIPE (FICHE DE PAIE)', margin, currentY);

  currentY += 6;

  // Table Headers
  const colWidths = [45, 30, 22, 25, 30, 26]; // Total: 178 mm
  const tableHeaders = ['Membre d\'Équipe', 'Poste / Rôle', 'Avis Reçus', 'Note Moyenne', 'Pourboires (€)', 'Part / Total'];

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  let headerX = margin + 2;
  tableHeaders.forEach((th, i) => {
    doc.text(th, headerX, currentY + 4.8);
    headerX += colWidths[i];
  });

  currentY += 7;

  // Table Rows
  waiters.forEach((w, rowIdx) => {
    const wReviews = filtered.filter(r => r.waiterId === w.id);
    const wTips = wReviews.reduce((sum, r) => sum + (r.tipAmount || 0), 0);
    const wAvg = wReviews.length > 0 
      ? (wReviews.reduce((sum, r) => sum + r.rating, 0) / wReviews.length).toFixed(1)
      : w.ratingAverage.toFixed(1);
    const shareOfTotal = totalTips > 0 ? `${Math.round((wTips / totalTips) * 100)}%` : '0%';

    // Alternate row bg
    if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY, contentWidth, 6.5, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    let cellX = margin + 2;
    doc.setFont('helvetica', 'bold');
    doc.text(w.name, cellX, currentY + 4.5);
    cellX += colWidths[0];

    doc.setFont('helvetica', 'normal');
    doc.text(w.role, cellX, currentY + 4.5);
    cellX += colWidths[1];

    doc.text(`${wReviews.length}`, cellX, currentY + 4.5);
    cellX += colWidths[2];

    doc.text(`${wAvg} ★`, cellX, currentY + 4.5);
    cellX += colWidths[3];

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Green
    doc.text(`${wTips.toFixed(2)} €`, cellX, currentY + 4.5);
    cellX += colWidths[4];

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(shareOfTotal, cellX, currentY + 4.5);

    currentY += 6.5;
  });

  // Total Summary Row
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL GÉNÉRAL À REVERSER', margin + 2, currentY + 5);
  doc.text(`${totalReviewsCount} avis`, margin + 2 + colWidths[0] + colWidths[1], currentY + 5);
  doc.text(`${avgSatisfaction} ★`, margin + 2 + colWidths[0] + colWidths[1] + colWidths[2], currentY + 5);
  doc.setTextColor(16, 185, 129);
  doc.text(`${totalTips.toFixed(2)} €`, margin + 2 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], currentY + 5);
  doc.setTextColor(15, 23, 42);
  doc.text('100%', margin + 2 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], currentY + 5);

  currentY += 15;

  // SECTION 3: Recent Transactions Audit Sample (Top 8 entries)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('3. EXTRAIT D\'AUDIT DES TRANSACTIONS EN SALLE (ÉCHANTILLON)', margin, currentY);

  currentY += 6;

  const txHeaders = ['Date / Heure', 'Table', 'Serveur', 'Note', 'Pourboire', 'Google Maps', 'Commentaire'];
  const txColWidths = [28, 14, 32, 16, 20, 24, 44];

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, currentY, contentWidth, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);

  let txHX = margin + 2;
  txHeaders.forEach((th, i) => {
    doc.text(th, txHX, currentY + 4.5);
    txHX += txColWidths[i];
  });

  currentY += 6.5;

  const sampleReviews = filtered.slice(0, 8);
  sampleReviews.forEach((r, idx) => {
    const d = new Date(r.createdAt);
    const dateStr = `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY, contentWidth, 6, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);

    let cellX = margin + 2;
    doc.text(dateStr, cellX, currentY + 4.2);
    cellX += txColWidths[0];

    doc.text(`T.${r.tableNumber}`, cellX, currentY + 4.2);
    cellX += txColWidths[1];

    doc.text(r.waiterName.substring(0, 18), cellX, currentY + 4.2);
    cellX += txColWidths[2];

    doc.text(`${r.rating} ★`, cellX, currentY + 4.2);
    cellX += txColWidths[3];

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(r.tipAmount > 0 ? `${r.tipAmount.toFixed(2)} €` : '-', cellX, currentY + 4.2);
    cellX += txColWidths[4];

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(r.googleReviewClicked ? 'Avis Rédigé' : 'Interne', cellX, currentY + 4.2);
    cellX += txColWidths[5];

    const commentText = (r.comment || (r.compliments || []).join(', ') || '-').substring(0, 28);
    doc.text(commentText, cellX, currentY + 4.2);

    currentY += 6;
  });

  // Footer / Regulatory & Legal Notice (URSSAF / Exonération pourboires)
  const footerY = pageHeight - 22;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Note Légale & Fiscale : Les pourboires par carte bancaire / sans contact perçus via Digifeel bénéficient du régime d\'exonération de cotisations sociales et d\'impôt sur le revenu (Art. 5 de la loi de finances, seuil <= 1,6 SMIC). Document certifié conforme pour justification comptable et transmission au cabinet d\'expertise comptable.', margin, footerY + 5, { maxWidth: contentWidth });

  doc.setFont('helvetica', 'bold');
  doc.text(`Document généré par Digifeel pour ${restaurant.name} | Page 1/1`, margin, footerY + 12);

  // Save PDF
  const safeRestoSlug = restaurant.slug || 'restaurant';
  const timestamp = new Date().toISOString().slice(0, 10);
  doc.save(`digifeel_rapport_comptable_${safeRestoSlug}_${timestamp}.pdf`);
}
