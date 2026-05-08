import { prisma } from "@/lib/db/prisma";

// Lista todos os obitos no periodo (Plantel + Vitrine lotes) e, pra cada
// ave do plantel, anexa o historico completo: mudancas de status, todos os
// casos clinicos (com timeline + diagnostico + medicacao + obs) e as
// vacinas aplicadas. Pra lotes da Vitrine (sem sourceBird) so retorna o
// registro do obito agregado, sem ave individual.
export async function listDeathsWithHistory(
  tenantId: string,
  range?: { from?: Date; to?: Date }
) {
  const dateFilter =
    range?.from || range?.to
      ? {
          ...(range?.from ? { gte: range.from } : {}),
          ...(range?.to ? { lte: range.to } : {})
        }
      : undefined;

  const [birdDeaths, vitrineDeaths] = await Promise.all([
    prisma.bird.findMany({
      where: {
        tenantId,
        status: "DEAD",
        ...(dateFilter ? { updatedAt: dateFilter } : {})
      },
      select: {
        id: true,
        ringNumber: true,
        nickname: true,
        sex: true,
        acquisitionDate: true,
        purchaseValue: true,
        origin: true,
        updatedAt: true,
        flockGroup: { select: { id: true, title: true } },
        statusHistory: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            reason: true,
            createdAt: true
          }
        },
        infirmaryCases: {
          orderBy: { openedAt: "asc" },
          select: {
            id: true,
            openedAt: true,
            closedAt: true,
            status: true,
            diagnosis: true,
            symptoms: true,
            medication: true,
            dosage: true,
            responsible: true,
            notes: true,
            infirmary: { select: { id: true, name: true } },
            events: {
              orderBy: { createdAt: "asc" },
              select: { id: true, type: true, notes: true, createdAt: true }
            }
          }
        },
        vaccinations: {
          orderBy: { appliedAt: "asc" },
          select: {
            id: true,
            appliedAt: true,
            notes: true,
            vaccine: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.vitrineDeathRecord.findMany({
      where: {
        tenantId,
        ...(dateFilter ? { occurredAt: dateFilter } : {}),
        listing: { sourceBirdId: null }
      },
      orderBy: { occurredAt: "desc" },
      select: {
        id: true,
        quantity: true,
        cause: true,
        occurredAt: true,
        listing: {
          select: {
            id: true,
            title: true,
            flockGroup: { select: { id: true, title: true } }
          }
        }
      }
    })
  ]);

  const totalDeaths =
    birdDeaths.length + vitrineDeaths.reduce((s, d) => s + (d.quantity ?? 0), 0);

  return {
    total: totalDeaths,
    birdDeaths: birdDeaths.map((b) => ({
      ...b,
      // Decimal -> number pra JSON
      purchaseValue: b.purchaseValue ? Number(b.purchaseValue.toString()) : null
    })),
    vitrineDeaths
  };
}

export type DeathsResponse = Awaited<ReturnType<typeof listDeathsWithHistory>>;
