import { prisma } from "@/lib/db/prisma";
import { calculateAgeInMonths, getCurrentPrice } from "@/lib/vitrine/pricing";

export type ExportRow = {
  raceTitle: string;
  ageInMonths: number;
  female: number;
  male: number;
  unknown: number;
  total: number;
  pricePerUnit: number | null;
};

export type ExportData = {
  tenant: {
    name: string;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    logoUrl: string | null;
  };
  rows: ExportRow[];
  totals: {
    aves: number;
    valor: number;
  };
  generatedAt: string;
};

/**
 * Agrupa o estoque DISPONIVEL da Vitrine por (raca + idade), com
 * contagem de sexo (femea/macho/indefinido) baseada nas Birds
 * vinculadas. Resultado eh ordenado por raca alfabetica + idade asc.
 *
 * Tres tipos de listing sao tratados:
 *  - Lote avulso (aggregatedListingId nas Birds)
 *  - 1:1 (sourceBirdId no listing -> Bird.vitrineListing)
 *  - Chocada (Birds em listing.flockGroupId, que e o sub-grupo da chocada)
 */
export async function loadVitrineExportData(tenantId: string): Promise<ExportData> {
  const [tenant, listings, tiers] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        email: true,
        phone: true,
        whatsapp: true,
        logoUrl: true
      }
    }),
    prisma.vitrineListing.findMany({
      where: { tenantId, status: "AVAILABLE", availableQuantity: { gt: 0 } },
      include: {
        flockGroup: { select: { id: true, title: true } },
        sourceIncubatorBatch: {
          select: { flockGroup: { select: { id: true, title: true } } }
        }
      }
    }),
    prisma.priceTier.findMany({ where: { tenantId } })
  ]);

  if (!tenant) {
    throw new Error("Tenant nao encontrado.");
  }

  if (listings.length === 0) {
    return {
      tenant,
      rows: [],
      totals: { aves: 0, valor: 0 },
      generatedAt: new Date().toISOString()
    };
  }

  const listingIds = listings.map((l) => l.id);

  // Birds.aggregatedListingId — pra Lote avulso
  // Bird.vitrineListing (relacao inversa) — pra 1:1
  // Birds em flockGroupId — pra chocada (filtra apenas listings de chocada)
  const chocadaFlockGroupIds = listings
    .filter((l) => l.sourceIncubatorBatchId)
    .map((l) => l.flockGroupId);

  const birds = await prisma.bird.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      OR: [
        { aggregatedListingId: { in: listingIds } },
        { vitrineListing: { id: { in: listingIds } } },
        ...(chocadaFlockGroupIds.length > 0
          ? [{ flockGroupId: { in: chocadaFlockGroupIds } } as const]
          : [])
      ]
    },
    select: {
      id: true,
      sex: true,
      aggregatedListingId: true,
      flockGroupId: true,
      vitrineListing: { select: { id: true } }
    }
  });

  // Mapa: listing.id -> contagem por sexo
  const sexByListing = new Map<
    string,
    { female: number; male: number; unknown: number }
  >();

  for (const bird of birds) {
    let listingId: string | null = null;
    if (bird.aggregatedListingId) {
      listingId = bird.aggregatedListingId;
    } else if (bird.vitrineListing) {
      listingId = bird.vitrineListing.id;
    } else {
      // Chocada: match por flockGroupId
      const matching = listings.find(
        (l) => l.sourceIncubatorBatchId && l.flockGroupId === bird.flockGroupId
      );
      if (matching) listingId = matching.id;
    }
    if (!listingId) continue;

    const current = sexByListing.get(listingId) ?? { female: 0, male: 0, unknown: 0 };
    if (bird.sex === "FEMALE") current.female += 1;
    else if (bird.sex === "MALE") current.male += 1;
    else current.unknown += 1;
    sexByListing.set(listingId, current);
  }

  // Agrupa por (raca pai + idade atual) — soma de listings + sex breakdown
  const rowsMap = new Map<string, ExportRow>();

  for (const listing of listings) {
    const parent = listing.sourceIncubatorBatch?.flockGroup ?? listing.flockGroup;
    const ageInMonths = calculateAgeInMonths(listing.birthDate);
    const priceResult = getCurrentPrice(
      parent.id,
      listing.birthDate,
      tiers,
      listing.priceOverride !== null && listing.priceOverride !== undefined
        ? Number(listing.priceOverride)
        : null
    );

    const sex = sexByListing.get(listing.id) ?? { female: 0, male: 0, unknown: 0 };
    // Defensivo: se a soma de sexos nao bate com availableQuantity (ex:
    // listing antigo sem rastreio de Birds), conta apenas o que conhecemos
    // OU usa availableQuantity como total final colocando o resto em
    // unknown.
    const sexSum = sex.female + sex.male + sex.unknown;
    let finalSex = sex;
    if (sexSum < listing.availableQuantity) {
      finalSex = { ...sex, unknown: sex.unknown + (listing.availableQuantity - sexSum) };
    }

    const key = `${parent.id}|${ageInMonths}`;
    const existing = rowsMap.get(key);
    if (existing) {
      existing.female += finalSex.female;
      existing.male += finalSex.male;
      existing.unknown += finalSex.unknown;
      existing.total += listing.availableQuantity;
      // Preserva o pricePerUnit do primeiro listing — se diferir entre
      // listings da mesma idade (raro), fica o mais antigo. Cobre 99% dos
      // casos onde a tabela e uniforme.
    } else {
      rowsMap.set(key, {
        raceTitle: parent.title,
        ageInMonths,
        female: finalSex.female,
        male: finalSex.male,
        unknown: finalSex.unknown,
        total: listing.availableQuantity,
        pricePerUnit: priceResult.price
      });
    }
  }

  const rows = Array.from(rowsMap.values()).sort((a, b) => {
    const raceCmp = a.raceTitle.localeCompare(b.raceTitle, "pt-BR");
    if (raceCmp !== 0) return raceCmp;
    return a.ageInMonths - b.ageInMonths;
  });

  const totals = rows.reduce(
    (acc, row) => ({
      aves: acc.aves + row.total,
      valor: acc.valor + (row.pricePerUnit ?? 0) * row.total
    }),
    { aves: 0, valor: 0 }
  );

  return {
    tenant,
    rows,
    totals,
    generatedAt: new Date().toISOString()
  };
}
