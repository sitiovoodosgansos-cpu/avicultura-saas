import { LeadStage, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type {
  LeadCreateInput,
  LeadUpdateInput,
  LeadMoveInput
} from "@/lib/validators/crm";

// === Helpers ===

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return digits;
}

// Inclui apenas o campo principal — o front busca o history sob demanda.
const LEAD_INCLUDE = {
  financialEntry: { select: { id: true, amount: true, category: true, date: true } }
} satisfies Prisma.LeadInclude;

// === CRUD ===

export async function listLeads(tenantId: string, opts?: { archived?: boolean }) {
  const archivedFilter = opts?.archived
    ? { archivedAt: { not: null } }
    : { archivedAt: null };
  return prisma.lead.findMany({
    where: { tenantId, ...archivedFilter },
    include: LEAD_INCLUDE,
    orderBy: [{ stage: "asc" }, { position: "asc" }, { createdAt: "desc" }]
  });
}

export async function getLead(tenantId: string, id: string) {
  return prisma.lead.findFirst({
    where: { id, tenantId },
    include: LEAD_INCLUDE
  });
}

export async function listLeadHistory(tenantId: string, leadId: string) {
  // Confirma que o lead existe nesse tenant antes de devolver historico.
  const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId }, select: { id: true } });
  if (!lead) return null;
  return prisma.leadHistory.findMany({
    where: { tenantId, leadId },
    orderBy: { createdAt: "desc" }
  });
}

export async function createLead(
  tenantId: string,
  actorUserId: string | null,
  input: LeadCreateInput
) {
  // Pega proximo position dentro do stage (max + 1024 pra dar folga).
  const stage = input.stage ?? "NOVO_CONTATO";
  const last = await prisma.lead.findFirst({
    where: { tenantId, stage, archivedAt: null },
    orderBy: { position: "desc" },
    select: { position: true }
  });
  const position = (last?.position ?? 0) + 1024;

  const created = await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        tenantId,
        name: input.name,
        phone: normalizePhone(input.phone),
        email: input.email?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim().toUpperCase() || null,
        channel: input.channel,
        channelOther: input.channelOther?.trim() || null,
        interestType: input.interestType ?? null,
        interestText: input.interestText?.trim() || null,
        observation: input.observation?.trim() || null,
        tags: input.tags ?? [],
        stage,
        subStatus: input.subStatus?.trim() || null,
        position,
        lastInteractionAt: new Date()
      },
      include: LEAD_INCLUDE
    });
    await tx.leadHistory.create({
      data: {
        tenantId,
        leadId: lead.id,
        type: "STAGE_CHANGE",
        toValue: stage,
        actorUserId,
        notes: "Lead criado"
      }
    });
    return lead;
  });
  return created;
}

export async function updateLead(
  tenantId: string,
  actorUserId: string | null,
  id: string,
  input: LeadUpdateInput
) {
  const existing = await prisma.lead.findFirst({ where: { id, tenantId } });
  if (!existing) return null;

  const data: Prisma.LeadUpdateInput = {
    lastInteractionAt: new Date()
  };
  if (input.name !== undefined) data.name = input.name;
  if (input.phone !== undefined) data.phone = normalizePhone(input.phone);
  if (input.email !== undefined) data.email = input.email?.trim() || null;
  if (input.city !== undefined) data.city = input.city?.trim() || null;
  if (input.state !== undefined) data.state = input.state?.trim().toUpperCase() || null;
  if (input.channel !== undefined) data.channel = input.channel;
  if (input.channelOther !== undefined) data.channelOther = input.channelOther?.trim() || null;
  if (input.interestType !== undefined) data.interestType = input.interestType;
  if (input.interestText !== undefined) data.interestText = input.interestText?.trim() || null;
  if (input.observation !== undefined) data.observation = input.observation?.trim() || null;
  if (input.tags !== undefined) data.tags = input.tags;
  if (input.subStatus !== undefined) data.subStatus = input.subStatus?.trim() || null;

  const updated = await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.update({ where: { id }, data, include: LEAD_INCLUDE });
    if (input.subStatus !== undefined && input.subStatus !== existing.subStatus) {
      await tx.leadHistory.create({
        data: {
          tenantId,
          leadId: id,
          type: "SUBSTATUS_CHANGE",
          fromValue: existing.subStatus,
          toValue: input.subStatus,
          actorUserId
        }
      });
    }
    return lead;
  });

  return updated;
}

export async function moveLead(
  tenantId: string,
  actorUserId: string | null,
  id: string,
  input: LeadMoveInput
) {
  const existing = await prisma.lead.findFirst({ where: { id, tenantId } });
  if (!existing) return null;

  const stageChanged = existing.stage !== input.stage;

  const updated = await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.update({
      where: { id },
      data: {
        stage: input.stage,
        position: input.position,
        subStatus: input.subStatus !== undefined ? input.subStatus : existing.subStatus,
        lastInteractionAt: new Date()
      },
      include: LEAD_INCLUDE
    });
    if (stageChanged) {
      await tx.leadHistory.create({
        data: {
          tenantId,
          leadId: id,
          type: "STAGE_CHANGE",
          fromValue: existing.stage,
          toValue: input.stage,
          actorUserId
        }
      });
    }
    return lead;
  });

  return updated;
}

export async function archiveLead(
  tenantId: string,
  actorUserId: string | null,
  id: string,
  reason: string = "manual"
) {
  const existing = await prisma.lead.findFirst({ where: { id, tenantId } });
  if (!existing) return null;
  if (existing.archivedAt) return existing;

  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        archivedReason: reason,
        lastInteractionAt: new Date()
      },
      include: LEAD_INCLUDE
    });
    await tx.leadHistory.create({
      data: { tenantId, leadId: id, type: "ARCHIVED", toValue: reason, actorUserId }
    });
    return lead;
  });
}

export async function restoreLead(
  tenantId: string,
  actorUserId: string | null,
  id: string
) {
  const existing = await prisma.lead.findFirst({ where: { id, tenantId } });
  if (!existing) return null;
  if (!existing.archivedAt) return existing;

  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.update({
      where: { id },
      data: {
        archivedAt: null,
        archivedReason: null,
        lastInteractionAt: new Date()
      },
      include: LEAD_INCLUDE
    });
    await tx.leadHistory.create({
      data: { tenantId, leadId: id, type: "RESTORED", actorUserId }
    });
    return lead;
  });
}

export async function deleteLead(tenantId: string, id: string) {
  const existing = await prisma.lead.findFirst({ where: { id, tenantId } });
  if (!existing) return false;
  await prisma.lead.delete({ where: { id } });
  return true;
}

// Adiciona uma observacao livre no historico (sem mexer no observation
// principal do card — o usuario pode usar pra "anotar uma ligacao etc").
export async function addLeadNote(
  tenantId: string,
  actorUserId: string | null,
  id: string,
  notes: string
) {
  const existing = await prisma.lead.findFirst({ where: { id, tenantId } });
  if (!existing) return null;
  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id },
      data: { lastInteractionAt: new Date() }
    });
    await tx.leadHistory.create({
      data: { tenantId, leadId: id, type: "NOTE", notes, actorUserId }
    });
  });
  return prisma.lead.findFirst({ where: { id }, include: LEAD_INCLUDE });
}

// === Dedupe por telefone ===
export async function findActiveByPhone(tenantId: string, phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return prisma.lead.findFirst({
    where: {
      tenantId,
      phone: normalized,
      archivedAt: null,
      stage: { not: LeadStage.DESISTIU }
    },
    select: { id: true, name: true, stage: true, channel: true }
  });
}

// === Metrics pra KPI strip ===
export async function getCrmMetrics(tenantId: string) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const days30 = new Date(now);
  days30.setDate(days30.getDate() - 30);

  const [byStage, last30Sales, archivedTotalCount, newToday, newLast30] = await Promise.all([
    prisma.lead.groupBy({
      by: ["stage"],
      where: { tenantId, archivedAt: null },
      _count: { _all: true }
    }),
    // Vendas concluidas nos ultimos 30 dias (lead Comprou + tem entrada financeira)
    prisma.lead.findMany({
      where: {
        tenantId,
        stage: LeadStage.COMPROU,
        financialEntryId: { not: null },
        updatedAt: { gte: days30 }
      },
      select: {
        financialEntry: { select: { amount: true } }
      }
    }),
    // Total geral de arquivados (pra badge da aba)
    prisma.lead.count({ where: { tenantId, archivedAt: { not: null } } }),
    // Novos clientes hoje
    prisma.lead.count({ where: { tenantId, createdAt: { gte: startOfToday } } }),
    // Novos clientes nos ultimos 30 dias (pra calcular media diaria)
    prisma.lead.count({ where: { tenantId, createdAt: { gte: days30 } } })
  ]);

  const byStageMap = Object.fromEntries(byStage.map((s) => [s.stage, s._count._all]));
  const totalActive = Object.values(byStageMap).reduce((s: number, v) => s + (Number(v) || 0), 0);

  // Conversao 30d: COMPROU 30d / (COMPROU 30d + ARQUIVADOS 30d).
  // O "lost" eh o lead arquivado (auto pelo cron, manual, ou virou desistiu
  // e foi pra arquivado). DESISTIU sem arquivar ainda nao conta — eh um
  // estado intermediario no kanban que ainda tem chance de voltar.
  const archivedLast30 = await prisma.lead.count({
    where: { tenantId, archivedAt: { gte: days30 } }
  });
  const won = last30Sales.length;
  const lost = archivedLast30;
  const conversion30d = won + lost === 0 ? 0 : Number(((won / (won + lost)) * 100).toFixed(1));

  // Ticket medio
  const totalRevenue = last30Sales.reduce(
    (sum, l) => sum + (l.financialEntry ? Number(l.financialEntry.amount.toString()) : 0),
    0
  );
  const ticketAverage = last30Sales.length === 0 ? 0 : Number((totalRevenue / last30Sales.length).toFixed(2));

  // Media diaria de novos nos ultimos 30 dias (1 casa decimal pra dar
  // precisao mesmo com poucos leads)
  const newAvgPerDay30d = Number((newLast30 / 30).toFixed(1));

  return {
    totalActive,
    byStage: {
      NOVO_CONTATO: Number(byStageMap.NOVO_CONTATO ?? 0),
      EM_NEGOCIACAO: Number(byStageMap.EM_NEGOCIACAO ?? 0),
      EM_ESPERA: Number(byStageMap.EM_ESPERA ?? 0),
      COMPROU: Number(byStageMap.COMPROU ?? 0),
      DESISTIU: Number(byStageMap.DESISTIU ?? 0)
    },
    conversion30d,
    ticketAverage,
    revenue30d: Number(totalRevenue.toFixed(2)),
    archivedCount: archivedTotalCount,
    salesCount30d: last30Sales.length,
    archivedLast30,
    newToday,
    newLast30,
    newAvgPerDay30d
  };
}

// Vendas concluidas (Lead com stage=COMPROU + financialEntryId set) pra aba Vendas
export async function listClosedSales(tenantId: string) {
  return prisma.lead.findMany({
    where: { tenantId, stage: LeadStage.COMPROU, financialEntryId: { not: null } },
    include: {
      financialEntry: {
        select: { id: true, amount: true, category: true, date: true, customer: true, item: true }
      }
    },
    orderBy: { updatedAt: "desc" }
  });
}

// === Quando deleteEntry() em finance/service.ts apaga um FinancialEntry,
// o Lead linkado tem o financialEntryId nullado por SetNull. Aqui devolvemos
// o card pra EM_NEGOCIACAO + criamos historico SALE_CANCELED.
// Chamada DENTRO da transacao que finance.deleteEntry abre.
export async function revertLeadAfterSaleCancel(
  tx: Prisma.TransactionClient,
  tenantId: string,
  financialEntryId: string
) {
  const lead = await tx.lead.findFirst({
    where: { tenantId, financialEntryId },
    select: { id: true, stage: true }
  });
  if (!lead) return;
  await tx.lead.update({
    where: { id: lead.id },
    data: {
      stage: LeadStage.EM_NEGOCIACAO,
      subStatus: null,
      lastInteractionAt: new Date()
    }
  });
  await tx.leadHistory.create({
    data: {
      tenantId,
      leadId: lead.id,
      type: "SALE_CANCELED",
      fromValue: lead.stage,
      toValue: LeadStage.EM_NEGOCIACAO,
      notes: "Venda cancelada via Financeiro"
    }
  });
}
