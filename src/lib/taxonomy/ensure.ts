import { prisma } from "@/lib/db/prisma";

export async function ensureTaxonomy(
  tenantId: string,
  speciesName: string,
  breedName?: string,
  varietyName?: string
) {
  let species = await prisma.species.findFirst({
    where: { tenantId, name: speciesName },
    select: { id: true }
  });

  if (!species) {
    species = await prisma.species.create({
      data: { tenantId, name: speciesName },
      select: { id: true }
    });
  }

  let breedId: string | null = null;
  const cleanedBreed = breedName?.trim();

  if (cleanedBreed) {
    let breed = await prisma.breed.findFirst({
      where: { tenantId, speciesId: species.id, name: cleanedBreed },
      select: { id: true }
    });

    if (!breed) {
      breed = await prisma.breed.create({
        data: { tenantId, speciesId: species.id, name: cleanedBreed },
        select: { id: true }
      });
    }

    breedId = breed.id;
  }

  let varietyId: string | null = null;
  const cleanedVariety = varietyName?.trim();

  if (cleanedVariety && breedId) {
    let variety = await prisma.variety.findFirst({
      where: { tenantId, breedId, name: cleanedVariety },
      select: { id: true }
    });

    if (!variety) {
      variety = await prisma.variety.create({
        data: { tenantId, breedId, name: cleanedVariety },
        select: { id: true }
      });
    }

    varietyId = variety.id;
  }

  return {
    speciesId: species.id,
    breedId,
    varietyId
  };
}
