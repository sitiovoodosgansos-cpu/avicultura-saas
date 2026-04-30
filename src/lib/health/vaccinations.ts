import { prisma } from "@/lib/db/prisma";
import type { BirdVaccinationInput } from "@/lib/validators/health-catalogs";

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

export async function deleteVaccination(tenantId: string, id: string) {
  const existing = await prisma.birdVaccination.findFirst({
    where: { id, tenantId },
    select: { id: true }
  });
  if (!existing) return false;
  await prisma.birdVaccination.delete({ where: { id } });
  return true;
}
