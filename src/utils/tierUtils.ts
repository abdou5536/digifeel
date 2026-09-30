import { StarTier } from '../types';

export const getUnlockedTier = (rating: number, tiers: StarTier[]): StarTier | null => {
  // Sort tiers descending
  const sorted = [...tiers].sort((a, b) => b.stars - a.stars);
  for (const tier of sorted) {
    if (rating >= tier.stars) {
      return tier;
    }
  }
  return null;
};

export const getNextTier = (rating: number, tiers: StarTier[]): StarTier | null => {
  const sorted = [...tiers].sort((a, b) => a.stars - b.stars);
  for (const tier of sorted) {
    if (rating < tier.stars) {
      return tier;
    }
  }
  return null; // Already at top tier
};

export const getTierProgress = (rating: number, currentTier: StarTier | null, nextTier: StarTier | null): number => {
  if (!nextTier) return 100;
  const base = currentTier ? currentTier.stars : 0;
  const target = nextTier.stars;
  if (rating <= base) return 0;
  const progress = ((rating - base) / (target - base)) * 100;
  return Math.min(Math.max(Math.round(progress), 0), 100);
};
