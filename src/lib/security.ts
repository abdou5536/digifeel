import { createHmac } from 'node:crypto';
import type { NextRequest } from 'next/server';

/**
 * Derrière Cloudflare, `cf-connecting-ip` est posé par Cloudflare et non falsifiable.
 * `x-forwarded-for` est contrôlé par le client : ignoré, sauf TRUST_FORWARDED_FOR=1 (développement local).
 */
export function clientIp(request: NextRequest): string {
  const cf = request.headers.get('cf-connecting-ip');
  if (cf) return cf;
  if (process.env.TRUST_FORWARDED_FOR === '1') {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-ip';
  }
  return 'unknown-ip';
}

export function hashRequestDevice(request: NextRequest, deviceId: unknown) {
  const pepper = process.env.RATE_LIMIT_PEPPER;
  if (!pepper || pepper.length < 32) {
    throw new Error('RATE_LIMIT_PEPPER doit contenir au moins 32 caractères.');
  }

  const candidate = typeof deviceId === 'string' && /^[a-f0-9-]{16,80}$/i.test(deviceId)
    ? deviceId.toLowerCase()
    : 'no-device-id';
  const ip = clientIp(request);
  const agent = (request.headers.get('user-agent') || 'unknown-agent').slice(0, 300);

  return createHmac('sha256', pepper).update(`${ip}|${agent}|${candidate}`).digest('hex');
}

// La règle vit dans googleUrl.ts pour être partagée avec les formulaires côté navigateur.
export { isValidGoogleReviewUrl } from './googleUrl';

const rateBuckets = new Map<string, number[]>();

/**
 * Limiteur de débit en mémoire (fenêtre glissante). Il protège un appel coûteux contre les rafales
 * sur une même instance ; pour une limite globale, utiliser un stockage partagé.
 */
export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (rateBuckets.get(key) ?? []).filter(time => now - time < windowMs);
  if (hits.length >= max) {
    rateBuckets.set(key, hits);
    return true;
  }
  hits.push(now);
  rateBuckets.set(key, hits);
  // Évite une croissance sans fin de la table.
  if (rateBuckets.size > 5000) {
    for (const [bucketKey, times] of rateBuckets) if (times.every(time => now - time >= windowMs)) rateBuckets.delete(bucketKey);
  }
  return false;
}

export async function parseJsonObject(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}
