import { prisma } from "@/lib/db/prisma";
import type { PriceTierBatchInput } from "@/lib/validators/vitrine";

export async function listPriceTiers(tenantId: string) {
  const [tiers, flockGroups] = await Promise.all([
    prisma.priceTier.findMany({
      where: { tenantId },
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
      },
      orderBy: [{ flockGroupId: "asc" }, { ageInMonths: "asc" }]
    }),
    prisma.flockGroup.findMany({
      where: {
        tenantId,
        NOT: {
          OR: [
            { title: { startsWith: "Chocada " } },
            { title: { startsWith: "Recria " } }
          ]
        }
      },
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

  return { tiers, flockGroups };
}

export async function upsertPriceTiersBatch(tenantId: string, input: PriceTierBatchInput) {
  const group = await prisma.flockGroup.findFirst({
    where: { id: input.flockGroupId, tenantId },
    select: { id: true }
  });
  if (!group) throw new Error("Card não encontrado.");

  const seen = new Set<number>();
  for (const entry of input.tiers) {
    if (seen.has(entry.ageInMonths)) {
      throw new Error(`Idade ${entry.ageInMonths} duplicada.`);
    }
    seen.add(entry.ageInMonths);
  }

  return prisma.$transaction(async (tx) => {
    const saved = [] as Array<{ id: string }>;
    for (const entry of input.tiers) {
      const existing = await tx.priceTier.findFirst({
        where: {
          tenantId,
          flockGroupId: input.flockGroupId,
          ageInMonths: entry.ageInMonths
        },
        select: { id: true }
      });

      if (existing) {
        const updated = await tx.priceTier.update({
          where: { id: existing.id },
          data: { price: entry.price },
          select: { id: true }
        });
        saved.push(updated);
      } else {
        const created = await tx.priceTier.create({
          data: {
            tenantId,
            flockGroupId: input.flockGroupId,
            ageInMonths: entry.ageInMonths,
            price: entry.price
          },
          select: { id: true }
        });
        saved.push(created);
      }
    }
    return saved;
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
