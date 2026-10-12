export type PosCurrency = 'EUR' | 'DZD';

// Les colonnes *_dzd stockent des centimes pour EUR et des dinars entiers pour DZD.
export function minorFactor(currency: PosCurrency) {
  return currency === 'EUR' ? 100 : 1;
}

export function normalizeCurrency(value: unknown): PosCurrency {
  return value === 'EUR' ? 'EUR' : 'DZD';
}

export function formatMoney(minor: number, currency: PosCurrency, locale: string) {
  if (currency === 'EUR') {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-DZ' : 'fr-FR', { style: 'currency', currency: 'EUR' }).format(minor / 100);
  }
  return `${new Intl.NumberFormat(locale === 'ar' ? 'ar-DZ' : 'fr-DZ', { maximumFractionDigits: 0 }).format(minor)} دج`;
}

// Convertit une saisie utilisateur (12,50) en unité stockée (1250). Renvoie null si invalide.
export function parseMoneyInput(raw: string, currency: PosCurrency): number | null {
  const text = raw.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const minor = Math.round(Number(text) * minorFactor(currency));
  return Number.isSafeInteger(minor) ? minor : null;
}

export function minorToInput(minor: number, currency: PosCurrency) {
  const factor = minorFactor(currency);
  return factor === 1 ? String(minor) : (minor / factor).toFixed(2);
}
