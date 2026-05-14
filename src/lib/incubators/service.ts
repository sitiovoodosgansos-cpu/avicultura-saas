import { prisma } from "@/lib/db/prisma";

function ratio(num: number, den: number) {
  if (!den) return 0;
  return Number(((num / den) * 100).toFixed(2));
}

function toDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

// === LOTES (lot codes) ===
// Definicao: 1 lote = todas as batches em (incubatorId + entryDate).
// Multiplos species no mesmo dia / mesma chocadeira compartilham o
// mesmo numero. Marcador armazenado como `[LOT:N]` no campo notes.

const LOT_MARKER_REGEX = /\[LOT:(.+?)\]/i;

function extractLotCode(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const match = notes.match(LOT_MARKER_REGEX);
  return match?.[1]?.trim() || null;
}

function stripLotMetadata(notes: string | null | undefined): string {
  if (!notes) return "";
  return notes.replace(LOT_MARKER_REGEX, "").replace(/\s{2,}/g, " ").trim();
}

function withLotMetadata(notes: string | null | undefined, lotCode: string | null): string {
  const clean = stripLotMetadata(notes);
  if (!lotCode) return clean;
  const marker = `[LOT:${lotCode}]`;
  return clean ? `${clean} ${marker}` : marker;
}

// Chave canonica de agrupamento — entryDate normalizado pra YYYY-MM-DD
// pra que diferencas de hora/timezone nao quebrem o grupo.
function lotGroupKey(incubatorId: string, entryDate: Date): string {
  const iso = entryDate.toISOString().slice(0, 10);
  return `${incubatorId}|${iso}`;
}

/**
 * Resolve o lotCode pra um (incubatorId, entryDate) ESPECIFICO. Se ja
 * existe outro batch nesse grupo com lotCode, reusa. Senao, calcula
 * o proximo sequencial global e retorna.
 */
async function resolveLotCodeForGroup(
  tenantId: string,
  incubatorId: string,
  entryDate: Date
): Promise<string> {
  // Procura batches existentes no mesmo grupo
  const startOfDay = new Date(entryDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(entryDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const sameDayBatches = await prisma.incubatorBatch.findMany({
    where: {
      tenantId,
      incubatorId,
      entryDate: { gte: startOfDay, lte: endOfDay }
    },
    select: { notes: true }
  });

  for (const batch of sameDayBatches) {
    const existing = extractLotCode(batch.notes);
    if (existing) return existing;
  }

  // Nenhum lotCode existente no grupo — gera o proximo sequencial global
  const allBatches = await prisma.incubatorBatch.findMany({
    where: { tenantId },
    select: { notes: true }
  });
  const codes = allBatches
    .map((b) => extractLotCode(b.notes))
    .map((c) => (c ? Number(c) : NaN))
    .filter((v) => Number.isFinite(v) && v > 0) as number[];
  const next = codes.length ? Math.max(...codes) + 1 : 1;
  return String(next);
}

/**
 * Migracao idempotente: agrupa todos os batches do tenant por
 * (incubatorId, entryDate) e garante que cada grupo tem UM unico
 * lotCode compartilhado. Pega o menor codigo existente do grupo
 * (preservando numeracao), ou gera um novo se nenhum tem.
 *
 * Chamado dentro de listIncubatorContext — toda leitura corrige o
 * estado se ainda estiver inconsistente. Custo: 1 SELECT + N UPDATES
 * apenas quando ha inconsistencia (idempotente apos primeira passagem).
 */
async function regroupBatchLots(tenantId: string): Promise<void> {
  const batches = await prisma.incubatorBatch.findMany({
    where: { tenantId },
    select: { id: true, incubatorId: true, entryDate: true, notes: true }
  });
  if (batches.length === 0) return;

  // Agrupa por (incubatorId + yyyy-MM-dd)
  const groups = new Map<
    string,
    Array<{ id: string; notes: string | null; lotCode: string | null }>
  >();
  for (const b of batches) {
    const key = lotGroupKey(b.incubatorId, b.entryDate);
    const arr = groups.get(key) ?? [];
    arr.push({ id: b.id, notes: b.notes, lotCode: extractLotCode(b.notes) });
    groups.set(key, arr);
  }

  // Pra cada grupo, define o canonicCode e atualiza quem nao bate
  const updates: Array<{ id: string; notes: string }> = [];
  const usedCodes = new Set<string>();

  // Primeiro pass: identifica todos os codigos ja em uso pra evitar
  // colisao quando gerar novos
  for (const arr of groups.values()) {
    for (const item of arr) {
      if (item.lotCode) usedCodes.add(item.lotCode);
    }
  }

  // Segundo pass: resolve canonical code de cada grupo
  function nextAvailableCode(): string {
    const numeric = Array.from(usedCodes)
      .map((c) => Number(c))
      .filter((n) => Number.isFinite(n) && n > 0);
    const next = numeric.length ? Math.max(...numeric) + 1 : 1;
    const result = String(next);
    usedCodes.add(result);
    return result;
  }

  for (const arr of groups.values()) {
    const existingCodes = arr
      .map((i) => i.lotCode)
      .filter((c): c is string => c !== null);
    // Canonico: menor codigo numerico existente OR novo se nao ha
    let canonical: string;
    if (existingCodes.length > 0) {
      const sorted = [...existingCodes].sort(
        (a, b) => (Number(a) || 0) - (Number(b) || 0)
      );
      canonical = sorted[0];
    } else {
      canonical = nextAvailableCode();
    }

    // Marca pra atualizar quem nao bate com canonical
    for (const item of arr) {
      if (item.lotCode !== canonical) {
        updates.push({
          id: item.id,
          notes: withLotMetadata(item.notes, canonical)
        });
      }
    }
  }

  if (updates.length === 0) return;

  // Aplica as atualizacoes em transacao pra atomicidade
  await prisma.$transaction(
    updates.map((u) =>
      prisma.incubatorBatch.update({
        where: { id: u.id },
        data: { notes: u.notes }
      })
    )
  );
}

export async function listIncubatorContext(tenantId: string) {
  // Garante consistencia dos lotCode antes de retornar (idempotente).
  // Se algum batch foi criado sem lotCode (ex: via transfer da Prateleira
  // antes desse fix), o agrupamento eh recalculado aqui.
  await regroupBatchLots(tenantId);

  const [incubators, batches, flockGroups] = await Promise.all([
    prisma.incubator.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.incubatorBatch.findMany({
      where: { tenantId },
      include: {
        incubator: { select: { id: true, name: true, status: true } },
        flockGroup: {
          select: {
            id: true,
            title: true,
            species: { select: { id: true, name: true, incubationDays: true } }
          }
        },
        events: { orderBy: { eventDate: "desc" } },
        sources: { orderBy: { collectionDate: "asc" } }
      },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }]
    }),
    prisma.flockGroup.findMany({
      where: {
        tenantId,
        NOT: {
          OR: [
            { title: { startsWith: "Chocada " } },
            { title: { startsWith: "Recria " } }
          ]
        }
      },
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
  userId: string | null,
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
      userId: userId ?? undefined,
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
  userId: string | null,
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
      userId: userId ?? undefined,
      action: "INCUBATOR_UPDATE",
      entity: "Incubator",
      entityId: id,
      before: { name: existing.name, status: existing.status },
      after: { name: updated.name, status: updated.status }
    }
  });

  return updated;
}

export async function deleteIncubator(tenantId: string, userId: string | null, id: string) {
  const existing = await prisma.incubator.findFirst({ where: { id, tenantId } });
  if (!existing) return false;

  await prisma.incubator.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "INCUBATOR_DELETE",
      entity: "Incubator",
      entityId: id
    }
  });

  return true;
}

export async function createBatch(
  tenantId: string,
  userId: string | null,
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

  const entryDateParsed = toDate(input.entryDate);

  // Lote = (incubatorId + entryDate). Reusa lotCode existente se ja
  // tem outro batch no grupo; senao, gera o proximo sequencial.
  // Notes do user passa por stripLotMetadata pra evitar duplicar marker.
  const lotCode = await resolveLotCodeForGroup(
    tenantId,
    input.incubatorId,
    entryDateParsed
  );
  const finalNotes = withLotMetadata(input.notes ?? "", lotCode);

  const created = await prisma.incubatorBatch.create({
    data: {
      tenantId,
      incubatorId: input.incubatorId,
      flockGroupId: input.flockGroupId,
      entryDate: entryDateParsed,
      eggsSet: input.eggsSet,
      expectedHatchDate: input.expectedHatchDate ? toDate(input.expectedHatchDate) : null,
      notes: finalNotes,
      status: input.status,
      events: {
        create: {
          tenantId,
          type: "IN_PROGRESS",
          quantity: input.eggsSet,
          eventDate: entryDateParsed,
          notes: "Lote iniciado"
        }
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
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
  userId: string | null,
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
      userId: userId ?? undefined,
      action: "BATCH_UPDATE",
      entity: "IncubatorBatch",
      entityId: id,
      before: { eggsSet: existing.eggsSet, status: existing.status },
      after: { eggsSet: updated.eggsSet, status: updated.status }
    }
  });

  // Quando o lote acabou de ser finalizado (transição -> HATCHED), criar o
  // listing automaticamente na Vitrine. Lazy import evita ciclo.
  let vitrineAutoListing: Awaited<
    ReturnType<typeof import("@/lib/vitrine/service").createListingsFromHatchedBatch>
  > | null = null;
  if (existing.status !== "HATCHED" && updated.status === "HATCHED") {
    const { createListingsFromHatchedBatch } = await import("@/lib/vitrine/service");
    vitrineAutoListing = await createListingsFromHatchedBatch(tenantId, id);
  }

  return { ...updated, vitrineAutoListing };
}

export async function deleteBatch(tenantId: string, userId: string | null, id: string) {
  const existing = await prisma.incubatorBatch.findFirst({ where: { id, tenantId } });
  if (!existing) return false;

  await prisma.incubatorBatch.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "BATCH_DELETE",
      entity: "IncubatorBatch",
      entityId: id
    }
  });

  return true;
}

const CONSUMING_EVENT_TYPES = ["HATCHED", "INFERTILE", "EMBRYO_LOSS", "PIPPED_DIED"] as const;

export type AddBatchEventResult =
  | { ok: true; event: Awaited<ReturnType<typeof prisma.incubatorBatchEvent.create>> }
  | { ok: false; reason: "NOT_FOUND" | "EXCEEDS_EGGS"; message?: string };

export async function addBatchEvent(
  tenantId: string,
  userId: string | null,
  batchId: string,
  input: {
    type: "HATCHED" | "INFERTILE" | "EMBRYO_LOSS" | "PIPPED_DIED" | "IN_PROGRESS" | "OTHER";
    quantity: number;
    eventDate: string;
    notes?: string;
  }
): Promise<AddBatchEventResult> {
  const batch = await prisma.incubatorBatch.findFirst({ where: { id: batchId, tenantId } });
  if (!batch) return { ok: false, reason: "NOT_FOUND" };

  if ((CONSUMING_EVENT_TYPES as readonly string[]).includes(input.type)) {
    const aggregate = await prisma.incubatorBatchEvent.aggregate({
      _sum: { quantity: true },
      where: { batchId, type: { in: [...CONSUMING_EVENT_TYPES] } }
    });
    const alreadyConsumed = aggregate._sum.quantity ?? 0;
    const remaining = Math.max(0, batch.eggsSet - alreadyConsumed);
    if (input.quantity > remaining) {
      return {
        ok: false,
        reason: "EXCEEDS_EGGS",
        message: `Quantidade excede os ovos disponiveis. Restam ${remaining} de ${batch.eggsSet} ovos para classificar.`
      };
    }
  }

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
      userId: userId ?? undefined,
      action: "BATCH_EVENT_CREATE",
      entity: "IncubatorBatchEvent",
      entityId: created.id,
      after: { type: created.type, quantity: created.quantity }
    }
  });

  return { ok: true, event: created };
}

/**
 * Atualiza data/qty/notes de um evento existente. Reaproveita a checagem
 * de capacidade do batch: a soma de eventos consumidores apos o update
 * nao pode ultrapassar eggsSet (subtrai a qty atual do evento antes de
 * comparar com a nova).
 */
export async function updateBatchEvent(
  tenantId: string,
  userId: string | null,
  eventId: string,
  input: {
    type?: "HATCHED" | "INFERTILE" | "EMBRYO_LOSS" | "PIPPED_DIED" | "IN_PROGRESS" | "OTHER";
    quantity?: number;
    eventDate?: string;
    notes?: string | null;
  }
): Promise<AddBatchEventResult> {
  const existing = await prisma.incubatorBatchEvent.findFirst({
    where: { id: eventId, tenantId },
    include: { batch: { select: { id: true, eggsSet: true } } }
  });
  if (!existing) return { ok: false, reason: "NOT_FOUND" };

  const newType = input.type ?? existing.type;
  const newQuantity = input.quantity ?? existing.quantity;

  // Se o evento atualizado for "consumidor" (consome ovos do batch),
  // valida que a soma total nao excede o batch.eggsSet
  if ((CONSUMING_EVENT_TYPES as readonly string[]).includes(newType)) {
    const aggregate = await prisma.incubatorBatchEvent.aggregate({
      _sum: { quantity: true },
      where: {
        batchId: existing.batchId,
        type: { in: [...CONSUMING_EVENT_TYPES] },
        id: { not: eventId } // exclui o proprio evento sendo editado
      }
    });
    const othersConsumed = aggregate._sum.quantity ?? 0;
    const available = Math.max(0, existing.batch.eggsSet - othersConsumed);
    if (newQuantity > available) {
      return {
        ok: false,
        reason: "EXCEEDS_EGGS",
        message: `Quantidade excede os ovos disponiveis. Restam ${available} de ${existing.batch.eggsSet} ovos para classificar.`
      };
    }
  }

  const updated = await prisma.incubatorBatchEvent.update({
    where: { id: eventId },
    data: {
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.eventDate !== undefined ? { eventDate: toDate(input.eventDate) } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {})
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "BATCH_EVENT_UPDATE",
      entity: "IncubatorBatchEvent",
      entityId: eventId,
      before: {
        type: existing.type,
        quantity: existing.quantity,
        eventDate: existing.eventDate.toISOString()
      },
      after: {
        type: updated.type,
        quantity: updated.quantity,
        eventDate: updated.eventDate.toISOString()
      }
    }
  });

  return { ok: true, event: updated };
}

export async function deleteBatchEvent(
  tenantId: string,
  userId: string | null,
  eventId: string
): Promise<boolean> {
  const existing = await prisma.incubatorBatchEvent.findFirst({
    where: { id: eventId, tenantId }
  });
  if (!existing) return false;

  await prisma.incubatorBatchEvent.delete({ where: { id: eventId } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "BATCH_EVENT_DELETE",
      entity: "IncubatorBatchEvent",
      entityId: eventId,
      before: {
        type: existing.type,
        quantity: existing.quantity,
        eventDate: existing.eventDate.toISOString()
      }
    }
  });

  return true;
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

/**
 * Lista especies do tenant que tem grupos do Plantel ativos (filtra
 * 'Chocada' e 'Recria' que sao estagios transitorios). Retorna o
 * incubationDays cadastrado (ou null = usa fallback hardcoded).
 */
export async function listIncubationSpecies(tenantId: string) {
  const species = await prisma.species.findMany({
    where: {
      tenantId,
      groups: {
        some: {
          NOT: {
            OR: [
              { title: { startsWith: "Chocada " } },
              { title: { startsWith: "Recria " } }
            ]
          }
        }
      }
    },
    select: {
      id: true,
      name: true,
      incubationDays: true,
      _count: { select: { groups: true } }
    },
    orderBy: { name: "asc" }
  });
  return species.map((s) => ({
    id: s.id,
    name: s.name,
    incubationDays: s.incubationDays,
    groupCount: s._count.groups
  }));
}

/**
 * Atualiza incubationDays de uma especie. Aceita null pra restaurar
 * comportamento de fallback (tabela hardcoded por keyword).
 */
export async function updateSpeciesIncubationDays(
  tenantId: string,
  speciesId: string,
  incubationDays: number | null
) {
  const existing = await prisma.species.findFirst({
    where: { id: speciesId, tenantId },
    select: { id: true }
  });
  if (!existing) return null;

  return prisma.species.update({
    where: { id: speciesId },
    data: { incubationDays },
    select: { id: true, name: true, incubationDays: true }
  });
}
