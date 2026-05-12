import { prisma } from "@/lib/db/prisma";
import type { EggPriceBatchInput } from "@/lib/validators/eggs";

// Lista precos de ovo configurados pelo tenant + todos os FlockGroups que
// produzem ovos (atualmente: todos os grupos regulares — recria/chocada
// ficam ocultos no resto do app entao filtramos aqui tambem). O retorno
// junta os dois pra UI montar a tabela completa: cards com preco preenchido
// + cards "sem preço" pra usuario configurar.
export async function listEggPrices(tenantId: string) {
  const [prices, flockGroups] = await Promise.all([
    prisma.eggPrice.findMany({
      where: { tenantId },
      select: { id: true, flockGroupId: true, unitPrice: true, updatedAt: true }
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
        species: { select: { name: true } },
        breed: { select: { name: true } },
        variety: { select: { name: true } }
      },
      orderBy: { title: "asc" }
    })
  ]);

  // Map<flockGroupId, unitPrice> pra lookup rapido
  const priceByGroup = new Map<string, number>(
    prices.map((p) => [p.flockGroupId, Number(p.unitPrice)])
  );

  const rows = flockGroups.map((g) => ({
    flockGroupId: g.id,
    title: g.title,
    species: g.species.name,
    breed: g.breed.name,
    variety: g.variety?.name ?? null,
    unitPrice: priceByGroup.get(g.id) ?? null
  }));

  return { rows };
}

// Salva precos em batch. Se unitPrice for null/0, deleta o registro.
// Validacao: flockGroupId precisa pertencer ao tenant.
export async function saveEggPricesBatch(
  tenantId: string,
  input: EggPriceBatchInput
) {
  if (input.prices.length === 0) {
    return { saved: 0, deleted: 0 };
  }

  const groupIds = input.prices.map((p) => p.flockGroupId);
  const validGroups = await prisma.flockGroup.findMany({
    where: { tenantId, id: { in: groupIds } },
    select: { id: true }
  });
  const validIds = new Set(validGroups.map((g) => g.id));

  let saved = 0;
  let deleted = 0;

  await prisma.$transaction(async (tx) => {
    for (const entry of input.prices) {
      if (!validIds.has(entry.flockGroupId)) continue;

      const price = entry.unitPrice;
      if (price === null || price === 0) {
        const res = await tx.eggPrice.deleteMany({
          where: { tenantId, flockGroupId: entry.flockGroupId }
        });
        deleted += res.count;
      } else {
        await tx.eggPrice.upsert({
          where: { flockGroupId: entry.flockGroupId },
          update: { unitPrice: price },
          create: {
            tenantId,
            flockGroupId: entry.flockGroupId,
            unitPrice: price
          }
        });
        saved += 1;
      }
    }
  });

  return { saved, deleted };
}

// Retorna mapa { flockGroupId → unitPrice } pro UI pre-preencher carrinho
// de venda. Endpoint leve, sem dados extras.
export async function getEggPriceMap(tenantId: string): Promise<Map<string, number>> {
  const prices = await prisma.eggPrice.findMany({
    where: { tenantId },
    select: { flockGroupId: true, unitPrice: true }
  });
  return new Map(prices.map((p) => [p.flockGroupId, Number(p.unitPrice)]));
}
