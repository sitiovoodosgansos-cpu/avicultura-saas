import { BirdStatus, InfirmaryCaseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

function toDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function ratio(num: number, den: number) {
  if (!den) return 0;
  return Number(((num / den) * 100).toFixed(2));
}

export async function listHealthContext(tenantId: string) {
  const [infirmaries, cases, birds, quarantineTemplates, quarantineCases] = await Promise.all([
    prisma.infirmary.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.infirmaryCase.findMany({
      where: { tenantId },
      include: {
        bird: {
          select: {
            id: true,
            ringNumber: true,
            nickname: true,
            status: true,
            flockGroup: { select: { title: true } }
          }
        },
        infirmary: { select: { id: true, name: true, status: true } },
        events: { orderBy: { createdAt: "desc" } }
      },
      orderBy: [{ openedAt: "desc" }, { createdAt: "desc" }]
    }),
    prisma.bird.findMany({
      where: { tenantId },
      select: { id: true, ringNumber: true, nickname: true, status: true },
      orderBy: { ringNumber: "asc" }
    }),
    prisma.quarantineChecklistTemplate.findMany({
      where: { tenantId },
      orderBy: { name: "asc" }
    }),
    prisma.quarantineCase.findMany({
      where: { tenantId },
      include: {
        bird: {
          select: {
            id: true,
            ringNumber: true,
            nickname: true,
            status: true,
            flockGroup: { select: { title: true } }
          }
        },
        infirmary: { select: { id: true, name: true, status: true } },
        treatments: {
          include: { template: { select: { id: true, name: true } } },
          orderBy: { startDate: "asc" }
        }
      },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }]
    })
  ]);

  return { infirmaries, cases, birds, quarantineTemplates, quarantineCases };
}

export async function createQuarantineTemplate(
  tenantId: string,
  userId: string | null,
  input: { name: string }
) {
  const created = await prisma.quarantineChecklistTemplate.create({
    data: {
      tenantId,
      name: input.name.trim()
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "QUARANTINE_TEMPLATE_CREATE",
      entity: "QuarantineChecklistTemplate",
      entityId: created.id,
      after: { name: created.name }
    }
  });

  return created;
}

export async function createQuarantineCase(
  tenantId: string,
  userId: string | null,
  input: {
    birdId: string;
    infirmaryId: string;
    entryDate: string;
    expectedExitDate: string;
    notes?: string;
    treatments: Array<{ label: string; startDate: string; notes?: string; templateId?: string }>;
  }
) {
  const [bird, infirmary] = await Promise.all([
    prisma.bird.findFirst({ where: { id: input.birdId, tenantId } }),
    prisma.infirmary.findFirst({ where: { id: input.infirmaryId, tenantId } })
  ]);

  if (!bird || !infirmary) return null;

  const created = await prisma.quarantineCase.create({
    data: {
      tenantId,
      birdId: input.birdId,
      infirmaryId: input.infirmaryId,
      entryDate: toDate(input.entryDate),
      expectedExitDate: toDate(input.expectedExitDate),
      notes: input.notes,
      treatments: {
        create: input.treatments.map((item) => ({
          tenantId,
          label: item.label.trim(),
          startDate: toDate(item.startDate),
          notes: item.notes,
          templateId: item.templateId
        }))
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "QUARANTINE_CASE_CREATE",
      entity: "QuarantineCase",
      entityId: created.id,
      after: { birdId: created.birdId, infirmaryId: created.infirmaryId }
    }
  });

  return created;
}

export async function createInfirmary(
  tenantId: string,
  userId: string | null,
  input: { name: string; notes?: string; status: "ACTIVE" | "INACTIVE" }
) {
  const created = await prisma.infirmary.create({
    data: {
      tenantId,
      name: input.name,
      notes: input.notes,
      status: input.status
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "INFIRMARY_CREATE",
      entity: "Infirmary",
      entityId: created.id,
      after: { name: created.name, status: created.status }
    }
  });

  return created;
}

export async function updateInfirmary(
  tenantId: string,
  userId: string | null,
  id: string,
  input: { name: string; notes?: string; status: "ACTIVE" | "INACTIVE" }
) {
  const existing = await prisma.infirmary.findFirst({ where: { id, tenantId } });
  if (!existing) return null;

  const updated = await prisma.infirmary.update({
    where: { id },
    data: { name: input.name, notes: input.notes, status: input.status }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "INFIRMARY_UPDATE",
      entity: "Infirmary",
      entityId: id,
      before: { name: existing.name, status: existing.status },
      after: { name: updated.name, status: updated.status }
    }
  });

  return updated;
}

export async function deleteInfirmary(tenantId: string, userId: string | null, id: string) {
  const existing = await prisma.infirmary.findFirst({ where: { id, tenantId } });
  if (!existing) return false;

  await prisma.infirmary.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "INFIRMARY_DELETE",
      entity: "Infirmary",
      entityId: id
    }
  });

  return true;
}

export async function createInfirmaryCase(
  tenantId: string,
  userId: string | null,
  input: {
    birdId: string;
    infirmaryId: string;
    openedAt: string;
    diagnosis?: string;
    symptoms?: string;
    medication?: string;
    dosage?: string;
    responsible?: string;
    notes?: string;
  }
) {
  const [bird, infirmary] = await Promise.all([
    prisma.bird.findFirst({ where: { id: input.birdId, tenantId } }),
    prisma.infirmary.findFirst({ where: { id: input.infirmaryId, tenantId } })
  ]);

  if (!bird || !infirmary) return null;

  const created = await prisma.$transaction(async (tx) => {
    const caseItem = await tx.infirmaryCase.create({
      data: {
        tenantId,
        birdId: input.birdId,
        infirmaryId: input.infirmaryId,
        openedAt: toDate(input.openedAt),
        diagnosis: input.diagnosis,
        symptoms: input.symptoms,
        medication: input.medication,
        dosage: input.dosage,
        responsible: input.responsible,
        notes: input.notes,
        status: "TREATING"
      }
    });

    await tx.infirmaryCaseEvent.create({
      data: {
        tenantId,
        caseId: caseItem.id,
        type: "ADMISSION",
        notes: "Entrada na enfermaria"
      }
    });

    if (bird.status !== BirdStatus.SICK) {
      await tx.bird.update({ where: { id: bird.id }, data: { status: BirdStatus.SICK } });
      await tx.birdStatusHistory.create({
        data: {
          tenantId,
          birdId: bird.id,
          fromStatus: bird.status,
          toStatus: BirdStatus.SICK,
          reason: "Entrada na enfermaria"
        }
      });
    }

    return caseItem;
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "INFIRMARY_CASE_CREATE",
      entity: "InfirmaryCase",
      entityId: created.id,
      after: { status: created.status, birdId: created.birdId }
    }
  });

  return created;
}

export async function updateInfirmaryCase(
  tenantId: string,
  userId: string | null,
  id: string,
  input: {
    birdId: string;
    infirmaryId: string;
    openedAt: string;
    diagnosis?: string;
    symptoms?: string;
    medication?: string;
    dosage?: string;
    responsible?: string;
    notes?: string;
  }
) {
  const existing = await prisma.infirmaryCase.findFirst({ where: { id, tenantId } });
  if (!existing) return null;

  const updated = await prisma.infirmaryCase.update({
    where: { id },
    data: {
      birdId: input.birdId,
      infirmaryId: input.infirmaryId,
      openedAt: toDate(input.openedAt),
      diagnosis: input.diagnosis,
      symptoms: input.symptoms,
      medication: input.medication,
      dosage: input.dosage,
      responsible: input.responsible,
      notes: input.notes
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "INFIRMARY_CASE_UPDATE",
      entity: "InfirmaryCase",
      entityId: id,
      after: { status: updated.status }
    }
  });

  return updated;
}

export async function deleteInfirmaryCase(tenantId: string, userId: string | null, id: string) {
  const existing = await prisma.infirmaryCase.findFirst({ where: { id, tenantId } });
  if (!existing) return false;

  await prisma.infirmaryCase.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "INFIRMARY_CASE_DELETE",
      entity: "InfirmaryCase",
      entityId: id
    }
  });

  return true;
}

export async function applyCaseEvent(
  tenantId: string,
  userId: string | null,
  id: string,
  input: {
    action: "CONTINUE" | "CURE" | "DEATH" | "TRANSFER";
    date: string;
    notes?: string;
    toInfirmaryId?: string;
  }
) {
  const caseItem = await prisma.infirmaryCase.findFirst({
    where: { id, tenantId },
    include: { bird: true }
  });
  if (!caseItem) return { kind: "not_found" as const };

  if (input.action === "TRANSFER" && !input.toInfirmaryId) {
    return { kind: "invalid" as const, message: "Selecione a enfermaria de destino." };
  }

  const result = await prisma.$transaction(async (tx) => {
    if (input.action === "CONTINUE") {
      await tx.infirmaryCaseEvent.create({
        data: {
          tenantId,
          caseId: id,
          type: "CONTINUE",
          notes: input.notes
        }
      });

      return tx.infirmaryCase.findUnique({ where: { id } });
    }

    if (input.action === "TRANSFER") {
      const target = await tx.infirmary.findFirst({ where: { id: input.toInfirmaryId, tenantId } });
      if (!target) return null;

      await tx.infirmaryCase.update({
        where: { id },
        data: {
          infirmaryId: target.id,
          status: InfirmaryCaseStatus.TREATING
        }
      });

      await tx.infirmaryCaseEvent.create({
        data: {
          tenantId,
          caseId: id,
          type: "TRANSFER",
          notes: input.notes,
          fromInfirmaryId: caseItem.infirmaryId,
          toInfirmaryId: target.id
        }
      });

      return tx.infirmaryCase.findUnique({ where: { id } });
    }

    if (input.action === "CURE") {
      await tx.infirmaryCase.update({
        where: { id },
        data: {
          status: InfirmaryCaseStatus.CURED,
          closedAt: toDate(input.date)
        }
      });

      if (caseItem.bird.status !== BirdStatus.ACTIVE) {
        await tx.bird.update({ where: { id: caseItem.bird.id }, data: { status: BirdStatus.ACTIVE } });
        await tx.birdStatusHistory.create({
          data: {
            tenantId,
            birdId: caseItem.bird.id,
            fromStatus: caseItem.bird.status,
            toStatus: BirdStatus.ACTIVE,
            reason: "Alta da enfermaria"
          }
        });
      }

      await tx.infirmaryCaseEvent.create({
        data: {
          tenantId,
          caseId: id,
          type: "CURE",
          notes: input.notes
        }
      });

      return tx.infirmaryCase.findUnique({ where: { id } });
    }

    await tx.infirmaryCase.update({
      where: { id },
      data: {
        status: InfirmaryCaseStatus.DEAD,
        closedAt: toDate(input.date)
      }
    });

    if (caseItem.bird.status !== BirdStatus.DEAD) {
      await tx.bird.update({ where: { id: caseItem.bird.id }, data: { status: BirdStatus.DEAD } });
      await tx.birdStatusHistory.create({
        data: {
          tenantId,
          birdId: caseItem.bird.id,
          fromStatus: caseItem.bird.status,
          toStatus: BirdStatus.DEAD,
          reason: "Óbito em tratamento"
        }
      });
    }

    await tx.infirmaryCaseEvent.create({
      data: {
        tenantId,
        caseId: id,
        type: "DEATH",
        notes: input.notes
      }
    });

    return tx.infirmaryCase.findUnique({ where: { id } });
  });

  if (!result) {
    return { kind: "invalid" as const, message: "Operação inválida para o caso." };
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "INFIRMARY_CASE_EVENT",
      entity: "InfirmaryCase",
      entityId: id,
      after: { action: input.action }
    }
  });

  return { kind: "ok" as const, caseItem: result };
}

export async function listCaseTimeline(tenantId: string, caseId: string) {
  const caseItem = await prisma.infirmaryCase.findFirst({ where: { id: caseId, tenantId }, select: { id: true } });
  if (!caseItem) return null;

  return prisma.infirmaryCaseEvent.findMany({
    where: { tenantId, caseId },
    orderBy: { createdAt: "desc" }
  });
}

export async function getHealthMetrics(tenantId: string) {
  const now = new Date();
  const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  const [allCases, openCases, diagnosisRows, monthlyRows] = await Promise.all([
    prisma.infirmaryCase.findMany({
      where: { tenantId },
      select: { openedAt: true, closedAt: true, status: true }
    }),
    prisma.infirmaryCase.count({
      where: { tenantId, status: InfirmaryCaseStatus.TREATING }
    }),
    prisma.infirmaryCase.findMany({
      where: { tenantId, diagnosis: { not: null } },
      select: { diagnosis: true }
    }),
    prisma.infirmaryCase.findMany({
      where: { tenantId, openedAt: { gte: yearAgo } },
      select: { openedAt: true, status: true, closedAt: true }
    })
  ]);

  const cured = allCases.filter((c) => c.status === InfirmaryCaseStatus.CURED).length;
  const dead = allCases.filter((c) => c.status === InfirmaryCaseStatus.DEAD).length;
  const finalized = cured + dead;

  const recoveryDays = allCases
    .filter((c) => c.status === InfirmaryCaseStatus.CURED && c.closedAt)
    .map((c) => {
      const diff = (c.closedAt!.getTime() - c.openedAt.getTime()) / (1000 * 60 * 60 * 24);
      return diff;
    });

  const avgRecoveryDays =
    recoveryDays.length > 0
      ? Number((recoveryDays.reduce((a, b) => a + b, 0) / recoveryDays.length).toFixed(2))
      : 0;

  const diagnosisCount = new Map<string, number>();
  for (const row of diagnosisRows) {
    const key = row.diagnosis?.trim() || "Não informado";
    diagnosisCount.set(key, (diagnosisCount.get(key) ?? 0) + 1);
  }

  const topDiagnoses = Array.from(diagnosisCount.entries())
    .map(([diagnosis, count]) => ({ diagnosis, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const monthMap = new Map<string, { opened: number; cured: number; dead: number }>();
  for (const row of monthlyRows) {
    const key = `${row.openedAt.getFullYear()}-${String(row.openedAt.getMonth() + 1).padStart(2, "0")}`;
    const current = monthMap.get(key) ?? { opened: 0, cured: 0, dead: 0 };
    current.opened += 1;
    if (row.status === InfirmaryCaseStatus.CURED) current.cured += 1;
    if (row.status === InfirmaryCaseStatus.DEAD) current.dead += 1;
    monthMap.set(key, current);
  }

  const evolution = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, values]) => ({ month, ...values }));

  return {
    summary: {
      inTreatment: openCases,
      cureRate: ratio(cured, finalized),
      mortalityRate: ratio(dead, finalized),
      avgRecoveryDays
    },
    topDiagnoses,
    evolution
  };
}

