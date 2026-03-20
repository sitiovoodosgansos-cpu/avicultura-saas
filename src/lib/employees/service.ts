import { hash } from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

export async function listEmployees(tenantId: string) {
  return prisma.employeeAccount.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      allowPlantel: true,
      allowEggs: true,
      allowIncubators: true,
      allowHealth: true,
      lastLoginAt: true,
      createdAt: true
    }
  });
}

export async function createEmployee(
  tenantId: string,
  input: {
    name: string;
    email: string;
    password: string;
    isActive?: boolean;
    allowPlantel?: boolean;
    allowEggs?: boolean;
    allowIncubators?: boolean;
    allowHealth?: boolean;
  }
) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await prisma.employeeAccount.findFirst({
    where: { tenantId, email: normalizedEmail }
  });

  if (existing) {
    return { kind: "duplicate" as const };
  }

  const passwordHash = await hash(input.password, 10);

  const employee = await prisma.employeeAccount.create({
    data: {
      tenantId,
      name: input.name,
      email: normalizedEmail,
      passwordHash,
      isActive: input.isActive ?? true,
      allowPlantel: input.allowPlantel ?? true,
      allowEggs: input.allowEggs ?? true,
      allowIncubators: input.allowIncubators ?? true,
      allowHealth: input.allowHealth ?? true
    }
  });

  return { kind: "ok" as const, employee };
}

export async function updateEmployee(
  tenantId: string,
  id: string,
  input: {
    name: string;
    email: string;
    password?: string;
    isActive?: boolean;
    allowPlantel?: boolean;
    allowEggs?: boolean;
    allowIncubators?: boolean;
    allowHealth?: boolean;
  }
) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await prisma.employeeAccount.findFirst({
    where: { id, tenantId }
  });

  if (!existing) return { kind: "not_found" as const };

  const duplicate = await prisma.employeeAccount.findFirst({
    where: {
      tenantId,
      email: normalizedEmail,
      id: { not: id }
    }
  });

  if (duplicate) return { kind: "duplicate" as const };

  const passwordHash = input.password ? await hash(input.password, 10) : undefined;

  const employee = await prisma.employeeAccount.update({
    where: { id },
    data: {
      name: input.name,
      email: normalizedEmail,
      passwordHash,
      isActive: input.isActive ?? existing.isActive,
      allowPlantel: input.allowPlantel ?? existing.allowPlantel,
      allowEggs: input.allowEggs ?? existing.allowEggs,
      allowIncubators: input.allowIncubators ?? existing.allowIncubators,
      allowHealth: input.allowHealth ?? existing.allowHealth
    }
  });

  return { kind: "ok" as const, employee };
}

export async function deactivateEmployee(tenantId: string, id: string) {
  const existing = await prisma.employeeAccount.findFirst({ where: { id, tenantId } });
  if (!existing) return false;

  await prisma.employeeAccount.update({
    where: { id },
    data: { isActive: false }
  });

  await prisma.employeeSession.deleteMany({
    where: { employeeId: id }
  });

  return true;
}
