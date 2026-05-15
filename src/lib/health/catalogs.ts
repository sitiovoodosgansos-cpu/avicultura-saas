import { prisma } from "@/lib/db/prisma";
import type {
  DeathReasonInput,
  DiseaseInput,
  MedicationInput,
  VaccineInput
} from "@/lib/validators/health-catalogs";

// Diseases ------------------------------------------------------------------

export function listDiseases(tenantId: string) {
  return prisma.disease.findMany({
    where: { tenantId },
    orderBy: { name: "asc" }
  });
}

export function createDisease(tenantId: string, input: DiseaseInput) {
  return prisma.disease.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description?.trim() || null,
      symptoms: input.symptoms?.trim() || null,
      defaultTreatment: input.defaultTreatment?.trim() || null
    }
  });
}

export async function updateDisease(tenantId: string, id: string, input: DiseaseInput) {
  const existing = await prisma.disease.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!existing) return null;
  return prisma.disease.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description?.trim() || null,
      symptoms: input.symptoms?.trim() || null,
      defaultTreatment: input.defaultTreatment?.trim() || null
    }
  });
}

export async function deleteDisease(tenantId: string, id: string) {
  const existing = await prisma.disease.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!existing) return false;
  await prisma.disease.delete({ where: { id } });
  return true;
}

// Medications ---------------------------------------------------------------

export function listMedications(tenantId: string) {
  return prisma.medication.findMany({
    where: { tenantId },
    orderBy: { name: "asc" }
  });
}

export function createMedication(tenantId: string, input: MedicationInput) {
  return prisma.medication.create({
    data: {
      tenantId,
      name: input.name,
      defaultDosage: input.defaultDosage?.trim() || null,
      route: input.route?.trim() || null,
      notes: input.notes?.trim() || null
    }
  });
}

export async function updateMedication(tenantId: string, id: string, input: MedicationInput) {
  const existing = await prisma.medication.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!existing) return null;
  return prisma.medication.update({
    where: { id },
    data: {
      name: input.name,
      defaultDosage: input.defaultDosage?.trim() || null,
      route: input.route?.trim() || null,
      notes: input.notes?.trim() || null
    }
  });
}

export async function deleteMedication(tenantId: string, id: string) {
  const existing = await prisma.medication.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!existing) return false;
  await prisma.medication.delete({ where: { id } });
  return true;
}

// Vaccines ------------------------------------------------------------------

export function listVaccines(tenantId: string) {
  return prisma.vaccine.findMany({
    where: { tenantId },
    orderBy: { name: "asc" }
  });
}

export function createVaccine(tenantId: string, input: VaccineInput) {
  return prisma.vaccine.create({
    data: {
      tenantId,
      name: input.name,
      recommendedAgeMonths: input.recommendedAgeMonths ?? null,
      recommendedAgeUnit: input.recommendedAgeUnit ?? null,
      intervalMonths: input.intervalMonths ?? null,
      intervalUnit: input.intervalUnit ?? null,
      notes: input.notes?.trim() || null
    }
  });
}

export async function updateVaccine(tenantId: string, id: string, input: VaccineInput) {
  const existing = await prisma.vaccine.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!existing) return null;
  return prisma.vaccine.update({
    where: { id },
    data: {
      name: input.name,
      recommendedAgeMonths: input.recommendedAgeMonths ?? null,
      recommendedAgeUnit: input.recommendedAgeUnit ?? null,
      intervalMonths: input.intervalMonths ?? null,
      intervalUnit: input.intervalUnit ?? null,
      notes: input.notes?.trim() || null
    }
  });
}

export async function deleteVaccine(tenantId: string, id: string) {
  const existing = await prisma.vaccine.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!existing) return false;
  await prisma.vaccine.delete({ where: { id } });
  return true;
}

// Death reasons -------------------------------------------------------------

export function listDeathReasons(tenantId: string) {
  return prisma.deathReason.findMany({
    where: { tenantId },
    orderBy: { name: "asc" }
  });
}

export async function createDeathReason(tenantId: string, input: DeathReasonInput) {
  // Upsert por (tenantId, name) — se ja existe causa com esse nome,
  // retorna a existente (idempotente). Antes lancava 'Unique
  // constraint failed' quando o usuario digitava manualmente um
  // nome ja cadastrado no catalogo (cenario comum quando ele nao
  // viu a opcao no dropdown).
  const trimmedName = input.name.trim();
  const existing = await prisma.deathReason.findFirst({
    where: {
      tenantId,
      name: { equals: trimmedName, mode: "insensitive" }
    }
  });
  if (existing) return existing;

  return prisma.deathReason.create({
    data: {
      tenantId,
      name: trimmedName,
      notes: input.notes?.trim() || null
    }
  });
}

export async function updateDeathReason(tenantId: string, id: string, input: DeathReasonInput) {
  const existing = await prisma.deathReason.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!existing) return null;
  return prisma.deathReason.update({
    where: { id },
    data: {
      name: input.name,
      notes: input.notes?.trim() || null
    }
  });
}

export async function deleteDeathReason(tenantId: string, id: string) {
  const existing = await prisma.deathReason.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!existing) return false;
  await prisma.deathReason.delete({ where: { id } });
  return true;
}
