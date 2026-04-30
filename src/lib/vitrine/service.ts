import { prisma } from "@/lib/db/prisma";
import { ensureTaxonomy } from "@/lib/taxonomy/ensure";
import { getCurrentPrice } from "@/lib/vitrine/pricing";
import type { ListingCreateInput, ListingUpdateInput } from "@/lib/validators/vitrine";

export async function listVitrine(tenantId: string) {
  const [listings, tiers, taxonomy] = await Promise.all([
    prisma.vitrineListing.findMany({
      where: { tenantId, status: { not: "REMOVED" } },
      include: {
        species: { select: { id: true, name: true } },
        breed: { select: { id: true, name: true } },
        variety: { select: { id: true, name: true } },
        photos: { orderBy: { order: "asc" } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.priceTier.findMany({ where: { tenantId } }),
    Promise.all([
      prisma.species.findMany({
        where: { tenantId },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
      }),
      prisma.breed.findMany({
        where: { tenantId },
        select: { id: true, name: true, speciesId: true },
        orderBy: { name: "asc" }
      }),
      prisma.variety.findMany({
        where: { tenantId },
        select: { id: true, name: true, breedId: true },
        orderBy: { name: "asc" }
      })
    ])
  ]);

  const enriched = listings.map((listing) => {
    const result = getCurrentPrice(
      {
        speciesId: listing.speciesId,
        breedId: listing.breedId,
        varietyId: listing.varietyId
      },
      listing.birthDate,
      tiers
    );

    return {
      ...listing,
      currentPrice: result.price,
      ageInMonths: result.ageInMonths,
      missingTier: result.missingTier
    };
  });

  const [species, breeds, varieties] = taxonomy;

  return {
    listings: enriched,
    taxonomy: { species, breeds, varieties }
  };
}

export async function createListing(tenantId: string, input: ListingCreateInput) {
  const taxonomy = await ensureTaxonomy(
    tenantId,
    input.species,
    input.breed ?? undefined,
    input.variety ?? undefined
  );

  const birthDate = new Date(input.birthDate);
  if (Number.isNaN(birthDate.getTime())) {
    throw new Error("Data de nascimento inválida.");
  }

  return prisma.vitrineListing.create({
    data: {
      tenantId,
      title: input.title?.trim() || null,
      speciesId: taxonomy.speciesId,
      breedId: taxonomy.breedId,
      varietyId: taxonomy.varietyId,
      birthDate,
      initialQuantity: input.initialQuantity,
      availableQuantity: input.initialQuantity,
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

  if (input.birthDate !== undefined) {
    const date = new Date(input.birthDate);
    if (Number.isNaN(date.getTime())) {
      throw new Error("Data de nascimento inválida.");
    }
    data.birthDate = date;
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
