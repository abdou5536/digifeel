import type { LocalPosSale } from './types';

const SALE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FORMAT = 'digifeel-local-backup';

export interface LocalBackup {
  format: typeof FORMAT;
  version: 1;
  createdAt: string;
  sales: LocalPosSale[];
}

export function buildLocalBackup(sales: LocalPosSale[], now = new Date()): LocalBackup {
  return { format: FORMAT, version: 1, createdAt: now.toISOString(), sales };
}

// Rejette tout fichier qui n'est pas une sauvegarde Digifeel valide avant d'y toucher.
export function parseLocalBackup(raw: string): LocalPosSale[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Ce fichier n’est pas une sauvegarde Digifeel.');
  }
  const backup = data as Partial<LocalBackup> | null;
  if (!backup || backup.format !== FORMAT || backup.version !== 1 || !Array.isArray(backup.sales)) {
    throw new Error('Ce fichier n’est pas une sauvegarde Digifeel.');
  }
  for (const sale of backup.sales) {
    if (!sale || typeof sale.id !== 'string' || !SALE_ID.test(sale.id) || !Array.isArray(sale.items) || sale.items.length < 1) {
      throw new Error('La sauvegarde est endommagée : une vente est invalide.');
    }
  }
  return backup.sales;
}
