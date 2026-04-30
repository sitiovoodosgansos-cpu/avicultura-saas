import { prisma } from "@/lib/db/prisma";
import { birthDateFromAgeInMonths, getCurrentPrice } from "@/lib/vitrine/pricing";
import type { ListingCreateInput, ListingUpdateInput } from "@/lib/validators/vitrine";

export async function listVitrine(tenantId: string) {
  const [listings, tiers, flockGroups] = await Promise.all([
    prisma.vitrineListing.findMany({
      where: { tenantId, status: { not: "REMOVED" } },
      include: {
        flockGroup: {
          select: {
            id: true,
            title: true,
            species: { select: { id: true, name: true } },
            breed: { select: { id: true, name: true } },
            variety: { select: { id: true, name: true } }
          }
        },
        photos: { orderBy: { order: "asc" } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.priceTier.findMany({ where: { tenantId } }),
    prisma.flockGroup.findMany({
      where: { tenantId },
      select: {
        id: true,
        title: true,
        species: { select: { id: true, name: true } },
        breed: { select: { id: true, name: true } },
        variety: { select: { id: true, name: true } }
      },
      orderBy: { title: "asc" }
    })
  ]);

  const enriched = listings.map((listing) => {
    const result = getCurrentPrice(
      listing.flockGroupId,
      listing.birthDate,
      tiers,
      listing.priceOverride !== null && listing.priceOverride !== undefined
        ? Number(listing.priceOverride)
        : null
    );

    return {
      ...listing,
      priceOverride:
        listing.priceOverride !== null && listing.priceOverride !== undefined
          ? Number(listing.priceOverride)
          : null,
      currentPrice: result.price,
      ageInMonths: result.ageInMonths,
      missingTier: result.missingTier,
      isOverride: result.isOverride
    };
  });

  return {
    listings: enriched,
    flockGroups
  };
}

async function ensureFlockGroup(tenantId: string, flockGroupId: string) {
  const group = await prisma.flockGroup.findFirst({
    where: { id: flockGroupId, tenantId },
    select: { id: true }
  });
  if (!group) throw new Error("Card não encontrado.");
  return group;
}

export async function createListing(tenantId: string, input: ListingCreateInput) {
  await ensureFlockGroup(tenantId, input.flockGroupId);

  const birthDate = birthDateFromAgeInMonths(input.ageInMonths);

  return prisma.vitrineListing.create({
    data: {
      tenantId,
      flockGroupId: input.flockGroupId,
      title: input.title?.trim() || null,
      birthDate,
      initialQuantity: input.initialQuantity,
      availableQuantity: input.initialQuantity,
      priceOverride:
        input.priceOverride !== null && input.priceOverride !== undefined
          ? input.priceOverride
          : null,
      description: input.description?.trim() || null
    }
  });
}

export async function updateListing(tenantId: string, id: string, input: ListingUpdateInput) {
  const existing = await prisma.vitrineListing.findFirst({
    where: { id, tenantId },
    select: { id: true, initialQuantity: true }
  });
  if (!existing) return null;

  const data: Record<string, unknown> = {};

  if (input.title !== undefined) {
    data.title = input.title?.trim() || null;
  }

  if (input.description !== undefined) {
    data.description = input.description?.trim() || null;
  }

  if (input.ageInMonths !== undefined) {
    data.birthDate = birthDateFromAgeInMonths(input.ageInMonths);
  }

  if (input.availableQuantity !== undefined) {
    if (input.availableQuantity > existing.initialQuantity) {
      throw new Error("Quantidade disponível não pode ser maior que a inicial.");
    }
    data.availableQuantity = input.availableQuantity;
    if (input.availableQuantity === 0 && !input.status) {
      data.status = "SOLD_OUT";
    }
  }

  if (input.priceOverride !== undefined) {
    data.priceOverride = input.priceOverride;
  }

  if (input.status !== undefined) {
    data.status = input.status;
  }

  return prisma.vitrineListing.update({
    where: { id },
    data
  });
}

export async function removeListing(tenantId: string, id: string) {
  const existing = await prisma.vitrineListing.findFirst({
    where: { id, tenantId },
    select: { id: true }
  });
  if (!existing) return false;

  await prisma.vitrineListing.update({
    where: { id },
    data: { status: "REMOVED" }
  });

  return true;
}
