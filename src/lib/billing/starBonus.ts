export interface StarTier {
  id: string;
  increase: number;
  amountCents: number;
}

export const STAR_TIERS: readonly StarTier[] = [
  { id: 'half-star', increase: 0.5, amountCents: 900 },
  { id: 'one-star', increase: 1, amountCents: 1100 },
  { id: 'three-stars', increase: 3, amountCents: 2899 }
];

export const STAR_MONTHLY_CAP_CENTS = 10_000;
const MIN_OBSERVATION_DAYS = 30;
const MONTH_END_FRESHNESS_DAYS = 7;
const DAY_MS = 86_400_000;

export interface StarBonusInput {
  period: string;
  now?: Date;
  baseline: { rating: number; establishedAt: string } | null;
  latest: { rating: number; observedAt: string } | null;
  billedTierIds: readonly string[];
  alreadyBilledThisPeriodCents?: number;
}

export interface StarBonusResult {
  eligible: boolean;
  reason: string;
  baselineRating: number | null;
  currentRating: number | null;
  increase: number;
  lines: { tierId: string; increase: number; amountCents: number }[];
  totalCents: number;
}

export function periodEnd(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error('Période invalide (AAAA-MM attendu).');
  const [year, month] = period.split('-').map(Number);
  return Date.UTC(year, month, 0, 23, 59, 59, 999);
}

export function computeStarBonus(input: StarBonusInput): StarBonusResult {
  const result: StarBonusResult = {
    eligible: false,
    reason: '',
    baselineRating: input.baseline?.rating ?? null,
    currentRating: input.latest?.rating ?? null,
    increase: 0,
    lines: [],
    totalCents: 0
  };
  const end = periodEnd(input.period);
  const currentMonth = (input.now ?? new Date()).toISOString().slice(0, 7);

  if (!input.baseline) { result.reason = 'Note de départ non définie.'; return result; }
  if (input.period >= currentMonth) { result.reason = 'La période doit être clôturée avant facturation.'; return result; }
  if (!input.latest) { result.reason = 'Aucune note relevée pendant cette période.'; return result; }
  if (end - Date.parse(input.latest.observedAt) > MONTH_END_FRESHNESS_DAYS * DAY_MS) {
    result.reason = 'La note doit être relevée dans les 7 derniers jours du mois.';
    return result;
  }
  if (end - Date.parse(input.baseline.establishedAt) < MIN_OBSERVATION_DAYS * DAY_MS) {
    result.reason = 'Période minimale d’observation (30 jours) non atteinte.';
    return result;
  }

  result.increase = Math.round((input.latest.rating - input.baseline.rating) * 10) / 10;
  if (result.increase <= 0) { result.reason = 'Aucune prime : la note n’a pas progressé.'; return result; }

  const billed = new Set(input.billedTierIds);
  const reached = STAR_TIERS.filter(tier => tier.increase <= result.increase && !billed.has(tier.id));
  const tier = reached.at(-1);
  const remaining = Math.max(0, STAR_MONTHLY_CAP_CENTS - (input.alreadyBilledThisPeriodCents ?? 0));
  if (!tier || tier.amountCents > remaining) {
    result.reason = 'Aucun nouveau palier facturable ou plafond mensuel atteint.';
    return result;
  }

  result.lines.push({ tierId: tier.id, increase: tier.increase, amountCents: tier.amountCents });
  result.totalCents = tier.amountCents;
  result.eligible = true;
  return result;
}
