import { NOT_AVAILABLE, capitalize, dayKey, formatDay, formatDayTime, formatDzd, formatInt, formatMonth, formatPercent, formatRating, formatShortDay } from './format';
import { periodLabel, type ReportModel } from './model';

type RGB = [number, number, number];
const GOLD: RGB = [200, 150, 62];
const DARK: RGB = [27, 31, 39];
const TEXT: RGB = [58, 64, 72];
const MUTED: RGB = [122, 130, 140];
const LINE: RGB = [225, 228, 232];
const SOFT: RGB = [246, 241, 231];
const WHITE: RGB = [255, 255, 255];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const TOP = 30;
const BOTTOM = PAGE_H - 18;

// Les polices standard jsPDF ne gèrent que WinAnsi : on retire tout le reste (emoji, arabe…).
const clean = (value: string) =>
  value.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\u202f|\u00a0/g, ' ').replace(/[^\u0020-\u007E\u00A1-\u00FF\u2013\u2014\u2026\u20AC]/g, '').replace(/\s+/g, ' ').trim();

type Doc = import('jspdf').jsPDF;

class Writer {
  y = TOP;
  constructor(readonly doc: Doc, readonly model: ReportModel) {}

  ensure(height: number) {
    if (this.y + height > BOTTOM) {
      this.doc.addPage();
      this.y = TOP;
    }
  }

  fill(color: RGB) { this.doc.setFillColor(color[0], color[1], color[2]); }
  stroke(color: RGB) { this.doc.setDrawColor(color[0], color[1], color[2]); }
  ink(color: RGB) { this.doc.setTextColor(color[0], color[1], color[2]); }

  text(value: string, x: number, y: number, size: number, color: RGB, style: 'normal' | 'bold' = 'normal', align: 'left' | 'right' | 'center' = 'left') {
    this.doc.setFont('helvetica', style);
    this.doc.setFontSize(size);
    this.ink(color);
    this.doc.text(clean(value), x, y, { align });
  }

  section(title: string, subtitle?: string) {
    this.ensure(45);
    this.fill(GOLD);
    this.doc.rect(MARGIN, this.y, 1.2, 7, 'F');
    this.text(title, MARGIN + 4, this.y + 5.5, 13, DARK, 'bold');
    if (subtitle) this.text(subtitle, PAGE_W - MARGIN, this.y + 5.5, 8.5, MUTED, 'normal', 'right');
    this.y += 12;
  }

  note(value: string) {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    const lines = this.doc.splitTextToSize(clean(value), CONTENT_W) as string[];
    this.ensure(lines.length * 4.5 + 3);
    this.ink(MUTED);
    this.doc.text(lines, MARGIN, this.y + 3);
    this.y += lines.length * 4.5 + 4;
  }

  kpis(items: Array<{ label: string; value: string; hint?: string }>, perRow = 3) {
    const gap = 4;
    const width = (CONTENT_W - gap * (perRow - 1)) / perRow;
    const height = 24;
    for (let i = 0; i < items.length; i += perRow) {
      this.ensure(height + 4);
      items.slice(i, i + perRow).forEach((item, index) => {
        const x = MARGIN + index * (width + gap);
        this.fill(SOFT);
        this.doc.roundedRect(x, this.y, width, height, 2, 2, 'F');
        this.text(item.label.toUpperCase(), x + 4, this.y + 6.5, 7, MUTED, 'bold');
        this.doc.setFont('helvetica', 'bold');
        let size = 15;
        this.doc.setFontSize(size);
        while (size > 9 && this.doc.getTextWidth(clean(item.value)) > width - 8) {
          size -= 1;
          this.doc.setFontSize(size);
        }
        this.text(item.value, x + 4, this.y + 15, size, DARK, 'bold');
        if (item.hint) this.text(item.hint, x + 4, this.y + 20.5, 7.5, MUTED);
      });
      this.y += height + gap;
    }
    this.y += 2;
  }

  table(columns: Array<{ label: string; width: number; align?: 'left' | 'right' | 'center' }>, rows: string[][], options: { totals?: string[] } = {}) {
    const rowH = 6.5;
    const total = columns.reduce((sum, column) => sum + column.width, 0);
    const scale = CONTENT_W / total;
    const widths = columns.map(column => column.width * scale);
    const xs = widths.map((_, index) => MARGIN + widths.slice(0, index).reduce((a, b) => a + b, 0));
    const drawHeader = () => {
      this.fill(DARK);
      this.doc.rect(MARGIN, this.y, CONTENT_W, rowH + 1, 'F');
      columns.forEach((column, index) => {
        const x = column.align === 'right' ? xs[index] + widths[index] - 2 : column.align === 'center' ? xs[index] + widths[index] / 2 : xs[index] + 2;
        this.text(column.label, x, this.y + 5, 8, WHITE, 'bold', column.align ?? 'left');
      });
      this.y += rowH + 1;
    };
    this.ensure(rowH * 3);
    drawHeader();
    const drawRow = (cells: string[], bold: boolean, shade: boolean) => {
      this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
      this.doc.setFontSize(8.5);
      const wrapped = cells.map((cell, index) => this.doc.splitTextToSize(clean(cell), widths[index] - 4) as string[]);
      const lines = Math.max(...wrapped.map(w => w.length), 1);
      const height = Math.max(rowH, lines * 4 + 2.5);
      if (this.y + height > BOTTOM) {
        this.doc.addPage();
        this.y = TOP;
        drawHeader();
      }
      if (shade) {
        this.fill(bold ? SOFT : [250, 250, 251]);
        this.doc.rect(MARGIN, this.y, CONTENT_W, height, 'F');
      }
      this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
      this.doc.setFontSize(8.5);
      this.ink(bold ? DARK : TEXT);
      wrapped.forEach((cellLines, index) => {
        const align = columns[index].align ?? 'left';
        const x = align === 'right' ? xs[index] + widths[index] - 2 : align === 'center' ? xs[index] + widths[index] / 2 : xs[index] + 2;
        this.doc.text(cellLines, x, this.y + 4.6, { align });
      });
      this.stroke(LINE);
      this.doc.line(MARGIN, this.y + height, MARGIN + CONTENT_W, this.y + height);
      this.y += height;
    };
    rows.forEach((row, index) => drawRow(row, false, index % 2 === 1));
    if (options.totals) drawRow(options.totals, true, true);
    this.y += 5;
  }

  bars(title: string, labels: string[], values: number[], format: (value: number) => string, height = 52) {
    if (values.length === 0) return;
    this.ensure(height + 10);
    this.text(title, MARGIN, this.y + 3, 9.5, DARK, 'bold');
    const top = this.y + 8;
    const plotH = height - 18;
    const max = Math.max(...values, 1);
    this.stroke(LINE);
    for (let i = 0; i <= 3; i += 1) this.doc.line(MARGIN, top + (plotH * i) / 3, MARGIN + CONTENT_W, top + (plotH * i) / 3);
    this.text(format(max), PAGE_W - MARGIN, this.y + 3, 8, MUTED, 'normal', 'right');
    const slot = CONTENT_W / values.length;
    const barW = Math.max(0.8, Math.min(12, slot * 0.7));
    const step = Math.max(1, Math.ceil(values.length / 12));
    values.forEach((value, index) => {
      const h = (plotH * value) / max;
      const x = MARGIN + slot * index + (slot - barW) / 2;
      this.fill(GOLD);
      if (h > 0) this.doc.rect(x, top + plotH - h, barW, h, 'F');
      if (index % step === 0) this.text(labels[index], x + barW / 2, top + plotH + 5, 7, MUTED, 'normal', 'center');
    });
    this.y += height + 4;
  }

  hbars(title: string, labels: string[], values: number[], format: (value: number) => string) {
    if (values.length === 0) return;
    const rowH = 7;
    this.ensure(rowH * values.length + 10);
    this.text(title, MARGIN, this.y + 3, 9.5, DARK, 'bold');
    this.y += 8;
    const labelW = 52;
    const valueW = 34;
    const max = Math.max(...values, 1);
    values.forEach((value, index) => {
      this.text(labels[index].length > 28 ? `${labels[index].slice(0, 27)}...` : labels[index], MARGIN, this.y + 4.8, 8.5, TEXT);
      const w = Math.max(0.8, ((CONTENT_W - labelW - valueW) * value) / max);
      this.fill(GOLD);
      this.doc.rect(MARGIN + labelW, this.y + 1, w, rowH - 3, 'F');
      this.text(format(value), MARGIN + labelW + w + 2, this.y + 4.8, 8.5, DARK, 'bold');
      this.y += rowH;
    });
    this.y += 4;
  }
}

function cover(w: Writer, model: ReportModel) {
  const { doc } = w;
  w.fill(DARK);
  doc.rect(0, 0, PAGE_W, 62, 'F');
  w.fill(GOLD);
  doc.rect(0, 62, PAGE_W, 1.5, 'F');
  w.fill(GOLD);
  doc.roundedRect(MARGIN, 14, 11, 11, 2.5, 2.5, 'F');
  w.text('D', MARGIN + 5.5, 22, 13, WHITE, 'bold', 'center');
  w.text('DigiFeel', MARGIN + 15, 22, 15, WHITE, 'bold');
  w.text('RAPPORT DE GESTION', PAGE_W - MARGIN, 22, 9, [215, 190, 140], 'bold', 'right');
  w.text(model.restaurantName, MARGIN, 42, 22, WHITE, 'bold');
  w.text(periodLabel(model), MARGIN, 50, 10.5, [210, 214, 220]);
  w.text(`Généré le ${formatDayTime(model.generatedAt.toISOString())}`, MARGIN, 56, 8.5, [160, 166, 176]);
  w.y = 74;
  if (model.isDemo) {
    w.note('Données de démonstration : ce rapport est généré à partir de chiffres fictifs.');
  }
}

export async function buildPdfReport(model: ReportModel): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({ title: `Rapport ${clean(model.restaurantName)}`, author: 'DigiFeel', creator: 'DigiFeel' });
  const w = new Writer(doc, model);
  cover(w, model);

  w.section('Résumé exécutif');
  w.kpis([
    { label: 'Chiffre d’affaires', value: model.hasSales ? formatDzd(model.revenue) : NOT_AVAILABLE, hint: model.trend?.change != null ? `${model.trend.change >= 0 ? '+' : ''}${formatPercent(model.trend.change)} (2e moitié vs 1re)` : undefined },
    { label: 'Commandes', value: model.hasSales ? formatInt(model.orderCount) : NOT_AVAILABLE },
    { label: 'Panier moyen', value: model.averageBasket != null ? formatDzd(model.averageBasket) : NOT_AVAILABLE },
    { label: 'Produits vendus', value: model.hasLineDetail ? formatInt(model.itemsSold) : NOT_AVAILABLE, hint: 'quantités' },
    { label: 'Avis clients', value: formatInt(model.reviewCount), hint: model.reviewCount ? `${formatInt(model.positive)} positifs · ${formatInt(model.negative)} négatifs` : undefined },
    { label: 'Note moyenne', value: model.averageRating != null ? `${formatRating(model.averageRating)} / 5` : NOT_AVAILABLE },
    ...(model.scansAvailable ? [{ label: 'Scans NFC / QR', value: formatInt(model.scansCount), hint: model.conversion != null ? `${formatPercent(model.conversion)} laissent un avis` : undefined }] : [])
  ]);

  w.section('Performance commerciale');
  if (!model.hasSales) {
    w.note('Aucune vente enregistrée par la caisse sur cette période.');
  } else {
    const monthlyView = model.periodDays > 31;
    if (monthlyView) w.bars('Chiffre d’affaires par mois', model.monthly.map(m => capitalize(formatMonth(m.month)).slice(0, 8)), model.monthly.map(m => m.revenue), formatDzd);
    else w.bars('Chiffre d’affaires par jour', model.daily.map(d => formatShortDay(d.day)), model.daily.map(d => d.revenue), formatDzd);
    if (model.bestDay) w.note(`Meilleure journée : ${formatDay(model.bestDay.day)} avec ${formatDzd(model.bestDay.revenue)}.`);
    w.table(
      [{ label: 'Mois', width: 38 }, { label: 'Commandes', width: 22, align: 'right' }, { label: 'Panier moyen', width: 30, align: 'right' }, { label: 'Chiffre d’affaires', width: 36, align: 'right' }],
      model.monthly.map(m => [capitalize(formatMonth(m.month)), formatInt(m.orders), m.averageBasket != null ? formatDzd(m.averageBasket) : NOT_AVAILABLE, formatDzd(m.revenue)]),
      { totals: ['Total', formatInt(model.orderCount), model.averageBasket != null ? formatDzd(model.averageBasket) : NOT_AVAILABLE, formatDzd(model.revenue)] }
    );
    if (model.payments.length > 0) {
      w.table(
        [{ label: 'Mode de paiement', width: 50 }, { label: 'Commandes', width: 24, align: 'right' }, { label: 'Part du CA', width: 24, align: 'right' }, { label: 'Chiffre d’affaires', width: 36, align: 'right' }],
        model.payments.map(p => [p.label, formatInt(p.orders), formatPercent(p.share), formatDzd(p.revenue)])
      );
    }
    if (model.products.length > 0) {
      const top = model.products.slice(0, 8);
      w.hbars('Produits générant le plus de chiffre d’affaires', top.map(p => p.name), top.map(p => p.revenue), formatDzd);
      w.table(
        [{ label: '#', width: 8, align: 'center' }, { label: 'Produit', width: 54 }, { label: 'Catégorie', width: 30 }, { label: 'Qté', width: 14, align: 'right' }, { label: 'CA', width: 28, align: 'right' }, { label: 'Part', width: 16, align: 'right' }],
        model.products.slice(0, 15).map(p => [String(p.rankByRevenue), p.name, p.category || NOT_AVAILABLE, formatInt(p.quantity), formatDzd(p.revenue), formatPercent(p.share)])
      );
      if (model.topByQuantity) w.note(`Produit le plus vendu : ${model.topByQuantity.name} (${formatInt(model.topByQuantity.quantity)} unités).`);
    } else {
      w.note('Le détail des produits vendus n’est pas disponible pour cette période.');
    }
  }

  w.section('Équipe', 'Activité de la période');
  if (model.servers.length === 0) {
    w.note(NOT_AVAILABLE);
  } else {
    w.table(
      [{ label: 'Serveur', width: 44 }, { label: 'Commandes', width: 22, align: 'right' }, { label: 'CA', width: 30, align: 'right' }, { label: 'Panier moyen', width: 28, align: 'right' }, { label: 'Avis', width: 14, align: 'right' }, { label: 'Note', width: 16, align: 'right' }],
      model.servers.map(s => [s.name, formatInt(s.orders), formatDzd(s.revenue), s.averageBasket != null ? formatDzd(s.averageBasket) : NOT_AVAILABLE, formatInt(s.reviewCount), s.averageRating != null ? formatRating(s.averageRating) : NOT_AVAILABLE])
    );
    w.note('Ce tableau aide le responsable à comprendre l’activité de l’équipe ; il n’a pas vocation à sanctionner.');
  }

  w.section('Avis clients');
  if (model.reviewCount === 0) {
    w.note('Aucun avis reçu sur cette période.');
  } else {
    w.hbars('Répartition des notes', model.distribution.map(d => `${d.stars} étoile${d.stars > 1 ? 's' : ''}`), model.distribution.map(d => d.count), v => formatInt(v));
    w.note(`${formatInt(model.reviewCount)} avis, note moyenne ${formatRating(model.averageRating ?? 0)} / 5 · ${formatInt(model.positive)} positifs, ${formatInt(model.neutral)} neutres, ${formatInt(model.negative)} négatifs.`);
    const allCommented = model.reviews.filter(r => r.comment.trim());
    const commentedShown = 15;
    const commented = allCommented.slice(0, commentedShown);
    if (commented.length > 0) {
      w.table(
        [{ label: 'Date', width: 20 }, { label: 'Note', width: 12, align: 'center' }, { label: 'Commentaire', width: 110 }, { label: 'Serveur', width: 30 }],
        commented.map(r => [formatDay(dayKey(r.created_at)), `${r.stars}/5`, r.comment, r.server_name ?? NOT_AVAILABLE])
      );
      if (allCommented.length > commentedShown) {
        w.note(`${formatInt(allCommented.length - commentedShown)} commentaire(s) supplémentaire(s) disponible(s) dans l'export Excel (feuille "Avis clients").`);
      }
    }
  }

  if (model.scansAvailable) {
    w.section('NFC / Google');
    w.table(
      [{ label: 'Indicateur', width: 80 }, { label: 'Valeur', width: 60, align: 'right' }],
      [
        ['Scans NFC / QR', formatInt(model.scansCount)],
        ['Scans par jour (moyenne)', model.scansPerDay != null ? model.scansPerDay.toFixed(1).replace('.', ',') : NOT_AVAILABLE],
        ['Avis générés', formatInt(model.reviewCount)],
        ['Taux de conversion scan vers avis', model.conversion != null ? formatPercent(model.conversion) : NOT_AVAILABLE],
        ['Redirections vers Google', NOT_AVAILABLE]
      ]
    );
  }

  w.section('Synthèse finale');
  const lines = [
    model.hasSales ? `${formatInt(model.orderCount)} commandes pour ${formatDzd(model.revenue)} de chiffre d’affaires.` : 'Aucune vente enregistrée sur la période.',
    model.averageBasket != null ? `Panier moyen : ${formatDzd(model.averageBasket)}.` : '',
    model.reviewCount ? `${formatInt(model.reviewCount)} avis clients, note moyenne ${formatRating(model.averageRating ?? 0)} / 5.` : 'Aucun avis client sur la période.',
    model.scansAvailable ? `${formatInt(model.scansCount)} scans NFC / QR.` : ''
  ].filter(Boolean);
  lines.forEach(line => w.note(line));

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    if (page > 1) {
      w.fill(DARK);
      doc.rect(0, 0, PAGE_W, 16, 'F');
      w.text('DigiFeel', MARGIN, 10.5, 10, WHITE, 'bold');
      w.text(`${model.restaurantName} · ${periodLabel(model)}`, PAGE_W - MARGIN, 10.5, 8, [210, 214, 220], 'normal', 'right');
    }
    w.stroke(LINE);
    doc.line(MARGIN, PAGE_H - 13, PAGE_W - MARGIN, PAGE_H - 13);
    w.text(`Généré le ${formatDayTime(model.generatedAt.toISOString())} · DigiFeel`, MARGIN, PAGE_H - 8, 7.5, MUTED);
    w.text(`Page ${page} / ${pages}`, PAGE_W - MARGIN, PAGE_H - 8, 7.5, MUTED, 'normal', 'right');
  }
  return doc.output('blob');
}
