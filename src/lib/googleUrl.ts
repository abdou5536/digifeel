/**
 * Validation du lien d'avis Google, sans dépendance Node : utilisable côté navigateur
 * (formulaires) comme côté serveur (routes API), pour que les deux appliquent la même règle.
 */
const EXACT_HOSTS = ['google.com', 'g.page', 'www.g.page', 'maps.app.goo.gl'];

export function isValidGoogleReviewUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (EXACT_HOSTS.includes(url.hostname) || url.hostname.endsWith('.google.com'));
  } catch {
    return false;
  }
}

export const GOOGLE_URL_ERROR = 'Collez un lien Google sécurisé (https://g.page/…, https://maps.app.goo.gl/… ou google.com).';
