import { describe, expect, it } from 'vitest';
import { parseMenuCsv } from '@/src/lib/pos/menu-import';

describe('import du menu', () => {
  it('lit un CSV français avec en-tête (point-virgule, virgule décimale)', () => {
    const { rows, errors } = parseMenuCsv('Nom;Catégorie;Prix\nCouscous royal;Plats;1 250,50\n"Thé, menthe";Boissons;3', 'EUR');
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { name: 'Couscous royal', category: 'Plats', priceMinor: 125050 },
      { name: 'Thé, menthe', category: 'Boissons', priceMinor: 300 }
    ]);
  });

  it('accepte un fichier sans en-tête et sans catégorie', () => {
    const { rows } = parseMenuCsv('Chorba,450\nBrik,200', 'DZD');
    expect(rows).toEqual([
      { name: 'Chorba', category: 'Divers', priceMinor: 450 },
      { name: 'Brik', category: 'Divers', priceMinor: 200 }
    ]);
  });

  it('signale les lignes illisibles sans bloquer les autres', () => {
    const { rows, errors } = parseMenuCsv('nom;prix\nPizza;abc\nTarte;5', 'EUR');
    expect(rows).toHaveLength(1);
    expect(errors[0]).toContain('Ligne 2');
  });
});
