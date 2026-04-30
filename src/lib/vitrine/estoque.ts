import { prisma } from "@/lib/db/prisma";
import { getCurrentPrice } from "@/lib/vitrine/pricing";

export type EstoqueGroup = {
  flockGroupId: string;
  title: string;
  species: string;
  breed: string | null;
  variety: string | null;
  quantity: number;
  value: number;
  listings: number;
  hasMissingTier: boolean;
};

export type EstoqueResumo = {
  totalAnimals: number;
  totalValue: number;
  groups: EstoqueGroup[];
};

export async function getEstoqueResumo(tenantId: string): Promise<EstoqueResumo> {
  const [listings, tiers] = await Promise.all([
    prisma.vitrineListing.findMany({
      where: { tenantId, status: "AVAILABLE" },
      include: {
        flockGroup: {
          select: {
            id: true,
            title: true,
            species: { select: { name: true } },
            breed: { select: { name: true } },
            variety: { select: { name: true } }
          }
        }
      }
    }),
    prisma.priceTier.findMany({ where: { tenantId } })
  ]);

  const map = new Map<string, EstoqueGroup>();
  let totalAnimals = 0;
  let totalValue = 0;

  for (const listing of listings) {
    const result = getCurrentPrice(
      listing.flockGroupId,
      listing.birthDate,
      tiers,
      listing.priceOverride !== null && listing.priceOverride !== undefined
        ? Number(listing.priceOverride)
        : null
    );

    const lineValue = result.price !== null ? result.price * listing.availableQuantity : 0;
    totalAnimals += listing.availableQuantity;
    totalValue += lineValue;

    const existing = map.get(listing.flockGroupId);
    if (existing) {
      existing.quantity += listing.availableQuantity;
      existing.value += lineValue;
      existing.listings += 1;
      if (result.missingTier) existing.hasMissingTier = true;
    } else {
      map.set(listing.flockGroupId, {
        flockGroupId: listing.flockGroupId,
        title: listing.flockGroup.title,
        species: listing.flockGroup.species.name,
        breed: listing.flockGroup.breed?.name ?? null,
        variety: listing.flockGroup.variety?.name ?? null,
        quantity: listing.availableQuantity,
        value: lineValue,
        listings: 1,
        hasMissingTier: result.missingTier
      });
    }
  }

  const groups = [...map.values()].sort((a, b) => b.value - a.value);

  return {
    totalAnimals,
    totalValue,
    groups
  };
}
