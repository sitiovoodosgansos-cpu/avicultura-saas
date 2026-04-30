import { prisma } from "@/lib/db/prisma";

export type MortalityCount = {
  total: number;
  fromBirds: number;
  fromVitrineLots: number;
};

/**
 * Mortalidade unificada do tenant em um período.
 *
 * Conta:
 * - Aves do Plantel com status DEAD (cobre mortes diretas no Plantel + mortes
 *   na enfermaria + Vitrine 1:1 a partir do Plantel — todos esses casos
 *   atualizam Bird.status). Período usa o `updatedAt` da Bird como proxy.
 * - VitrineDeathRecords cujos listings NÃO têm sourceBirdId (lotes da
 *   chocadeira ou criação manual sem ave individual). Se o lote tem
 *   sourceBirdId, a ave já é contada no item acima — evita dupla contagem.
 */
export async function getMortalityCount(
  tenantId: string,
  range?: { from?: Date; to?: Date }
): Promise<MortalityCount> {
  const dateFilter =
    range?.from || range?.to
      ? {
          ...(range?.from ? { gte: range.from } : {}),
          ...(range?.to ? { lte: range.to } : {})
        }
      : undefined;

  const [birdDeaths, vitrineDeaths] = await Promise.all([
    prisma.bird.count({
      where: {
        tenantId,
        status: "DEAD",
        ...(dateFilter ? { updatedAt: dateFilter } : {})
      }
    }),
    prisma.vitrineDeathRecord.aggregate({
      where: {
        tenantId,
        ...(dateFilter ? { occurredAt: dateFilter } : {}),
        listing: { sourceBirdId: null }
      },
      _sum: { quantity: true }
    })
  ]);

  const fromVitrineLots = vitrineDeaths._sum.quantity ?? 0;
  return {
    total: birdDeaths + fromVitrineLots,
    fromBirds: birdDeaths,
    fromVitrineLots
  };
}
