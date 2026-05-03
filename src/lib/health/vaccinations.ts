import { prisma } from "@/lib/db/prisma";
import type {
  BirdVaccinationInput,
  FlockVaccinationInput,
  MultiFlockVaccinationInput
} from "@/lib/validators/health-catalogs";

export function listVaccinations(tenantId: string, filters?: { birdId?: string }) {
  return prisma.birdVaccination.findMany({
    where: {
      tenantId,
      ...(filters?.birdId ? { birdId: filters.birdId } : {})
    },
    include: {
      vaccine: { select: { id: true, name: true } },
      bird: {
        select: {
          id: true,
          ringNumber: true,
          nickname: true,
          flockGroup: { select: { title: true } }
        }
      }
    },
    orderBy: { appliedAt: "desc" }
  });
}

export async function recordVaccination(tenantId: string, input: BirdVaccinationInput) {
  const bird = await prisma.bird.findFirst({
    where: { id: input.birdId, tenantId },
    select: { id: true }
  });
  if (!bird) throw new Error("Ave não encontrada.");

  const vaccine = await prisma.vaccine.findFirst({
    where: { id: input.vaccineId, tenantId },
    select: { id: true }
  });
  if (!vaccine) throw new Error("Vacina não encontrada no catálogo.");

  const date = new Date(input.appliedAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Data de aplicação inválida.");
  }

  return prisma.birdVaccination.create({
    data: {
      tenantId,
      birdId: input.birdId,
      vaccineId: input.vaccineId,
      appliedAt: date,
      notes: input.notes?.trim() || null
    }
  });
}

export async function recordFlockVaccination(
  tenantId: string,
  input: FlockVaccinationInput
) {
  const flockGroup = await prisma.flockGroup.findFirst({
    where: { id: input.flockGroupId, tenantId },
    select: { id: true, title: true }
  });
  if (!flockGroup) throw new Error("Lote não encontrado.");

  const vaccine = await prisma.vaccine.findFirst({
    where: { id: input.vaccineId, tenantId },
    select: { id: true }
  });
  if (!vaccine) throw new Error("Vacina não encontrada no catálogo.");

  const date = new Date(input.appliedAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Data de aplicação inválida.");
  }

  const birds = await prisma.bird.findMany({
    where: { tenantId, flockGroupId: flockGroup.id, status: { not: "DEAD" } },
    select: { id: true }
  });

  if (birds.length === 0) {
    throw new Error("Nenhuma ave viva no lote para vacinar.");
  }

  const notes = input.notes?.trim() || null;

  const result = await prisma.birdVaccination.createMany({
    data: birds.map((bird) => ({
      tenantId,
      birdId: bird.id,
      vaccineId: input.vaccineId,
      appliedAt: date,
      notes
    }))
  });

  return { count: result.count, flockGroupTitle: flockGroup.title };
}

export async function recordMultiFlockVaccination(
  tenantId: string,
  input: MultiFlockVaccinationInput
) {
  const vaccine = await prisma.vaccine.findFirst({
    where: { id: input.vaccineId, tenantId },
    select: { id: true }
  });
  if (!vaccine) throw new Error("Vacina não encontrada no catálogo.");

  const date = new Date(input.appliedAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Data de aplicação inválida.");
  }

  const groups = await prisma.flockGroup.findMany({
    where: { tenantId, id: { in: input.flockGroupIds } },
    select: { id: true, title: true }
  });
  if (groups.length === 0) throw new Error("Nenhum lote válido informado.");

  const birds = await prisma.bird.findMany({
    where: {
      tenantId,
      flockGroupId: { in: groups.map((g) => g.id) },
      status: { not: "DEAD" }
    },
    select: { id: true, flockGroupId: true }
  });
  if (birds.length === 0) {
    throw new Error("Nenhuma ave viva nos lotes selecionados.");
  }

  const notes = input.notes?.trim() || null;
  const result = await prisma.birdVaccination.createMany({
    data: birds.map((bird) => ({
      tenantId,
      birdId: bird.id,
      vaccineId: input.vaccineId,
      appliedAt: date,
      notes
    }))
  });

  const breakdown = groups.map((group) => ({
    flockGroupId: group.id,
    flockGroupTitle: group.title,
    count: birds.filter((b) => b.flockGroupId === group.id).length
  }));

  return { totalCount: result.count, breakdown };
}

export async function deleteVaccination(tenantId: string, id: string) {
  const existing = await prisma.birdVaccination.findFirst({
    where: { id, tenantId },
    select: { id: true }
  });
  if (!existing) return false;
  await prisma.birdVaccination.delete({ where: { id } });
  return true;
}
