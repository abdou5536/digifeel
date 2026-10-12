import { describe, expect, it } from 'vitest';
import { bookToBuffer, read, safeCell, utils } from '@/src/lib/xlsxCompat';

describe('export / import Excel (remplace xlsx)', () => {
  it('aller-retour : les valeurs exportées sont celles relues', async () => {
    const book = utils.book_new();
    utils.book_append_sheet(book, utils.json_to_sheet([{ Produit: 'Pizza', Prix: 1200 }, { Produit: 'Café', Prix: 150 }]), 'Menu');
    const back = await read(await bookToBuffer(book));
    expect(back.SheetNames).toEqual(['Menu']);
    expect(utils.sheet_to_json(back.Sheets.Menu)).toEqual([{ Produit: 'Pizza', Prix: 1200 }, { Produit: 'Café', Prix: 150 }]);
  });
  it('neutralise l’injection de formule', async () => {
    expect(safeCell('=HYPERLINK("http://evil")')).toBe('\'=HYPERLINK("http://evil")');
    expect(safeCell('@SUM(A1)')).toBe('\'@SUM(A1)');
    expect(safeCell('Pizza')).toBe('Pizza');
    expect(safeCell(-5)).toBe(-5);
  });
  it('import CSV de secours', async () => {
    const csv = new TextEncoder().encode('Produit,Prix\nPizza,1200\n"Soupe, du jour",300\n');
    const book = await read(csv.buffer as ArrayBuffer);
    expect(utils.sheet_to_json(book.Sheets.Sheet1)).toEqual([{ Produit: 'Pizza', Prix: '1200' }, { Produit: 'Soupe, du jour', Prix: '300' }]);
  });
  it('fichier corrompu : pas de plantage, feuille vide', async () => {
    const book = await read(new TextEncoder().encode('\u0000\u0001garbage').buffer as ArrayBuffer);
    expect(Array.isArray(book.Sheets.Sheet1)).toBe(true);
  });
});