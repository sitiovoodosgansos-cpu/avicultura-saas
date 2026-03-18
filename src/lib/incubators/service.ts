import { prisma } from "@/lib/db/prisma";

function ratio(num: number, den: number) {
  if (!den) return 0;
  return Number(((num / den) * 100).toFixed(2));
}

function toDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

export async function listIncubatorContext(tenantId: string) {
  const [incubators, batches, flockGroups] = await Promise.all([
    prisma.incubator.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.incubatorBatch.findMany({
      where: { tenantId },
      include: {
        incubator: { select: { id: true, name: true, status: true } },
        flockGroup: { select: { id: true, title: true } },
        events: { orderBy: { eventDate: "desc" } }
      },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }]
    }),
    prisma.flockGroup.findMany({
      where: { tenantId },
      select: { id: true, title: true },
      orderBy: { title: "asc" }
    })
  ]);

  const enrichedBatches = batches.map((batch) => {
    const hatched = batch.events.filter((e) => e.type === "HATCHED").reduce((s, e) => s + e.quantity, 0);
    const infertile = batch.events.filter((e) => e.type === "INFERTILE").reduce((s, e) => s + e.quantity, 0);
    const embryoLoss = batch.events.filter((e) => e.type === "EMBRYO_LOSS").reduce((s, e) => s + e.quantity, 0);
    const pippedDied = batch.events.filter((e) => e.type === "PIPPED_DIED").reduce((s, e) => s + e.quantity, 0);
    const inProgress = Math.max(batch.eggsSet - (hatched + infertile + embryoLoss + pippedDied), 0);

    return {
      ...batch,
      stats: {
        hatched,
        infertile,
        embryoLoss,
        pippedDied,
        inProgress,
        hatchRate: ratio(hatched, batch.eggsSet),
        infertilityRate: ratio(infertile, batch.eggsSet),
        embryoLossRate: ratio(embryoLoss, batch.eggsSet),
        pippedDiedRate: ratio(pippedDied, batch.eggsSet)
      }
    };
  });

  return {
    incubators,
    batches: enrichedBatches,
    flockGroups
  };
}

export async function createIncubator(
  tenantId: string,
  userId: string,
  input: { name: string; description?: string; notes?: string; status: "ACTIVE" | "INACTIVE" | "MAINTENANCE" }
) {
  const created = await prisma.incubator.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description,
      notes: input.notes,
      status: input.status
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "INCUBATOR_CREATE",
      entity: "Incubator",
      entityId: created.id,
      after: { name: created.name, status: created.status }
    }
  });

  return created;
}

export async function updateIncubator(
  tenantId: string,
  userId: string,
  id: string,
  input: { name: string; description?: string; notes?: string; status: "ACTIVE" | "INACTIVE" | "MAINTENANCE" }
) {
  const existing = await prisma.incubator.findFirst({ where: { id, tenantId } });
  if (!existing) return null;

  const updated = await prisma.incubator.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      notes: input.notes,
      status: input.status
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "INCUBATOR_UPDATE",
      entity: "Incubator",
      entityId: id,
      before: { name: existing.name, status: existing.status },
      after: { name: updated.name, status: updated.status }
    }
  });

  return updated;
}

export async function deleteIncubator(tenantId: string, userId: string, id: string) {
  const existing = await prisma.incubator.findFirst({ where: { id, tenantId } });
  if (!existing) return false;

  await prisma.incubator.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "INCUBATOR_DELETE",
      entity: "Incubator",
      entityId: id
    }
  });

  return true;
}

export async function createBatch(
  tenantId: string,
  userId: string,
  input: {
    incubatorId: string;
    flockGroupId: string;
    entryDate: string;
    eggsSet: number;
    expectedHatchDate?: string;
    notes?: string;
    status: "ACTIVE" | "HATCHED" | "FAILED" | "CANCELED";
  }
) {
  const [incubator, group] = await Promise.all([
    prisma.incubator.findFirst({ where: { id: input.incubatorId, tenantId }, select: { id: true } }),
    prisma.flockGroup.findFirst({ where: { id: input.flockGroupId, tenantId }, select: { id: true } })
  ]);

  if (!incubator || !group) return null;

  const created = await prisma.incubatorBatch.create({
    data: {
      tenantId,
      incubatorId: input.incubatorId,
      flockGroupId: input.flockGroupId,
      entryDate: toDate(input.entryDate),
      eggsSet: input.eggsSet,
      expectedHatchDate: input.expectedHatchDate ? toDate(input.expectedHatchDate) : null,
      notes: input.notes,
      status: input.status,
      events: {
        create: {
          tenantId,
          type: "IN_PROGRESS",
          quantity: input.eggsSet,
          eventDate: toDate(input.entryDate),
          notes: "Lote iniciado"
        }
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "BATCH_CREATE",
      entity: "IncubatorBatch",
      entityId: created.id,
      after: { eggsSet: created.eggsSet, status: created.status }
    }
  });

  return created;
}

export async function updateBatch(
  tenantId: string,
  userId: string,
  id: string,
  input: {
    incubatorId: string;
    flockGroupId: string;
    entryDate: string;
    eggsSet: number;
    expectedHatchDate?: string;
    notes?: string;
    status: "ACTIVE" | "HATCHED" | "FAILED" | "CANCELED";
  }
) {
  const existing = await prisma.incubatorBatch.findFirst({ where: { id, tenantId } });
  if (!existing) return null;

  const updated = await prisma.incubatorBatch.update({
    where: { id },
    data: {
      incubatorId: input.incubatorId,
      flockGroupId: input.flockGroupId,
      entryDate: toDate(input.entryDate),
      eggsSet: input.eggsSet,
      expectedHatchDate: input.expectedHatchDate ? toDate(input.expectedHatchDate) : null,
      notes: input.notes,
      status: input.status
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "BATCH_UPDATE",
      entity: "IncubatorBatch",
      entityId: id,
      before: { eggsSet: existing.eggsSet, status: existing.status },
      after: { eggsSet: updated.eggsSet, status: updated.status }
    }
  });

  return updated;
}

export async function deleteBatch(tenantId: string, userId: string, id: string) {
  const existing = await prisma.incubatorBatch.findFirst({ where: { id, tenantId } });
  if (!existing) return false;

  await prisma.incubatorBatch.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "BATCH_DELETE",
      entity: "IncubatorBatch",
      entityId: id
    }
  });

  return true;
}

export async function addBatchEvent(
  tenantId: string,
  userId: string,
  batchId: string,
  input: {
    type: "HATCHED" | "INFERTILE" | "EMBRYO_LOSS" | "PIPPED_DIED" | "IN_PROGRESS" | "OTHER";
    quantity: number;
    eventDate: string;
    notes?: string;
  }
) {
  const batch = await prisma.incubatorBatch.findFirst({ where: { id: batchId, tenantId } });
  if (!batch) return null;

  const created = await prisma.incubatorBatchEvent.create({
    data: {
      tenantId,
      batchId,
      type: input.type,
      quantity: input.quantity,
      eventDate: toDate(input.eventDate),
      notes: input.notes
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "BATCH_EVENT_CREATE",
      entity: "IncubatorBatchEvent",
      entityId: created.id,
      after: { type: created.type, quantity: created.quantity }
    }
  });

  return created;
}

export async function getIncubatorMetrics(tenantId: string) {
  const now = new Date();
  const from30 = new Date(now);
  from30.setDate(now.getDate() - 29);

  const [incubators, batches, events30] = await Promise.all([
    prisma.incubator.findMany({ where: { tenantId } }),
    prisma.incubatorBatch.findMany({
      where: { tenantId },
      include: {
        incubator: { select: { id: true, name: true, status: true } },
        events: true
      }
    }),
    prisma.incubatorBatchEvent.findMany({
      where: { tenantId, eventDate: { gte: from30 } },
      include: { batch: { select: { incubatorId: true } } }
    })
  ]);

  const summary = {
    activeIncubators: incubators.filter((i) => i.status === "ACTIVE").length,
    activeBatches: batches.filter((b) => b.status === "ACTIVE").length,
    finalizedBatches: batches.filter((b) => b.status !== "ACTIVE").length,
    hatchRate: 0,
    infertilityRate: 0,
    embryoLossRate: 0,
    pippedDiedRate: 0
  };

  let eggsSetTotal = 0;
  let hatchedTotal = 0;
  let infertileTotal = 0;
  let embryoLossTotal = 0;
  let pippedDiedTotal = 0;

  for (const batch of batches) {
    eggsSetTotal += batch.eggsSet;
    hatchedTotal += batch.events.filter((e) => e.type === "HATCHED").reduce((s, e) => s + e.quantity, 0);
    infertileTotal += batch.events.filter((e) => e.type === "INFERTILE").reduce((s, e) => s + e.quantity, 0);
    embryoLossTotal += batch.events.filter((e) => e.type === "EMBRYO_LOSS").reduce((s, e) => s + e.quantity, 0);
    pippedDiedTotal += batch.events.filter((e) => e.type === "PIPPED_DIED").reduce((s, e) => s + e.quantity, 0);
  }

  summary.hatchRate = ratio(hatchedTotal, eggsSetTotal);
  summary.infertilityRate = ratio(infertileTotal, eggsSetTotal);
  summary.embryoLossRate = ratio(embryoLossTotal, eggsSetTotal);
  summary.pippedDiedRate = ratio(pippedDiedTotal, eggsSetTotal);

  const byIncubator = new Map<string, { label: string; eggsSet: number; hatched: number; infertile: number }>();
  for (const batch of batches) {
    const key = batch.incubator.id;
    const current = byIncubator.get(key) ?? {
      label: batch.incubator.name,
      eggsSet: 0,
      hatched: 0,
      infertile: 0
    };

    current.eggsSet += batch.eggsSet;
    current.hatched += batch.events.filter((e) => e.type === "HATCHED").reduce((s, e) => s + e.quantity, 0);
    current.infertile += batch.events.filter((e) => e.type === "INFERTILE").reduce((s, e) => s + e.quantity, 0);
    byIncubator.set(key, current);
  }

  const performanceByIncubator = Array.from(byIncubator.values()).map((item) => ({
    label: item.label,
    hatchRate: ratio(item.hatched, item.eggsSet),
    infertilityRate: ratio(item.infertile, item.eggsSet)
  }));

  const eventsByDay = new Map<string, { hatched: number; infertile: number }>();
  for (const event of events30) {
    const key = `${event.eventDate.getFullYear()}-${String(event.eventDate.getMonth() + 1).padStart(2, "0")}-${String(event.eventDate.getDate()).padStart(2, "0")}`;
    const current = eventsByDay.get(key) ?? { hatched: 0, infertile: 0 };
    if (event.type === "HATCHED") current.hatched += event.quantity;
    if (event.type === "INFERTILE") current.infertile += event.quantity;
    eventsByDay.set(key, current);
  }

  const periodSeries = Array.from(eventsByDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, item]) => ({ date, ...item }));

  return { summary, performanceByIncubator, periodSeries };
}
