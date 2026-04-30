import type { PriceTier } from "@prisma/client";

export function calculateAgeInMonths(birthDate: Date, now: Date = new Date()): number {
  if (Number.isNaN(birthDate.getTime())) return 0;
  let months = (now.getFullYear() - birthDate.getFullYear()) * 12;
  months += now.getMonth() - birthDate.getMonth();
  if (now.getDate() < birthDate.getDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * Returns the birth date that corresponds to a given age in months from `now`.
 * Used to convert UX input ("the chick is 2 months old") into a stable timestamp.
 *
 * Clamps the day to the last valid day of the target month so subtracting from
 * e.g. April 30 by 2 months gives Feb 28, not March 2 (the JS default rolls
 * overflow into the next month, which would then read back as 1 month old).
 */
export function birthDateFromAgeInMonths(ageInMonths: number, now: Date = new Date()): Date {
  const safe = Math.max(0, Math.floor(ageInMonths));
  const result = new Date(now);
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() - safe);
  const daysInTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, daysInTargetMonth));
  return result;
}

export type CurrentPriceResult = {
  price: number | null;
  ageInMonths: number;
  matchedTier: PriceTier | null;
  missingTier: boolean;
  isOverride: boolean;
};

/**
 * Picks the highest-aged tier whose ageInMonths is <= the listing's current age.
 * Falls back to the lowest tier if the chick is younger than the youngest tier.
 * If `priceOverride` is provided, it always wins.
 */
export function getCurrentPrice(
  flockGroupId: string,
  birthDate: Date,
  tiers: PriceTier[],
  priceOverride: number | null,
  now: Date = new Date()
): CurrentPriceResult {
  const ageInMonths = calculateAgeInMonths(birthDate, now);

  if (priceOverride !== null && priceOverride !== undefined) {
    return {
      price: Number(priceOverride),
      ageInMonths,
      matchedTier: null,
      missingTier: false,
      isOverride: true
    };
  }

  const matchingTiers = tiers
    .filter((tier) => tier.flockGroupId === flockGroupId)
    .sort((a, b) => a.ageInMonths - b.ageInMonths);

  if (matchingTiers.length === 0) {
    return { price: null, ageInMonths, matchedTier: null, missingTier: true, isOverride: false };
  }

  const eligible = matchingTiers.filter((tier) => tier.ageInMonths <= ageInMonths);
  const matchedTier = eligible.length > 0 ? eligible[eligible.length - 1] : matchingTiers[0];

  return {
    price: Number(matchedTier.price),
    ageInMonths,
    matchedTier,
    missingTier: false,
    isOverride: false
  };
}
