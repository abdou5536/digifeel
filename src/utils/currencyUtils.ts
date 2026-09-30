export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  rateVsEur: number; // 1 EUR = X Local Currency
  decimals: number;
  position: 'before' | 'after';
  region: string;
}

export const WORLD_CURRENCIES: Record<string, CurrencyInfo> = {
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    flag: '🇪🇺',
    rateVsEur: 1.0,
    decimals: 2,
    position: 'after',
    region: 'Europe'
  },
  DZD: {
    code: 'DZD',
    name: 'Dinar Algérien (Square Port-Saïd / Parallel)',
    symbol: 'DA',
    flag: '🇩🇿',
    rateVsEur: 277.0,
    decimals: 0,
    position: 'after',
    region: 'Maghreb'
  },
  TND: {
    code: 'TND',
    name: 'Dinar Tunisien (Marché Parallèle)',
    symbol: 'DT',
    flag: '🇹🇳',
    rateVsEur: 3.55,
    decimals: 2,
    position: 'after',
    region: 'Maghreb'
  },
  MAD: {
    code: 'MAD',
    name: 'Dirham Marocain (Marché Réel)',
    symbol: 'DH',
    flag: '🇲🇦',
    rateVsEur: 11.20,
    decimals: 2,
    position: 'after',
    region: 'Maghreb'
  },
  USD: {
    code: 'USD',
    name: 'Dollar Américain',
    symbol: '$',
    flag: '🇺🇸',
    rateVsEur: 1.08,
    decimals: 2,
    position: 'before',
    region: 'Amérique'
  },
  GBP: {
    code: 'GBP',
    name: 'Livre Sterling',
    symbol: '£',
    flag: '🇬🇧',
    rateVsEur: 0.85,
    decimals: 2,
    position: 'before',
    region: 'Europe'
  },
  CHF: {
    code: 'CHF',
    name: 'Franc Suisse',
    symbol: 'CHF',
    flag: '🇨🇭',
    rateVsEur: 0.96,
    decimals: 2,
    position: 'after',
    region: 'Europe'
  },
  AED: {
    code: 'AED',
    name: 'Dirham des Émirats',
    symbol: 'AED',
    flag: '🇦🇪',
    rateVsEur: 3.97,
    decimals: 2,
    position: 'after',
    region: 'Moyen-Orient'
  },
  SAR: {
    code: 'SAR',
    name: 'Riyal Saoudien',
    symbol: 'SAR',
    flag: '🇸🇦',
    rateVsEur: 4.05,
    decimals: 2,
    position: 'after',
    region: 'Moyen-Orient'
  },
  EGP: {
    code: 'EGP',
    name: 'Livre Égyptienne (Marché Parallèle)',
    symbol: 'EGP',
    flag: '🇪🇬',
    rateVsEur: 55.0,
    decimals: 2,
    position: 'after',
    region: 'Afrique'
  },
  CAD: {
    code: 'CAD',
    name: 'Dollar Canadien',
    symbol: 'CA$',
    flag: '🇨🇦',
    rateVsEur: 1.48,
    decimals: 2,
    position: 'before',
    region: 'Amérique'
  },
  TRY: {
    code: 'TRY',
    name: 'Livre Turque (Marché Parallèle)',
    symbol: '₺',
    flag: '🇹🇷',
    rateVsEur: 38.5,
    decimals: 2,
    position: 'after',
    region: 'Europe / Asie'
  },
  XOF: {
    code: 'XOF',
    name: 'Franc CFA (UEMOA)',
    symbol: 'FCFA',
    flag: '🌍',
    rateVsEur: 655.96,
    decimals: 0,
    position: 'after',
    region: 'Afrique'
  },
  JPY: {
    code: 'JPY',
    name: 'Yen Japonais',
    symbol: '¥',
    flag: '🇯🇵',
    rateVsEur: 162.5,
    decimals: 0,
    position: 'before',
    region: 'Asie'
  }
};

export const DEFAULT_CURRENCY = WORLD_CURRENCIES.EUR;

export function getCurrencyInfo(code?: string): CurrencyInfo {
  if (!code) return WORLD_CURRENCIES.EUR;
  const upper = code.toUpperCase();
  return WORLD_CURRENCIES[upper] || WORLD_CURRENCIES.EUR;
}

/**
 * Convert amount from one currency code to another
 */
export function convertCurrency(
  amount: number,
  fromCode: string = 'EUR',
  toCode: string = 'EUR'
): number {
  if (fromCode === toCode) return amount;
  const fromInfo = getCurrencyInfo(fromCode);
  const toInfo = getCurrencyInfo(toCode);

  // Convert to EUR baseline then to target
  const amountInEur = amount / fromInfo.rateVsEur;
  const converted = amountInEur * toInfo.rateVsEur;

  return Number(converted.toFixed(toInfo.decimals));
}

/**
 * Format currency nicely with symbol, flag and optional dual-currency conversion tag
 */
export function formatCurrency(
  amountInEur: number,
  targetCurrencyCode: string = 'EUR',
  options?: {
    showDualEquivalent?: boolean;
    compact?: boolean;
  }
): string {
  const curr = getCurrencyInfo(targetCurrencyCode);
  const convertedAmount = amountInEur * curr.rateVsEur;

  const numFormatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: curr.decimals,
    maximumFractionDigits: curr.decimals
  }).format(convertedAmount);

  const mainFormat =
    curr.position === 'before'
      ? `${curr.symbol} ${numFormatted}`
      : `${numFormatted} ${curr.symbol}`;

  if (options?.showDualEquivalent && targetCurrencyCode !== 'EUR' && amountInEur > 0) {
    const eurFormatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amountInEur);
    return `${mainFormat} (≈ ${eurFormatted} €)`;
  }

  return mainFormat;
}

/**
 * Get preset tip amounts and bill suggestions tailored to local currency
 */
export function getCurrencyPresetAmounts(currencyCode: string = 'EUR'): {
  presetTips: { percent: number; label: string; amountInEur: number }[];
  defaultBillInEur: number;
} {
  const curr = getCurrencyInfo(currencyCode);

  if (curr.code === 'DZD') {
    // Algerian Dinar: DA 200, DA 500, DA 1000
    return {
      presetTips: [
        { percent: 5, label: '200 DA', amountInEur: 200 / curr.rateVsEur },
        { percent: 10, label: '500 DA', amountInEur: 500 / curr.rateVsEur },
        { percent: 15, label: '1 000 DA', amountInEur: 1000 / curr.rateVsEur }
      ],
      defaultBillInEur: 4500 / curr.rateVsEur // ~4500 DA
    };
  }

  if (curr.code === 'TND') {
    // Tunisian Dinar: 3 DT, 5 DT, 10 DT
    return {
      presetTips: [
        { percent: 5, label: '3 DT', amountInEur: 3 / curr.rateVsEur },
        { percent: 10, label: '5 DT', amountInEur: 5 / curr.rateVsEur },
        { percent: 15, label: '10 DT', amountInEur: 10 / curr.rateVsEur }
      ],
      defaultBillInEur: 50 / curr.rateVsEur // ~50 DT
    };
  }

  if (curr.code === 'MAD') {
    // Moroccan Dirham: 10 DH, 20 DH, 50 DH
    return {
      presetTips: [
        { percent: 5, label: '10 DH', amountInEur: 10 / curr.rateVsEur },
        { percent: 10, label: '20 DH', amountInEur: 20 / curr.rateVsEur },
        { percent: 15, label: '50 DH', amountInEur: 50 / curr.rateVsEur }
      ],
      defaultBillInEur: 300 / curr.rateVsEur // ~300 DH
    };
  }

  if (curr.code === 'USD' || curr.code === 'CAD') {
    return {
      presetTips: [
        { percent: 10, label: '$3.50', amountInEur: 3.5 / curr.rateVsEur },
        { percent: 15, label: '$5.00', amountInEur: 5 / curr.rateVsEur },
        { percent: 20, label: '$10.00', amountInEur: 10 / curr.rateVsEur }
      ],
      defaultBillInEur: 50 / curr.rateVsEur
    };
  }

  // Default EUR presets
  return {
    presetTips: [
      { percent: 5, label: '2.25 €', amountInEur: 2.25 },
      { percent: 10, label: '4.50 €', amountInEur: 4.5 },
      { percent: 15, label: '6.75 €', amountInEur: 6.75 }
    ],
    defaultBillInEur: 45
  };
}

// Live API Exchange Rates Integration (DZD, TND, EUR, USD, etc.)
let lastApiFetchTime: string | null = null;
let isApiRatesActive = false;

// Load cached FX rates from localStorage on startup if available
if (typeof localStorage !== 'undefined') {
  try {
    const saved = localStorage.getItem('nfcresto_live_fx_rates');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.rates) {
        Object.keys(WORLD_CURRENCIES).forEach(code => {
          if (parsed.rates[code]) {
            WORLD_CURRENCIES[code].rateVsEur = Number(parsed.rates[code]);
          }
        });
        lastApiFetchTime = parsed.timestamp || 'Caché';
        isApiRatesActive = true;
      }
    }
  } catch {
    // ignore
  }
}

export async function fetchLiveExchangeRates(): Promise<boolean> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/EUR');
    if (!res.ok) throw new Error('Primary FX API unavailable');
    const data = await res.json();
    if (data && data.rates) {
      Object.keys(WORLD_CURRENCIES).forEach(code => {
        if (data.rates[code]) {
          WORLD_CURRENCIES[code].rateVsEur = Number(data.rates[code]);
        }
      });
      // Override DZD with parallel market rate (Square Port-Saïd: 277 DA / 1 EUR)
      WORLD_CURRENCIES.DZD.rateVsEur = 277.0;
      lastApiFetchTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      isApiRatesActive = true;
      try {
        localStorage.setItem('nfcresto_live_fx_rates', JSON.stringify({
          rates: data.rates,
          timestamp: lastApiFetchTime
        }));
      } catch {
        // ignore
      }
      return true;
    }
  } catch {
    // Try fallback endpoint
    try {
      const fallbackRes = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (fallbackData && fallbackData.rates) {
          Object.keys(WORLD_CURRENCIES).forEach(code => {
            if (fallbackData.rates[code]) {
              WORLD_CURRENCIES[code].rateVsEur = Number(fallbackData.rates[code]);
            }
          });
          WORLD_CURRENCIES.DZD.rateVsEur = 277.0;
          lastApiFetchTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          isApiRatesActive = true;
          return true;
        }
      }
    } catch {
      // ignore
    }
  }
  return false;
}

export function getLiveRatesStatus() {
  return {
    isActive: isApiRatesActive,
    lastUpdated: lastApiFetchTime || 'Direct (Base)'
  };
}

