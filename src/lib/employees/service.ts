import { hash } from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

// Os 9 campos de permissao por pagina (perfil eh sempre owner-only).
type Permissions = {
  allowPlantel?: boolean;
  allowEggs?: boolean;
  allowIncubators?: boolean;
  allowHealth?: boolean;
  allowDashboard?: boolean;
  allowPrateleira?: boolean;
  allowVitrine?: boolean;
  allowFinanceiro?: boolean;
  allowRelatorios?: boolean;
};

const PERMISSION_SELECT = {
  allowPlantel: true,
  allowEggs: true,
  allowIncubators: true,
  allowHealth: true,
  allowDashboard: true,
  allowPrateleira: true,
  allowVitrine: true,
  allowFinanceiro: true,
  allowRelatorios: true
} as const;

function permissionsForCreate(input: Permissions) {
  return {
    allowPlantel: input.allowPlantel ?? true,
    allowEggs: input.allowEggs ?? true,
    allowIncubators: input.allowIncubators ?? true,
    allowHealth: input.allowHealth ?? true,
    allowDashboard: input.allowDashboard ?? true,
    allowPrateleira: input.allowPrateleira ?? true,
    allowVitrine: input.allowVitrine ?? true,
    allowFinanceiro: input.allowFinanceiro ?? true,
    allowRelatorios: input.allowRelatorios ?? true
  };
}

function permissionsForUpdate(input: Permissions, existing: Permissions & { [key: string]: unknown }) {
  return {
    allowPlantel: input.allowPlantel ?? Boolean(existing.allowPlantel),
    allowEggs: input.allowEggs ?? Boolean(existing.allowEggs),
    allowIncubators: input.allowIncubators ?? Boolean(existing.allowIncubators),
    allowHealth: input.allowHealth ?? Boolean(existing.allowHealth),
    allowDashboard: input.allowDashboard ?? Boolean(existing.allowDashboard),
    allowPrateleira: input.allowPrateleira ?? Boolean(existing.allowPrateleira),
    allowVitrine: input.allowVitrine ?? Boolean(existing.allowVitrine),
    allowFinanceiro: input.allowFinanceiro ?? Boolean(existing.allowFinanceiro),
    allowRelatorios: input.allowRelatorios ?? Boolean(existing.allowRelatorios)
  };
}

export async function listEmployees(tenantId: string) {
  return prisma.employeeAccount.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      ...PERMISSION_SELECT,
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
  } & Permissions
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
      ...permissionsForCreate(input)
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
  } & Permissions
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
      ...permissionsForUpdate(input, existing)
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
