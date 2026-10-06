import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildReportModel, type ExportData } from '@/src/lib/reports/model';
import { buildExcelReport } from '@/src/lib/reports/excel';
import { buildPdfReport } from '@/src/lib/reports/pdf';

const sale = (n: number, iso: string, total: number, cashier: string, lines: Array<[string, string, number, number]>) => ({
  id: `s${n}`, ticket_no: n, sold_at: iso, total_dzd: total, payment_method: 'cash', cashier_name: cashier,
  lines: lines.map(([product_name, category, quantity, unit_price_dzd]) => ({ product_name, category, quantity, unit_price_dzd, line_total_dzd: quantity * unit_price_dzd }))
}) as never;

const data: ExportData = {
  restaurantName: 'Test Resto', periodDays: 30, periodFrom: '2026-04-01T10:00:00Z', generatedAt: '2026-04-30T10:00:00Z',
  scansCount: 10, scansByDay: [{ date: '2026-04-10', count: 6 }, { date: '2026-04-11', count: 4 }],
  reviewCount: 2, averageRating: 4,
  reviews: [
    { id: 'r1', stars: 5, comment: 'Super 😀 مرحبا', created_at: '2026-04-10T10:00:00Z', server_id: 'a', server_name: 'Samir' },
    { id: 'r2', stars: 3, comment: '', created_at: '2026-04-11T10:00:00Z', server_id: null, server_name: null }
  ],
  sales: {
    totalDzd: 1500, salesCount: 2, byServer: [], byMonth: [],
    sales: [
      sale(1, '2026-04-10T12:00:00Z', 1000, 'Samir', [['Pizza', 'Plats', 2, 400], ['Eau', 'Boissons', 1, 200]]),
      sale(2, '2026-04-12T12:00:00Z', 500, 'Yasmine', [['Pizza', 'Plats', 1, 400], ['Eau', 'Boissons', 1, 100]])
    ]
  } as never
};

describe('rapports PDF / Excel', () => {
  it('calcule les totaux à partir des ventes réelles', () => {
    const m = buildReportModel(data);
    expect(m.revenue).toBe(1500);
    expect(m.orderCount).toBe(2);
    expect(m.averageBasket).toBe(750);
    expect(m.itemsSold).toBe(5);
    expect(m.topByQuantity?.name).toBe('Pizza');
    expect(m.servers.map(s => s.rank)).toEqual([1, 2]);
    expect(m.unattributedReviews).toBe(1);
    expect(m.conversion).toBeCloseTo(0.2);
  });

  it('ne fabrique aucune donnée quand il n’y a pas de ventes', () => {
    const m = buildReportModel({ ...data, scansByDay: [], reviews: [], reviewCount: 0, sales: { totalDzd: 0, salesCount: 0, sales: [], byServer: [], byMonth: [] } });
    expect(m.averageBasket).toBeNull();
    expect(m.averageRating).toBeNull();
    expect(m.conversion).toBeNull();
    expect(m.scansAvailable).toBe(false);
  });

  it('génère un Excel et un PDF valides sans valeur technique', async () => {
    const m = buildReportModel(data);
    const xlsx = Buffer.from(await (await buildExcelReport(m)).arrayBuffer());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(xlsx as never);
    expect(wb.worksheets.map(s => s.name)).toEqual(['Synthèse', 'Ventes', 'Produits', 'Équipe', 'Avis clients', 'NFC & Google']);
    const cells: string[] = [];
    wb.worksheets.forEach(s => s.eachRow(r => r.eachCell(c => cells.push(String(c.text)))));
    const text = cells.join('|');
    expect(text).not.toMatch(/undefined|NaN|null|\[object/);
    expect(wb.getWorksheet('Ventes')?.views[0]).toMatchObject({ state: 'frozen', ySplit: 4 });
    const pdf = Buffer.from(await (await buildPdfReport(m)).arrayBuffer());
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
