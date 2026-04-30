import { prisma } from "@/lib/db/prisma";
import type { PriceTierInput } from "@/lib/validators/vitrine";

export async function listPriceTiers(tenantId: string) {
  const [tiers, species, breeds, varieties] = await Promise.all([
    prisma.priceTier.findMany({
      where: { tenantId },
      include: {
        species: { select: { id: true, name: true } },
        breed: { select: { id: true, name: true } },
        variety: { select: { id: true, name: true } }
      },
      orderBy: [{ speciesId: "asc" }, { breedId: "asc" }, { varietyId: "asc" }, { ageInMonths: "asc" }]
    }),
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
  ]);

  return {
    tiers,
    taxonomy: { species, breeds, varieties }
  };
}

export async function upsertPriceTier(tenantId: string, input: PriceTierInput) {
  const speciesOk = await prisma.species.findFirst({
    where: { id: input.speciesId, tenantId },
    select: { id: true }
  });
  if (!speciesOk) throw new Error("Espécie não encontrada.");

  if (input.breedId) {
    const breedOk = await prisma.breed.findFirst({
      where: { id: input.breedId, tenantId, speciesId: input.speciesId },
      select: { id: true }
    });
    if (!breedOk) throw new Error("Raça não encontrada para a espécie.");
  }

  if (input.varietyId) {
    if (!input.breedId) throw new Error("Variedade exige uma raça.");
    const varietyOk = await prisma.variety.findFirst({
      where: { id: input.varietyId, tenantId, breedId: input.breedId },
      select: { id: true }
    });
    if (!varietyOk) throw new Error("Variedade não encontrada para a raça.");
  }

  const existing = await prisma.priceTier.findFirst({
    where: {
      tenantId,
      speciesId: input.speciesId,
      breedId: input.breedId ?? null,
      varietyId: input.varietyId ?? null,
      ageInMonths: input.ageInMonths
    },
    select: { id: true }
  });

  if (existing) {
    return prisma.priceTier.update({
      where: { id: existing.id },
      data: { price: input.price }
    });
  }

  return prisma.priceTier.create({
    data: {
      tenantId,
      speciesId: input.speciesId,
      breedId: input.breedId ?? null,
      varietyId: input.varietyId ?? null,
      ageInMonths: input.ageInMonths,
      price: input.price
    }
  });
}

export async function deletePriceTier(tenantId: string, id: string) {
  const existing = await prisma.priceTier.findFirst({
    where: { id, tenantId },
    select: { id: true }
  });
  if (!existing) return false;

  await prisma.priceTier.delete({ where: { id } });
  return true;
}
