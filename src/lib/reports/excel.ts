import type { Worksheet, Workbook } from 'exceljs';
import { barChartBase64 } from './charts';
import { NOT_AVAILABLE, dayKey, formatTime, formatDay, formatDayTime, formatMonth, formatShortDay, formatInt, formatDzd, capitalize } from './format';
import { periodLabel, type ReportModel } from './model';

const GOLD = 'FFC8963E';
const DARK = 'FF1B1F27';
const LIGHT = 'FFF6F1E7';
const BORDER = { style: 'thin' as const, color: { argb: 'FFD9DCE0' } };
const FMT_DZD = '#,##0 "DZD"';
const FMT_PCT = '0.0%';

const sanitize = (value: string) => value.replace(/[\u0000-\u001F]/g, ' ').trim();

function titleBlock(ws: Worksheet, model: ReportModel, title: string, span: number) {
  ws.mergeCells(1, 1, 1, span);
  const t = ws.getCell(1, 1);
  t.value = title;
  t.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } };
  t.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(1).height = 32;
  ws.mergeCells(2, 1, 2, span);
  const s = ws.getCell(2, 1);
  s.value = `${model.restaurantName}  ·  ${periodLabel(model)}${model.isDemo ? '  ·  Données de démonstration' : ''}`;
  s.font = { size: 10, color: { argb: 'FF5A616B' } };
  s.alignment = { indent: 1 };
}

function headerRow(ws: Worksheet, rowNumber: number, labels: string[], startCol = 1) {
  const row = ws.getRow(rowNumber);
  labels.forEach((label, index) => {
    const cell = row.getCell(startCol + index);
    cell.value = label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
  });
  row.height = 24;
}

function sectionTitle(ws: Worksheet, row: number, col: number, text: string) {
  const cell = ws.getCell(row, col);
  cell.value = text;
  cell.font = { bold: true, size: 13, color: { argb: DARK } };
}

function styleBody(ws: Worksheet, from: number, to: number, startCol: number, endCol: number) {
  for (let r = from; r <= to; r += 1) {
    for (let c = startCol; c <= endCol; c += 1) {
      const cell = ws.getCell(r, c);
      cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
      if ((r - from) % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFB' } };
      cell.alignment = { vertical: 'top', horizontal: cell.alignment?.horizontal, wrapText: cell.alignment?.wrapText };
    }
  }
}

function totalRow(ws: Worksheet, rowNumber: number, startCol: number, endCol: number) {
  for (let c = startCol; c <= endCol; c += 1) {
    const cell = ws.getCell(rowNumber, c);
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } };
    cell.border = { top: { style: 'medium', color: { argb: GOLD } }, bottom: BORDER, left: BORDER, right: BORDER };
  }
}

function widths(ws: Worksheet, list: number[]) {
  list.forEach((width, index) => { ws.getColumn(index + 1).width = width; });
}

function printSetup(ws: Worksheet, titleRows: string) {
  ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: titleRows, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } };
  ws.headerFooter = { oddFooter: '&LDigiFeel&CPage &P / &N&R&D' };
  ws.views = [{ ...(ws.views?.[0] ?? {}), showGridLines: false }];
}

function addChart(workbook: Workbook, ws: Worksheet, base64: string | null, col: number, row: number, width: number, height: number) {
  if (!base64) return;
  const id = workbook.addImage({ base64, extension: 'png' });
  ws.addImage(id, { tl: { col: col - 1, row: row - 1 }, ext: { width, height } });
}

function addDataBars(ws: Worksheet, ref: string) {
  ws.addConditionalFormatting({
    ref,
    rules: [{ type: 'dataBar', priority: 1, gradient: false, minLength: 0, maxLength: 100, cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: 'FFE5C98F' } } as never]
  });
}

function summarySheet(workbook: Workbook, model: ReportModel) {
  const ws = workbook.addWorksheet('Synthèse', { properties: { tabColor: { argb: GOLD } } });
  widths(ws, [34, 24, 18, 18, 18, 4, 14]);
  titleBlock(ws, model, 'Rapport de gestion', 5);
  ws.getCell(3, 1).value = `Généré le ${formatDayTime(model.generatedAt.toISOString())}`;
  ws.getCell(3, 1).font = { size: 9, italic: true, color: { argb: 'FF7A828C' } };

  sectionTitle(ws, 5, 1, 'Indicateurs clés');
  headerRow(ws, 6, ['Indicateur', 'Valeur']);
  const kpis: Array<[string, string | number, string?]> = [
    ['Chiffre d’affaires total', model.hasSales ? model.revenue : NOT_AVAILABLE, FMT_DZD],
    ['Nombre de commandes', model.hasSales ? model.orderCount : NOT_AVAILABLE, '#,##0'],
    ['Panier moyen', model.averageBasket ?? NOT_AVAILABLE, FMT_DZD],
    ['Produits vendus (quantité)', model.hasLineDetail ? model.itemsSold : NOT_AVAILABLE, '#,##0'],
    ['Produit le plus vendu', model.topByQuantity ? `${model.topByQuantity.name} (${formatInt(model.topByQuantity.quantity)})` : NOT_AVAILABLE],
    ['Produit n°1 en chiffre d’affaires', model.topByRevenue ? `${model.topByRevenue.name} (${formatDzd(model.topByRevenue.revenue)})` : NOT_AVAILABLE],
    ['Meilleure journée', model.bestDay ? `${formatDay(model.bestDay.day)} · ${formatDzd(model.bestDay.revenue)}` : NOT_AVAILABLE],
    ['Évolution du CA (2ᵉ moitié vs 1ʳᵉ)', model.trend?.change ?? NOT_AVAILABLE, '+0.0%;-0.0%;0.0%'],
    ['Nombre d’avis clients', model.reviewCount, '#,##0'],
    ['Note moyenne', model.averageRating ?? NOT_AVAILABLE, '0.0" / 5"'],
    ['Scans NFC / QR', model.scansAvailable ? model.scansCount : NOT_AVAILABLE, '#,##0'],
    ...(model.voidedCount > 0
      ? [
          ['Ventes annulées (exclues du CA)', model.voidedCount, '#,##0'] as [string, number, string],
          ['Montant des ventes annulées', model.voidedDzd, FMT_DZD] as [string, number, string]
        ]
      : [])
  ];
  kpis.forEach(([label, value, fmt], index) => {
    const row = 7 + index;
    ws.getCell(row, 1).value = label;
    ws.getCell(row, 1).font = { bold: true };
    const cell = ws.getCell(row, 2);
    cell.value = value;
    if (fmt && typeof value === 'number') cell.numFmt = fmt;
    cell.alignment = { horizontal: 'right' };
  });
  styleBody(ws, 7, 6 + kpis.length, 1, 2);
  for (let r = 7; r < 7 + kpis.length; r += 1) ws.getCell(r, 2).alignment = { horizontal: 'right', vertical: 'top' };
  ws.getColumn(2).width = 44;

  let row = 8 + kpis.length;
  if (model.monthly.length > 0) {
    sectionTitle(ws, row, 1, 'Addition par mois');
    headerRow(ws, row + 1, ['Mois', 'Chiffre d’affaires', 'Commandes', 'Panier moyen']);
    model.monthly.forEach((month, index) => {
      const r = row + 2 + index;
      ws.getCell(r, 1).value = capitalize(formatMonth(month.month));
      ws.getCell(r, 2).value = month.revenue;
      ws.getCell(r, 2).numFmt = FMT_DZD;
      ws.getCell(r, 3).value = month.orders;
      ws.getCell(r, 4).value = month.averageBasket ?? NOT_AVAILABLE;
      ws.getCell(r, 4).numFmt = FMT_DZD;
    });
    const first = row + 2;
    const last = row + 1 + model.monthly.length;
    styleBody(ws, first, last, 1, 4);
    const total = last + 1;
    ws.getCell(total, 1).value = 'Total';
    ws.getCell(total, 2).value = { formula: `SUM(B${first}:B${last})`, result: model.revenue };
    ws.getCell(total, 2).numFmt = FMT_DZD;
    ws.getCell(total, 3).value = { formula: `SUM(C${first}:C${last})`, result: model.orderCount };
    ws.getCell(total, 4).value = model.averageBasket ?? NOT_AVAILABLE;
    ws.getCell(total, 4).numFmt = FMT_DZD;
    totalRow(ws, total, 1, 4);
    row = total + 2;
  }

  if (model.payments.length > 0) {
    sectionTitle(ws, row, 1, 'Modes de paiement');
    headerRow(ws, row + 1, ['Mode', 'Chiffre d’affaires', 'Commandes', 'Part du CA']);
    model.payments.forEach((payment, index) => {
      const r = row + 2 + index;
      ws.getCell(r, 1).value = payment.label;
      ws.getCell(r, 2).value = payment.revenue;
      ws.getCell(r, 2).numFmt = FMT_DZD;
      ws.getCell(r, 3).value = payment.orders;
      ws.getCell(r, 4).value = payment.share;
      ws.getCell(r, 4).numFmt = FMT_PCT;
    });
    styleBody(ws, row + 2, row + 1 + model.payments.length, 1, 4);
    row += model.payments.length + 3;
  }

  if (model.hasSales) {
    const monthlyView = model.periodDays > 31;
    const labels = monthlyView ? model.monthly.map(m => capitalize(formatMonth(m.month))) : model.daily.map(d => formatShortDay(d.day));
    const values = monthlyView ? model.monthly.map(m => m.revenue) : model.daily.map(d => d.revenue);
    addChart(workbook, ws, barChartBase64({ title: monthlyView ? 'Chiffre d’affaires par mois (DZD)' : 'Chiffre d’affaires par jour (DZD)', labels, values, format: formatDzd }), 1, row, 640, 300);
  }
  printSetup(ws, '1:2');
}

function ordersSheet(workbook: Workbook, model: ReportModel) {
  if (!model.hasSales) return;
  const ws = workbook.addWorksheet('Ventes', { properties: { tabColor: { argb: 'FF3B82F6' } } });
  const labels = ['Date', 'Heure', 'N° ticket', 'Serveur', 'Produit', 'Catégorie', 'Qté', 'Prix unitaire', 'Total ligne', 'Paiement', 'Total ticket'];
  widths(ws, [12, 8, 10, 22, 30, 18, 7, 15, 15, 13, 15]);
  titleBlock(ws, model, 'Ventes et commandes', labels.length);
  headerRow(ws, 4, labels);
  let r = 5;
  for (const order of model.orders) {
    const lines = order.lines.length ? order.lines : [null];
    lines.forEach((line, index) => {
      const row = ws.getRow(r);
      row.getCell(1).value = formatDay(order.day);
      row.getCell(2).value = formatTime(order.soldAt);
      row.getCell(3).value = order.ticketNo;
      row.getCell(4).value = sanitize(order.server);
      row.getCell(5).value = line ? sanitize(line.product) : 'Détail non disponible';
      row.getCell(6).value = line ? sanitize(line.category || NOT_AVAILABLE) : '';
      if (line) {
        row.getCell(7).value = line.quantity;
        row.getCell(8).value = line.unitPrice;
        row.getCell(9).value = line.total;
      }
      row.getCell(10).value = order.payment;
      if (index === 0) row.getCell(11).value = order.total;
      [8, 9, 11].forEach(c => { row.getCell(c).numFmt = FMT_DZD; });
      [1, 2, 3, 7, 10].forEach(c => { row.getCell(c).alignment = { horizontal: 'center' }; });
      r += 1;
    });
  }
  const last = r - 1;
  styleBody(ws, 5, last, 1, labels.length);
  ws.getCell(r, 1).value = 'Total';
  ws.getCell(r, 3).value = model.orderCount;
  ws.getCell(r, 3).numFmt = '#,##0" ticket(s)"';
  ws.getCell(r, 11).value = { formula: `SUM(K5:K${last})`, result: model.revenue };
  ws.getCell(r, 11).numFmt = FMT_DZD;
  totalRow(ws, r, 1, labels.length);
  ws.views = [{ state: 'frozen', ySplit: 4, showGridLines: false }];
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: last, column: labels.length } };
  printSetup(ws, '4:4');
}

function productsSheet(workbook: Workbook, model: ReportModel) {
  if (model.products.length === 0) return;
  const ws = workbook.addWorksheet('Produits', { properties: { tabColor: { argb: 'FF22C55E' } } });
  const labels = ['Rang CA', 'Produit', 'Catégorie', 'Quantité vendue', 'Prix unitaire moyen', 'Chiffre d’affaires', 'Part du CA', 'Rang ventes'];
  widths(ws, [9, 32, 18, 12, 16, 17, 11, 11]);
  titleBlock(ws, model, 'Suivi des produits', labels.length);
  headerRow(ws, 4, labels);
  model.products.forEach((product, index) => {
    const r = 5 + index;
    const values: Array<string | number> = [product.rankByRevenue, sanitize(product.name), sanitize(product.category || NOT_AVAILABLE), product.quantity, product.averagePrice, product.revenue, product.share, product.rankByQuantity];
    values.forEach((value, c) => { ws.getCell(r, c + 1).value = value; });
    ws.getCell(r, 5).numFmt = FMT_DZD;
    ws.getCell(r, 6).numFmt = FMT_DZD;
    ws.getCell(r, 7).numFmt = FMT_PCT;
    [1, 4, 8].forEach(c => { ws.getCell(r, c).alignment = { horizontal: 'center' }; });
  });
  const last = 4 + model.products.length;
  styleBody(ws, 5, last, 1, labels.length);
  const t = last + 1;
  ws.getCell(t, 2).value = 'Total';
  ws.getCell(t, 4).value = { formula: `SUM(D5:D${last})`, result: model.products.reduce((s, p) => s + p.quantity, 0) };
  ws.getCell(t, 6).value = { formula: `SUM(F5:F${last})`, result: model.products.reduce((s, p) => s + p.revenue, 0) };
  ws.getCell(t, 6).numFmt = FMT_DZD;
  ws.getCell(t, 7).value = 1;
  ws.getCell(t, 7).numFmt = FMT_PCT;
  totalRow(ws, t, 1, labels.length);
  addDataBars(ws, `F5:F${last}`);
  ws.views = [{ state: 'frozen', ySplit: 4, showGridLines: false }];
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: last, column: labels.length } };

  const top = model.products.slice(0, 8);
  addChart(workbook, ws, barChartBase64({ title: 'Top produits par CA (DZD)', labels: top.map(p => p.name), values: top.map(p => p.revenue), format: formatDzd, orientation: 'horizontal', height: Math.max(180, 70 + top.length * 30) }), 10, 4, 640, Math.max(180, 70 + top.length * 30));
  ws.getColumn(9).width = 3;
  printSetup(ws, '4:4');
}

function teamSheet(workbook: Workbook, model: ReportModel) {
  if (model.servers.length === 0) return;
  const ws = workbook.addWorksheet('Équipe', { properties: { tabColor: { argb: 'FF8B5CF6' } } });
  const labels = ['Rang', 'Serveur', 'Commandes', 'Chiffre d’affaires', 'Panier moyen', 'Avis reçus', 'Note moyenne'];
  widths(ws, [8, 28, 13, 18, 16, 12, 14]);
  titleBlock(ws, model, 'Équipe — activité de la période', labels.length);
  headerRow(ws, 4, labels);
  model.servers.forEach((server, index) => {
    const r = 5 + index;
    ws.getCell(r, 1).value = server.rank ?? '';
    ws.getCell(r, 2).value = sanitize(server.name);
    ws.getCell(r, 3).value = server.orders;
    ws.getCell(r, 4).value = server.revenue;
    ws.getCell(r, 4).numFmt = FMT_DZD;
    ws.getCell(r, 5).value = server.averageBasket ?? NOT_AVAILABLE;
    ws.getCell(r, 5).numFmt = FMT_DZD;
    ws.getCell(r, 6).value = server.reviewCount;
    ws.getCell(r, 7).value = server.averageRating ?? NOT_AVAILABLE;
    ws.getCell(r, 7).numFmt = '0.0" / 5"';
    [1, 3, 6, 7].forEach(c => { ws.getCell(r, c).alignment = { horizontal: 'center' }; });
  });
  const last = 4 + model.servers.length;
  styleBody(ws, 5, last, 1, labels.length);
  const t = last + 1;
  ws.getCell(t, 2).value = 'Total';
  ws.getCell(t, 3).value = { formula: `SUM(C5:C${last})`, result: model.orderCount };
  ws.getCell(t, 4).value = { formula: `SUM(D5:D${last})`, result: model.revenue };
  ws.getCell(t, 4).numFmt = FMT_DZD;
  ws.getCell(t, 6).value = { formula: `SUM(F5:F${last})`, result: model.servers.reduce((s, x) => s + x.reviewCount, 0) };
  totalRow(ws, t, 1, labels.length);
  ws.getCell(t + 2, 2).value = 'Ce tableau décrit l’activité de l’équipe afin d’aider le pilotage du service.';
  ws.getCell(t + 2, 2).font = { italic: true, size: 9, color: { argb: 'FF7A828C' } };
  if (model.unattributedReviews > 0) {
    ws.getCell(t + 3, 2).value = `${model.unattributedReviews} avis ne sont rattachés à aucun serveur.`;
    ws.getCell(t + 3, 2).font = { italic: true, size: 9, color: { argb: 'FF7A828C' } };
  }
  addDataBars(ws, `D5:D${last}`);
  ws.views = [{ state: 'frozen', ySplit: 4, showGridLines: false }];
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: last, column: labels.length } };
  printSetup(ws, '4:4');
}

function reviewsSheet(workbook: Workbook, model: ReportModel) {
  if (model.reviewCount === 0) return;
  const ws = workbook.addWorksheet('Avis clients', { properties: { tabColor: { argb: 'FFF59E0B' } } });
  const labels = ['Date', 'Note', 'Commentaire', 'Serveur', 'Source', 'Traité'];
  widths(ws, [12, 9, 56, 20, 16, 10, 3, 24, 12, 12]);
  titleBlock(ws, model, 'Avis clients', 10);
  headerRow(ws, 4, labels);
  model.reviews.forEach((review, index) => {
    const r = 5 + index;
    ws.getCell(r, 1).value = formatDay(dayKey(review.created_at));
    ws.getCell(r, 2).value = review.stars;
    ws.getCell(r, 2).numFmt = '0" ★"';
    ws.getCell(r, 3).value = sanitize(review.comment) || 'Sans commentaire';
    ws.getCell(r, 3).alignment = { wrapText: true, vertical: 'top' };
    ws.getCell(r, 4).value = review.server_name ? sanitize(review.server_name) : NOT_AVAILABLE;
    ws.getCell(r, 5).value = 'NFC / QR';
    ws.getCell(r, 6).value = typeof review.handled === 'boolean' ? (review.handled ? 'Oui' : 'Non') : NOT_AVAILABLE;
    [1, 2, 5, 6].forEach(c => { ws.getCell(r, c).alignment = { horizontal: 'center', vertical: 'top' }; });
  });
  const last = 4 + model.reviews.length;
  styleBody(ws, 5, last, 1, labels.length);
  for (let r = 5; r <= last; r += 1) ws.getCell(r, 3).alignment = { wrapText: true, vertical: 'top' };

  sectionTitle(ws, 4, 8, 'Synthèse');
  const summary: Array<[string, number | string, string?]> = [
    ['Avis au total', model.reviewCount, '#,##0'],
    ['Note moyenne', model.averageRating ?? NOT_AVAILABLE, '0.00" / 5"'],
    ['Avis positifs (4-5 ★)', model.positive, '#,##0'],
    ['Avis neutres (3 ★)', model.neutral, '#,##0'],
    ['Avis négatifs (1-2 ★)', model.negative, '#,##0'],
    ['Avec commentaire', model.commented, '#,##0']
  ];
  summary.forEach(([label, value, fmt], i) => {
    ws.getCell(5 + i, 8).value = label;
    ws.getCell(5 + i, 9).value = value;
    if (fmt && typeof value === 'number') ws.getCell(5 + i, 9).numFmt = fmt;
  });
  styleBody(ws, 5, 4 + summary.length, 8, 9);
  const dStart = 6 + summary.length + 1;
  headerRow(ws, dStart, ['Note', 'Avis', 'Part'], 8);
  model.distribution.forEach((d, i) => {
    ws.getCell(dStart + 1 + i, 8).value = `${d.stars} ★`;
    ws.getCell(dStart + 1 + i, 9).value = d.count;
    ws.getCell(dStart + 1 + i, 10).value = d.share;
    ws.getCell(dStart + 1 + i, 10).numFmt = FMT_PCT;
  });
  styleBody(ws, dStart + 1, dStart + 5, 8, 10);
  let next = dStart + 7;
  if (model.ratingByMonth.length > 0) {
    headerRow(ws, next, ['Mois', 'Note', 'Avis'], 8);
    model.ratingByMonth.forEach((m, i) => {
      ws.getCell(next + 1 + i, 8).value = capitalize(formatMonth(m.month));
      ws.getCell(next + 1 + i, 9).value = m.average;
      ws.getCell(next + 1 + i, 9).numFmt = '0.00';
      ws.getCell(next + 1 + i, 10).value = m.count;
    });
    styleBody(ws, next + 1, next + model.ratingByMonth.length, 8, 10);
    next += model.ratingByMonth.length + 2;
  }
  addChart(workbook, ws, barChartBase64({ title: 'Répartition des notes', labels: model.distribution.map(d => `${d.stars} ★`), values: model.distribution.map(d => d.count), format: formatInt, orientation: 'horizontal', width: 420, height: 230 }), 8, next, 420, 230);
  ws.views = [{ state: 'frozen', ySplit: 4, showGridLines: false }];
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: last, column: labels.length } };
  printSetup(ws, '4:4');
}

function nfcSheet(workbook: Workbook, model: ReportModel) {
  if (!model.scansAvailable) return;
  const ws = workbook.addWorksheet('NFC & Google', { properties: { tabColor: { argb: 'FF06B6D4' } } });
  widths(ws, [34, 18, 4, 14, 12]);
  titleBlock(ws, model, 'NFC / QR et avis Google', 5);
  headerRow(ws, 4, ['Indicateur', 'Valeur']);
  const rows: Array<[string, number | string, string?]> = [
    ['Scans NFC / QR', model.scansCount, '#,##0'],
    ['Scans par jour (moyenne)', model.scansPerDay ?? NOT_AVAILABLE, '0.0'],
    ['Meilleure journée de scans', model.bestScanDay ? `${formatDay(model.bestScanDay.day)} (${model.bestScanDay.count})` : NOT_AVAILABLE],
    ['Avis générés', model.reviewCount, '#,##0'],
    ['Taux de conversion scan → avis', model.conversion ?? NOT_AVAILABLE, FMT_PCT],
    ['Redirections vers Google', NOT_AVAILABLE],
    ['Scans par emplacement / puce', NOT_AVAILABLE]
  ];
  rows.forEach(([label, value, fmt], i) => {
    ws.getCell(5 + i, 1).value = label;
    ws.getCell(5 + i, 2).value = value;
    ws.getCell(5 + i, 2).alignment = { horizontal: 'right' };
    if (fmt && typeof value === 'number') ws.getCell(5 + i, 2).numFmt = fmt;
  });
  styleBody(ws, 5, 4 + rows.length, 1, 2);
  for (let r = 5; r < 5 + rows.length; r += 1) ws.getCell(r, 2).alignment = { horizontal: 'right', vertical: 'top' };
  ws.getColumn(2).width = 26;
  const start = 6 + rows.length;
  sectionTitle(ws, start, 1, 'Scans par jour');
  headerRow(ws, start + 1, ['Date', 'Scans']);
  model.scansByDay.forEach((d, i) => {
    ws.getCell(start + 2 + i, 1).value = formatDay(d.date);
    ws.getCell(start + 2 + i, 2).value = d.count;
  });
  const last = start + 1 + model.scansByDay.length;
  styleBody(ws, start + 2, last, 1, 2);
  addDataBars(ws, `B${start + 2}:B${last}`);
  addChart(workbook, ws, barChartBase64({ title: 'Scans par jour', labels: model.scansByDay.map(d => formatShortDay(d.date)), values: model.scansByDay.map(d => d.count), format: formatInt }), 4, 4, 560, 280);
  printSetup(ws, '1:2');
}

export async function buildExcelReport(model: ReportModel): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DigiFeel';
  workbook.created = model.generatedAt;
  workbook.title = `Rapport ${model.restaurantName}`;
  summarySheet(workbook, model);
  ordersSheet(workbook, model);
  productsSheet(workbook, model);
  teamSheet(workbook, model);
  reviewsSheet(workbook, model);
  nfcSheet(workbook, model);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
