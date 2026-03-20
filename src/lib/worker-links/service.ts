import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";

export async function listWorkerLinks(tenantId: string) {
  return prisma.workerAccessLink.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" }
  });
}

export async function createWorkerLink(
  tenantId: string,
  input?: {
    label?: string;
    allowPlantel?: boolean;
    allowEggs?: boolean;
    allowIncubators?: boolean;
    allowHealth?: boolean;
  }
) {
  return prisma.workerAccessLink.create({
    data: {
      tenantId,
      label: input?.label?.trim() || "Acesso da equipe",
      token: randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, ""),
      allowPlantel: input?.allowPlantel ?? true,
      allowEggs: input?.allowEggs ?? true,
      allowIncubators: input?.allowIncubators ?? true,
      allowHealth: input?.allowHealth ?? true
    }
  });
}

export async function disableWorkerLink(tenantId: string, id: string) {
  const link = await prisma.workerAccessLink.findFirst({
    where: { id, tenantId },
    select: { id: true }
  });

  if (!link) return null;

  return prisma.workerAccessLink.update({
    where: { id },
    data: { isActive: false }
  });
}

export async function getWorkerLinkByToken(token: string) {
  return prisma.workerAccessLink.findFirst({
    where: { token, isActive: true },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          status: true
        }
      }
    }
  });
}
