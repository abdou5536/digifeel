import { RestaurantConfig, TableItem } from '../types';

type QrTargetInput = Pick<RestaurantConfig, 'id' | 'name' | 'slug' | 'googleReviewUrl'>;

const readApiError = async (response: Response): Promise<string> => {
  const result = await response.json().catch(() => null) as { error?: string } | null;
  return result?.error || `La création du lien de scan a échoué (${response.status}).`;
};

const createScanTarget = async (
  restaurant: QrTargetInput,
  kind: 'nfc' | 'qr',
  uid: string,
  label: string,
  targetType: 'table' | 'server',
  targetId: string
): Promise<string> => {
  const response = await fetch('/api/admin/scan-targets', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantSlug: restaurant.slug,
      googleReviewUrl: restaurant.googleReviewUrl,
      kind,
      uid,
      label,
      targetType,
      targetId
    })
  });
  if (!response.ok) throw new Error(await readApiError(response));
  const result = await response.json() as { target: { public_id: string } };
  return `${window.location.origin}/r/${result.target.public_id}`;
};

export const ensureQrScanLink = async (
  restaurant: QrTargetInput,
  targetType: 'table' | 'server',
  targetId: string,
  label: string
): Promise<string> => {
  return createScanTarget(restaurant, 'qr', '', label, targetType, targetId);
};

export const createNfcScanLink = async (
  restaurant: QrTargetInput,
  uid: string,
  label: string,
  targetType: 'table' | 'server',
  targetId: string
): Promise<string> => {
  return createScanTarget(restaurant, 'nfc', uid, label, targetType, targetId);
};

export const updateNfcScanTarget = async (
  publicId: string,
  updates: { label: string; targetType: 'table' | 'server'; targetId: string }
): Promise<void> => {
  const response = await fetch(`/api/admin/scan-targets/${encodeURIComponent(publicId)}`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error(await readApiError(response));
};

export const ensureQrScanLinksForTables = async (
  restaurant: QrTargetInput,
  tables: TableItem[],
  tableNumbers: number[]
): Promise<Record<number, string>> => {
  const selectedTables = tables.filter(table => tableNumbers.includes(table.number));
  const links = await Promise.all(selectedTables.map(async table => [
    table.number,
    await ensureQrScanLink(restaurant, 'table', String(table.number), `Table ${table.number}`)
  ] as const));
  return Object.fromEntries(links);
};
