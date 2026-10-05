import { describe, expect, it } from 'vitest';
import { getNextTier, getTierProgress, getUnlockedTier } from '@/src/utils/tierUtils';
import type { StarTier } from '@/src/types';

const tiers = [{ stars: 4.5, reward: 'c' }, { stars: 3, reward: 'a' }, { stars: 4, reward: 'b' }] as unknown as StarTier[];

describe('paliers de prime liés aux étoiles', () => {
  it('limites exactes : le palier est atteint à la valeur seuil', () => {
    expect(getUnlockedTier(3, tiers)?.stars).toBe(3);
    expect(getUnlockedTier(2.99, tiers)).toBeNull();
    expect(getUnlockedTier(4, tiers)?.stars).toBe(4);
    expect(getUnlockedTier(4.49, tiers)?.stars).toBe(4);
    expect(getUnlockedTier(5, tiers)?.stars).toBe(4.5);
  });
  it('prochain palier et progression', () => {
    expect(getNextTier(3.2, tiers)?.stars).toBe(4);
    expect(getNextTier(4.5, tiers)).toBeNull();
    expect(getTierProgress(5, null, null)).toBe(100);
    expect(getTierProgress(3.5, tiers[1], tiers[2])).toBe(50);
    expect(getTierProgress(2, tiers[1], tiers[2])).toBe(0);
  });
  it('sans palier configuré', () => {
    expect(getUnlockedTier(5, [])).toBeNull();
    expect(getNextTier(1, [])).toBeNull();
  });
  it('ne mute pas la liste fournie', () => {
    const copy = [...tiers];
    getUnlockedTier(4, tiers); getNextTier(1, tiers);
    expect(tiers).toEqual(copy);
  });
});