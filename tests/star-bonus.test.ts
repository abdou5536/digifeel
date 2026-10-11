import { describe, expect, it } from 'vitest';
import { computeStarBonus } from '@/src/lib/billing/starBonus';

const base = {
  period: '2026-09',
  now: new Date('2026-10-05T10:00:00Z'),
  baseline: { rating: 3.8, establishedAt: '2026-06-01T00:00:00Z' },
  billedTierIds: [] as string[]
};
const latest = (rating: number, observedAt = '2026-09-29T12:00:00Z') => ({ rating, observedAt });

describe('paliers d’étoiles', () => {
  it('+0,5 facture 9 €', () => {
    const r = computeStarBonus({ ...base, latest: latest(4.3) });
    expect(r.totalCents).toBe(900);
  });
  it('+1 facture 11 € (palier le plus haut seulement)', () => {
    const r = computeStarBonus({ ...base, latest: latest(4.8) });
    expect(r.lines.map(l => l.tierId)).toEqual(['one-star']);
    expect(r.totalCents).toBe(1100);
  });
  it('+3 facture 28,99 €', () => {
    const r = computeStarBonus({ ...base, baseline: { rating: 1.5, establishedAt: '2026-06-01T00:00:00Z' }, latest: latest(4.5) });
    expect(r.totalCents).toBe(2899);
  });
  it('ne refacture jamais un palier déjà facturé', () => {
    const r = computeStarBonus({ ...base, latest: latest(4.3), billedTierIds: ['half-star'] });
    expect(r.eligible).toBe(false);
    expect(r.totalCents).toBe(0);
  });
  it('refuse sans progression, hors période close, note trop ancienne ou observation trop courte', () => {
    expect(computeStarBonus({ ...base, latest: latest(3.8) }).eligible).toBe(false);
    expect(computeStarBonus({ ...base, period: '2026-10', latest: latest(4.8, '2026-10-02T00:00:00Z') }).eligible).toBe(false);
    expect(computeStarBonus({ ...base, latest: latest(4.8, '2026-09-10T00:00:00Z') }).eligible).toBe(false);
    expect(computeStarBonus({ ...base, baseline: { rating: 3.8, establishedAt: '2026-09-10T00:00:00Z' }, latest: latest(4.8) }).eligible).toBe(false);
    expect(computeStarBonus({ ...base, baseline: null, latest: latest(4.8) }).eligible).toBe(false);
  });
  it('respecte le plafond mensuel', () => {
    const r = computeStarBonus({ ...base, latest: latest(4.8), alreadyBilledThisPeriodCents: 9500 });
    expect(r.eligible).toBe(false);
  });
});
