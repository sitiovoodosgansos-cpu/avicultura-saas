import { BirdStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type PlantelFilters = {
  species?: string;
  breed?: string;
  variety?: string;
  status?: BirdStatus;
  ring?: string;
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
    return { groups: [], taxonomy: { species: [], breeds: [], varieties: [] } };
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

  const mappedGroups = groups
    .map((group) => {
      const groupAllBirds = allByGroup.get(group.id) ?? [];
      const groupFilteredBirds = filteredByGroup.get(group.id) ?? [];
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

      return {
        ...group,
        summary: {
          totalBirds: groupAllBirds.length,
          females,
          males,
          ...countByStatus
        },
        birds: groupFilteredBirds
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

  return {
    groups: mappedGroups,
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
    matrixCount: number;
    reproducerCount: number;
    expectedLayCapacity?: number;
    purchaseInvestmentTotal?: number;
    purchaseDate?: string;
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
      matrixCount: input.matrixCount,
      reproducerCount: input.reproducerCount,
      expectedLayCapacity: input.expectedLayCapacity,
      purchaseInvestmentTotal: input.purchaseInvestmentTotal,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
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
    matrixCount: number;
    reproducerCount: number;
    expectedLayCapacity?: number;
    purchaseInvestmentTotal?: number;
    purchaseDate?: string;
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
      matrixCount: input.matrixCount,
      reproducerCount: input.reproducerCount,
      expectedLayCapacity: input.expectedLayCapacity,
      purchaseInvestmentTotal: input.purchaseInvestmentTotal,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
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
    ringNumber: string;
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
    select: { id: true }
  });
  if (!group) return null;

  const bird = await prisma.bird.create({
    data: {
      tenantId,
      flockGroupId: input.flockGroupId,
      ringNumber: input.ringNumber,
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

  return bird;
}

export async function updateBird(
  tenantId: string,
  userId: string | null,
  id: string,
  input: {
    flockGroupId: string;
    ringNumber: string;
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
    select: { id: true, status: true }
  });
  if (!existing) return null;

  const updated = await prisma.bird.update({
    where: { id },
    data: {
      flockGroupId: input.flockGroupId,
      ringNumber: input.ringNumber,
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

