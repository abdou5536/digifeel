import { describe, expect, it } from 'vitest';
import { buildLocalBackup, parseLocalBackup } from '@/src/lib/pos/local-backup';
import type { LocalPosSale } from '@/src/lib/pos/types';

const sale = (id: string): LocalPosSale => ({
  id, ownerId: 'u', items: [{ productId: 'p', productName: 'Pizza', quantity: 1, priceDzd: 1200 }],
  paymentMethod: 'cash', paymentReference: '', syncSource: 'offline', createdAt: '2026-10-11T10:00:00Z', status: 'pending'
} as LocalPosSale);
const ID = '71000000-0000-4000-8000-000000000001';

describe('sauvegarde locale', () => {
  it('relit ce qu\'elle a écrit', () => {
    const raw = JSON.stringify(buildLocalBackup([sale(ID)]));
    expect(parseLocalBackup(raw).map(s => s.id)).toEqual([ID]);
  });
  it('refuse un fichier qui n\'est pas une sauvegarde Digifeel', () => {
    expect(() => parseLocalBackup('pas du json')).toThrow();
    expect(() => parseLocalBackup('{"sales":[]}')).toThrow();
    expect(() => parseLocalBackup(JSON.stringify({ format: 'digifeel-local-backup', version: 2, sales: [] }))).toThrow();
  });
  it('refuse une vente invalide', () => {
    const raw = JSON.stringify(buildLocalBackup([{ ...sale(ID), id: 'x' }]));
    expect(() => parseLocalBackup(raw)).toThrow(/endommagée/);
    const empty = JSON.stringify(buildLocalBackup([{ ...sale(ID), items: [] }]));
    expect(() => parseLocalBackup(empty)).toThrow();
  });
});
