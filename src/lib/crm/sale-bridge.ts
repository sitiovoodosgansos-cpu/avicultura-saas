import { LeadStage } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createEggSale } from "@/lib/eggs/tray-service";
import { sellListingsBulk } from "@/lib/vitrine/service";
import type { LeadSaleInput } from "@/lib/validators/crm";

// Conecta uma venda registrada via CRM (lead vira COMPROU) ao estoque
// real. Reusa as funcoes existentes pra nao duplicar logica de
// inventario/cascata. Apos criar a venda, atualiza Lead.financialEntryId
// + stage + subStatus + cria historico SALE_RECORDED.
export async function recordSaleFromLead(
  tenantId: string,
  actorUserId: string | null,
  leadId: string,
  input: LeadSaleInput
) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
  if (!lead) return { ok: false as const, status: 404, error: "Lead nao encontrado." };
  if (lead.financialEntryId) {
    return {
      ok: false as const,
      status: 409,
      error: "Esse lead já tem uma venda registrada. Cancele a venda no Financeiro pra registrar outra."
    };
  }

  const customerName = lead.name;
  const noteSuffix = `Lead CRM #${lead.id}`;

  let financialEntryId: string;
  let financialAmount: number;

  // === Path 1: Prateleira (ovos) ===
  if (input.type === "eggs") {
    const result = await createEggSale(tenantId, actorUserId, {
      customer: customerName,
      soldAt: input.soldAt,
      paymentMethod: input.paymentMethod,
      shippingFee: input.shippingFee,
      items: input.items,
      notes: input.notes ? `${input.notes} · ${noteSuffix}` : noteSuffix
    });
    if (!result.ok) {
      return { ok: false as const, status: 400, error: result.message ?? "Falha ao registrar venda." };
    }
    // Pega o financialEntryId pelo EggSale.financialEntryId
    const sale = await prisma.eggSale.findUnique({
      where: { id: result.sale.id },
      select: { financialEntryId: true, totalAmount: true }
    });
    if (!sale?.financialEntryId) {
      return { ok: false as const, status: 500, error: "Erro: venda criada sem entry financeira." };
    }
    financialEntryId = sale.financialEntryId;
    financialAmount = Number(sale.totalAmount.toString());
  }

  // === Path 2: Vitrine (aves) ===
  else if (input.type === "vitrine") {
    try {
      const result = await sellListingsBulk(tenantId, {
        customer: customerName,
        paymentMethod: input.paymentMethod,
        notes: input.notes ? `${input.notes} · ${noteSuffix}` : noteSuffix,
        items: input.items
      });
      financialEntryId = result.financialEntry.id;
      financialAmount = Number(result.totalPrice.toFixed(2));
    } catch (err) {
      return {
        ok: false as const,
        status: 400,
        error: err instanceof Error ? err.message : "Falha ao registrar venda."
      };
    }
  }

  // === Path 3: Avulso — cria so FinancialEntry ===
  else {
    const entry = await prisma.financialEntry.create({
      data: {
        tenantId,
        date: new Date(),
        category: input.category,
        item: input.item,
        amount: input.amount,
        customer: customerName,
        paymentMethod: input.paymentMethod ?? null,
        description: noteSuffix,
        notes: input.notes ?? null
      }
    });
    financialEntryId = entry.id;
    financialAmount = input.amount;

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId ?? undefined,
        action: "FIN_ENTRY_CREATE_FROM_LEAD",
        entity: "FinancialEntry",
        entityId: entry.id,
        after: { amount: input.amount, leadId }
      }
    });
  }

  // === Conecta o lead na venda + move pra COMPROU ===
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.lead.update({
      where: { id: leadId },
      data: {
        stage: LeadStage.COMPROU,
        subStatus: "separar_pedido",
        financialEntryId,
        lastInteractionAt: new Date()
      }
    });
    await tx.leadHistory.create({
      data: {
        tenantId,
        leadId,
        type: "SALE_RECORDED",
        toValue: String(financialAmount),
        notes: `Venda ${input.type} · R$ ${financialAmount.toFixed(2)}`,
        actorUserId
      }
    });
    return next;
  });

  return { ok: true as const, lead: updated, financialEntryId, amount: financialAmount };
}
