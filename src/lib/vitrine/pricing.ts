import type { PriceTier } from "@prisma/client";

export function calculateAgeInMonths(birthDate: Date, now: Date = new Date()): number {
  if (Number.isNaN(birthDate.getTime())) return 0;
  let months = (now.getFullYear() - birthDate.getFullYear()) * 12;
  months += now.getMonth() - birthDate.getMonth();
  if (now.getDate() < birthDate.getDate()) months -= 1;
  return Math.max(0, months);
}

export type CurrentPriceResult = {
  price: number | null;
  ageInMonths: number;
  matchedTier: PriceTier | null;
  missingTier: boolean;
};

type PriceTierKey = {
  speciesId: string;
  breedId: string | null;
  varietyId: string | null;
};

function tierMatchesKey(tier: PriceTier, key: PriceTierKey): boolean {
  if (tier.speciesId !== key.speciesId) return false;
  if ((tier.breedId ?? null) !== (key.breedId ?? null)) return false;
  if ((tier.varietyId ?? null) !== (key.varietyId ?? null)) return false;
  return true;
}

/**
 * Picks the highest-aged tier whose ageInMonths is <= the listing's current age.
 * Returns the price as a number (or null when no tier matches).
 */
export function getCurrentPrice(
  listingKey: PriceTierKey,
  birthDate: Date,
  tiers: PriceTier[],
  now: Date = new Date()
): CurrentPriceResult {
  const ageInMonths = calculateAgeInMonths(birthDate, now);

  const matchingTiers = tiers
    .filter((tier) => tierMatchesKey(tier, listingKey))
    .sort((a, b) => a.ageInMonths - b.ageInMonths);

  if (matchingTiers.length === 0) {
    return { price: null, ageInMonths, matchedTier: null, missingTier: true };
  }

  const eligible = matchingTiers.filter((tier) => tier.ageInMonths <= ageInMonths);
  const matchedTier = eligible.length > 0 ? eligible[eligible.length - 1] : matchingTiers[0];

  return {
    price: Number(matchedTier.price),
    ageInMonths,
    matchedTier,
    missingTier: false
  };
}
