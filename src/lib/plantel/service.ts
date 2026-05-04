import { BirdStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type PlantelFilters = {
  species?: string;
  breed?: string;
  variety?: string;
  status?: BirdStatus;
  ring?: string;
};

type PlantelGrowthPoint = {
  key: string;
  label: string;
  total: number;
};

async function ensureTaxonomy(tenantId: string, speciesName: string, breedName: string, varietyName?: string) {
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

  let breed = await prisma.breed.findFirst({
    where: { tenantId, speciesId: species.id, name: breedName },
    select: { id: true }
  });

  if (!breed) {
    breed = await prisma.breed.create({
      data: { tenantId, speciesId: species.id, name: breedName },
      select: { id: true }
    });
  }

  let varietyId: string | null = null;
  const cleanedVariety = varietyName?.trim();

  if (cleanedVariety) {
    let variety = await prisma.variety.findFirst({
      where: { tenantId, breedId: breed.id, name: cleanedVariety },
      select: { id: true }
    });

    if (!variety) {
      variety = await prisma.variety.create({
        data: { tenantId, breedId: breed.id, name: cleanedVariety },
        select: { id: true }
      });
    }

    varietyId = variety.id;
  }

  return {
    speciesId: species.id,
    breedId: breed.id,
    varietyId
  };
}

export async function generateRingNumbers(tenantId: string, count: number): Promise<string[]> {
  if (count <= 0) return [];

  const total = await prisma.bird.count({ where: { tenantId } });

  for (let blockOffset = 0; blockOffset < 200; blockOffset += count) {
    const candidates: string[] = [];
    let valid = true;
    for (let i = 0; i < count; i += 1) {
      const seq = total + blockOffset + i + 1;
      const letterIndex = Math.floor((seq - 1) / 10000);
      const number = ((seq - 1) % 10000) + 1;
      if (letterIndex >= 26) {
        valid = false;
        break;
      }
      candidates.push(`${String.fromCharCode(65 + letterIndex)}${String(number).padStart(4, "0")}`);
    }
    if (!valid) break;
    const existing = await prisma.bird.findMany({
      where: { tenantId, ringNumber: { in: candidates } },
      select: { ringNumber: true }
    });
    if (existing.length === 0) return candidates;
  }

  const used = new Set<string>();
  const fallback: string[] = [];
  for (let i = 0; i < count; i += 1) {
    let candidate = "";
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      const number = Math.floor(Math.random() * 9999) + 1;
      candidate = `${letter}${String(number).padStart(4, "0")}`;
      if (used.has(candidate)) continue;
      const exists = await prisma.bird.findFirst({
        where: { tenantId, ringNumber: candidate },
        select: { id: true }
      });
      if (!exists) break;
      candidate = "";
    }
    if (!candidate) throw new Error("Não foi possível gerar anilhas automáticas únicas.");
    used.add(candidate);
    fallback.push(candidate);
  }
  return fallback;
}

async function resolveRingNumber(tenantId: string, inputRingNumber?: string, fallbackRingNumber?: string) {
  const cleanedInput = inputRingNumber?.trim();
  if (cleanedInput) return cleanedInput;

  const cleanedFallback = fallbackRingNumber?.trim();
  if (cleanedFallback) return cleanedFallback;

  const [ring] = await generateRingNumbers(tenantId, 1);
  return ring;
}

export async function listPlantel(tenantId: string, filters: PlantelFilters) {
  const groupWhere: Prisma.FlockGroupWhereInput = {
    tenantId,
    species: filters.species ? { name: { contains: filters.species, mode: "insensitive" } } : undefined,
    breed: filters.breed ? { name: { contains: filters.breed, mode: "insensitive" } } : undefined,
    variety: filters.variety ? { name: { contains: filters.variety, mode: "insensitive" } } : undefined
  };

  const groups = await prisma.flockGroup.findMany({
    where: groupWhere,
    include: {
      species: { select: { name: true } },
      breed: { select: { name: true } },
      variety: { select: { name: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  if (groups.length === 0) {
    return {
      groups: [],
      growth: {
        byMonth: [] as PlantelGrowthPoint[],
        byYear: [] as PlantelGrowthPoint[]
      },
      taxonomy: { species: [], breeds: [], varieties: [] }
    };
  }

  const groupIds = groups.map((group) => group.id);
  const birdWhere: Prisma.BirdWhereInput = {
    tenantId,
    flockGroupId: { in: groupIds }
  };

  const allBirds = await prisma.bird.findMany({
    where: birdWhere,
    orderBy: { createdAt: "desc" }
  });

  const activeListings = await prisma.vitrineListing.findMany({
    where: {
      tenantId,
      sourceBirdId: { not: null },
      status: { not: "REMOVED" }
    },
    select: { sourceBirdId: true, status: true }
  });
  const inVitrineSet = new Set(
    activeListings
      .filter((listing) => listing.status === "AVAILABLE")
      .map((listing) => listing.sourceBirdId!)
  );

  // Filhotes do lote pai: soma direta dos eventos HATCHED de TODAS as
  // chocadas (IncubatorBatch) cujo flockGroupId == lote pai. Eh a fonte
  // primaria - independe de existir VitrineListing ou FlockGroup-filhote
  // (chocadas finalizadas antes da feature de criacao automatica de Bird/
  // FlockGroup tambem entram). Reflete quantos filhotes NASCERAM desse lote.
  const hatchedEvents = await prisma.incubatorBatchEvent.findMany({
    where: { tenantId, type: "HATCHED" },
    select: { quantity: true, batch: { select: { flockGroupId: true } } }
  });

  const daughtersByParent = new Map<string, number>();
  for (const event of hatchedEvents) {
    const parentId = event.batch?.flockGroupId;
    if (!parentId) continue;
    daughtersByParent.set(parentId, (daughtersByParent.get(parentId) ?? 0) + (event.quantity ?? 0));
  }

  // Tambem mantem o mapa parent -> Set<childFlockGroupIds> usado pelo modal
  // de drill-down (lista de Birds materializados em FlockGroups-chocadas).
  const childGroupListings = await prisma.vitrineListing.findMany({
    where: {
      tenantId,
      sourceIncubatorBatchId: { not: null },
      status: { not: "REMOVED" }
    },
    select: {
      flockGroupId: true,
      sourceIncubatorBatch: { select: { flockGroupId: true } }
    }
  });

  const childGroupIdsByParent = new Map<string, Set<string>>();
  for (const listing of childGroupListings) {
    const parentId = listing.sourceIncubatorBatch?.flockGroupId;
    if (!parentId || parentId === listing.flockGroupId) continue;
    const bucket = childGroupIdsByParent.get(parentId) ?? new Set<string>();
    bucket.add(listing.flockGroupId);
    childGroupIdsByParent.set(parentId, bucket);
  }

  function daughtersFor(parentGroupId: string): number {
    return daughtersByParent.get(parentGroupId) ?? 0;
  }

  // Filhotes VIVOS no criatorio: Birds em FlockGroups-filhotes do parent,
  // status != DEAD e NAO listados na vitrine. Usado para o modal 'aves vivas'.
  const allChildGroupIds = new Set<string>();
  for (const set of childGroupIdsByParent.values()) {
    for (const id of set) allChildGroupIds.add(id);
  }
  let aliveByChildGroup = new Map<string, number>();
  if (allChildGroupIds.size > 0) {
    const childBirds = await prisma.bird.findMany({
      where: {
        tenantId,
        flockGroupId: { in: Array.from(allChildGroupIds) },
        status: { notIn: ["DEAD", "SOLD"] }
      },
      select: { id: true, flockGroupId: true }
    });
    aliveByChildGroup = childBirds.reduce((acc, bird) => {
      if (inVitrineSet.has(bird.id)) return acc;
      acc.set(bird.flockGroupId, (acc.get(bird.flockGroupId) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());
  }
  function daughtersAliveFor(parentGroupId: string): number {
    const childIds = childGroupIdsByParent.get(parentGroupId);
    if (!childIds) return 0;
    let total = 0;
    for (const childId of childIds) total += aliveByChildGroup.get(childId) ?? 0;
    return total;
  }

  const filteredBirds = allBirds.filter((bird) => {
    const statusOk = filters.status ? bird.status === filters.status : true;
    const ringOk = filters.ring
      ? bird.ringNumber.toLowerCase().includes(filters.ring.toLowerCase())
      : true;
    return statusOk && ringOk;
  });

  const filteredByGroup = new Map<string, typeof filteredBirds>();
  const allByGroup = new Map<string, typeof allBirds>();

  for (const bird of allBirds) {
    const bucket = allByGroup.get(bird.flockGroupId) ?? [];
    bucket.push(bird);
    allByGroup.set(bird.flockGroupId, bucket);
  }

  for (const bird of filteredBirds) {
    const bucket = filteredByGroup.get(bird.flockGroupId) ?? [];
    bucket.push(bird);
    filteredByGroup.set(bird.flockGroupId, bucket);
  }

  // Ultima vacinacao aplicada por grupo (entre as aves do grupo): mostra
  // 'ultima vacina' no card. Pega so a aplicacao mais recente por
  // {grupo, vacina, dia} - se vacinou o lote inteiro num dia, conta como 1.
  const allBirdIds = allBirds.map((b) => b.id);
  const lastVaccinationsRaw = allBirdIds.length
    ? await prisma.birdVaccination.findMany({
        where: { tenantId, birdId: { in: allBirdIds } },
        select: {
          appliedAt: true,
          birdId: true,
          vaccine: { select: { name: true } }
        },
        orderBy: { appliedAt: "desc" }
      })
    : [];
  const birdToGroup = new Map(allBirds.map((b) => [b.id, b.flockGroupId]));
  const lastVaccByGroup = new Map<string, { vaccineName: string; appliedAt: Date }>();
  for (const v of lastVaccinationsRaw) {
    const groupId = birdToGroup.get(v.birdId);
    if (!groupId) continue;
    if (!lastVaccByGroup.has(groupId)) {
      lastVaccByGroup.set(groupId, { vaccineName: v.vaccine.name, appliedAt: v.appliedAt });
    }
  }

  const mappedGroups = groups
    .filter(
      (group) =>
        !allChildGroupIds.has(group.id) &&
        !group.title.startsWith("Chocada ") &&
        !group.title.startsWith("Recria ")
    )
    .map((group) => {
      const groupAllBirds = allByGroup.get(group.id) ?? [];
      const groupFilteredBirds = filteredByGroup.get(group.id) ?? [];
      const configuredTotal = group.matrixCount + group.reproducerCount;
      const countByStatus = {
        ACTIVE: groupAllBirds.filter((bird) => bird.status === "ACTIVE").length,
        SICK: groupAllBirds.filter((bird) => bird.status === "SICK").length,
        DEAD: groupAllBirds.filter((bird) => bird.status === "DEAD").length,
        BROODY: groupAllBirds.filter((bird) => bird.status === "BROODY").length
      };

      const females = groupAllBirds.filter((bird) => bird.sex === "FEMALE").length;
      const males = groupAllBirds.filter((bird) => bird.sex === "MALE").length;

      const visible = filters.status || filters.ring ? groupFilteredBirds.length > 0 : true;
      if (!visible) return null;

      const birdsWithVitrine = groupFilteredBirds.map((bird) => ({
        ...bird,
        inVitrine: inVitrineSet.has(bird.id)
      }));

      const lastVacc = lastVaccByGroup.get(group.id);

      return {
        ...group,
        summary: {
          totalBirds: Math.max(groupAllBirds.length, configuredTotal),
          females,
          males,
          daughters: daughtersFor(group.id),
          daughtersAlive: daughtersAliveFor(group.id),
          ...countByStatus
        },
        birds: birdsWithVitrine,
        lastVaccination: lastVacc
          ? { vaccineName: lastVacc.vaccineName, appliedAt: lastVacc.appliedAt.toISOString() }
          : null
      };
    })
    .filter(Boolean);

  const [species, breeds, varieties] = await Promise.all([
    prisma.species.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.breed.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    prisma.variety.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  ]);

  const monthlyMap = new Map<string, number>();
  const yearlyMap = new Map<string, number>();

  for (const bird of allBirds) {
    const baseDate = bird.acquisitionDate ?? bird.createdAt;
    const date = new Date(baseDate);
    if (Number.isNaN(date.getTime())) continue;

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    const yearKey = String(date.getFullYear());

    monthlyMap.set(`${monthKey}|${monthLabel}`, (monthlyMap.get(`${monthKey}|${monthLabel}`) ?? 0) + 1);
    yearlyMap.set(yearKey, (yearlyMap.get(yearKey) ?? 0) + 1);
  }

  const byMonth: PlantelGrowthPoint[] = [...monthlyMap.entries()]
    .map(([packed, total]) => {
      const [key, label] = packed.split("|");
      return { key, label, total };
    })
    .sort((a, b) => a.key.localeCompare(b.key));

  const byYear: PlantelGrowthPoint[] = [...yearlyMap.entries()]
    .map(([key, total]) => ({ key, label: key, total }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return {
    groups: mappedGroups,
    growth: {
      byMonth,
      byYear
    },
    taxonomy: { species, breeds, varieties }
  };
}

export async function createFlockGroup(
  tenantId: string,
  input: {
    species: string;
    breed: string;
    variety?: string;
    title: string;
    bayNumber?: number;
    matrixCount: number;
    reproducerCount: number;
    expectedLayCapacity?: number;
    purchaseInvestmentTotal?: number;
    notes?: string;
  }
) {
  const taxonomy = await ensureTaxonomy(tenantId, input.species, input.breed, input.variety);

  return prisma.flockGroup.create({
    data: {
      tenantId,
      speciesId: taxonomy.speciesId,
      breedId: taxonomy.breedId,
      varietyId: taxonomy.varietyId,
      title: input.title,
      bayNumber: input.bayNumber ?? 1,
      matrixCount: input.matrixCount,
      reproducerCount: input.reproducerCount,
      expectedLayCapacity: input.expectedLayCapacity,
      purchaseInvestmentTotal: input.purchaseInvestmentTotal,
      notes: input.notes
    }
  });
}

export async function updateFlockGroup(
  tenantId: string,
  id: string,
  input: {
    species: string;
    breed: string;
    variety?: string;
    title: string;
    bayNumber?: number;
    matrixCount: number;
    reproducerCount: number;
    expectedLayCapacity?: number;
    purchaseInvestmentTotal?: number;
    notes?: string;
  }
) {
  const exists = await prisma.flockGroup.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!exists) return null;

  const taxonomy = await ensureTaxonomy(tenantId, input.species, input.breed, input.variety);

  return prisma.flockGroup.update({
    where: { id },
    data: {
      speciesId: taxonomy.speciesId,
      breedId: taxonomy.breedId,
      varietyId: taxonomy.varietyId,
      title: input.title,
      bayNumber: input.bayNumber ?? 1,
      matrixCount: input.matrixCount,
      reproducerCount: input.reproducerCount,
      expectedLayCapacity: input.expectedLayCapacity,
      purchaseInvestmentTotal: input.purchaseInvestmentTotal,
      notes: input.notes
    }
  });
}

export async function deleteFlockGroup(tenantId: string, id: string) {
  const exists = await prisma.flockGroup.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!exists) return false;

  await prisma.flockGroup.delete({ where: { id } });
  return true;
}

export async function createBird(
  tenantId: string,
  userId: string | null,
  input: {
    flockGroupId: string;
    bayNumber?: number;
    ringNumber?: string;
    nickname?: string;
    sex: "FEMALE" | "MALE" | "UNKNOWN";
    acquisitionDate?: string;
    purchaseValue?: number;
    origin?: string;
    status: BirdStatus;
  }
) {
  const group = await prisma.flockGroup.findFirst({
    where: { id: input.flockGroupId, tenantId },
    select: { id: true, bayNumber: true, title: true }
  });
  if (!group) return null;

  const ringNumber = await resolveRingNumber(tenantId, input.ringNumber);

  const bird = await prisma.bird.create({
    data: {
      tenantId,
      flockGroupId: input.flockGroupId,
      bayNumber: input.bayNumber ?? group.bayNumber,
      ringNumber,
      nickname: input.nickname,
      sex: input.sex,
      acquisitionDate: input.acquisitionDate ? new Date(input.acquisitionDate) : null,
      purchaseValue: input.purchaseValue,
      origin: input.origin,
      status: input.status,
      statusHistory: {
        create: {
          tenantId,
          fromStatus: null,
          toStatus: input.status,
          reason: "Cadastro inicial"
        }
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "BIRD_CREATE",
      entity: "Bird",
      entityId: bird.id,
      after: {
        ringNumber: bird.ringNumber,
        status: bird.status
      }
    }
  });

  if (input.purchaseValue && input.purchaseValue > 0) {
    const expenseDate = input.acquisitionDate ? new Date(input.acquisitionDate) : new Date();
    const itemLabel = input.nickname?.trim()
      ? `${group.title} - ${ringNumber} (${input.nickname.trim()})`
      : `${group.title} - ${ringNumber}`;
    await prisma.financialExpense.create({
      data: {
        tenantId,
        date: expenseDate,
        category: "BIRD_PURCHASE",
        item: itemLabel,
        amount: input.purchaseValue,
        description: `Compra de ave: ${ringNumber}`,
        supplier: input.origin?.trim() || null
      }
    });
  }

  return bird;
}

export async function updateBird(
  tenantId: string,
  userId: string | null,
  id: string,
  input: {
    flockGroupId: string;
    bayNumber?: number;
    ringNumber?: string;
    nickname?: string;
    sex: "FEMALE" | "MALE" | "UNKNOWN";
    acquisitionDate?: string;
    purchaseValue?: number;
    origin?: string;
    status: BirdStatus;
  }
) {
  const existing = await prisma.bird.findFirst({
    where: { id, tenantId },
    select: { id: true, status: true, bayNumber: true, ringNumber: true }
  });
  if (!existing) return null;

  const group = await prisma.flockGroup.findFirst({
    where: { id: input.flockGroupId, tenantId },
    select: { bayNumber: true }
  });
  if (!group) return null;

  const ringNumber = await resolveRingNumber(tenantId, input.ringNumber, existing.ringNumber);

  const updated = await prisma.bird.update({
    where: { id },
    data: {
      flockGroupId: input.flockGroupId,
      bayNumber: input.bayNumber ?? existing.bayNumber ?? group.bayNumber,
      ringNumber,
      nickname: input.nickname,
      sex: input.sex,
      acquisitionDate: input.acquisitionDate ? new Date(input.acquisitionDate) : null,
      purchaseValue: input.purchaseValue,
      origin: input.origin,
      status: input.status
    }
  });

  if (existing.status !== input.status) {
    await prisma.birdStatusHistory.create({
      data: {
        tenantId,
        birdId: id,
        fromStatus: existing.status,
        toStatus: input.status,
        reason: "Atualização de cadastro"
      }
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "BIRD_UPDATE",
      entity: "Bird",
      entityId: id,
      after: {
        ringNumber: updated.ringNumber,
        status: updated.status
      }
    }
  });

  return updated;
}

export async function deleteBird(tenantId: string, userId: string | null, id: string) {
  const existing = await prisma.bird.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!existing) return false;

  await prisma.bird.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "BIRD_DELETE",
      entity: "Bird",
      entityId: id
    }
  });

  return true;
}

export async function changeBirdStatus(
  tenantId: string,
  userId: string | null,
  id: string,
  status: BirdStatus,
  reason?: string
) {
  const bird = await prisma.bird.findFirst({ where: { id, tenantId } });
  if (!bird) return null;
  if (bird.status === status) return bird;

  const updated = await prisma.bird.update({
    where: { id },
    data: { status }
  });

  await prisma.birdStatusHistory.create({
    data: {
      tenantId,
      birdId: id,
      fromStatus: bird.status,
      toStatus: status,
      reason
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "BIRD_STATUS_CHANGE",
      entity: "Bird",
      entityId: id,
      before: { status: bird.status },
      after: { status }
    }
  });

  return updated;
}

export async function listBirdHistory(tenantId: string, birdId: string) {
  const bird = await prisma.bird.findFirst({ where: { id: birdId, tenantId }, select: { id: true } });
  if (!bird) return null;

  return prisma.birdStatusHistory.findMany({
    where: { tenantId, birdId },
    orderBy: { createdAt: "desc" }
  });
}

