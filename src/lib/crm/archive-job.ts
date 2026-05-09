import { LeadStage } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// Arquiva todos os leads ativos com lastInteractionAt > 7 dias.
// Cards na coluna COMPROU sao isentos (seguem fluxo proprio de pos-venda).
// Roda 1x por dia via Vercel Cron — endpoint POST /api/cron/archive-cold-leads.
// Retorna stats pra log.
export async function archiveColdLeads(opts?: { dryRun?: boolean }) {
  const eightDaysAgo = new Date();
  eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

  const candidates = await prisma.lead.findMany({
    where: {
      archivedAt: null,
      stage: { not: LeadStage.COMPROU },
      lastInteractionAt: { lt: eightDaysAgo }
    },
    select: { id: true, tenantId: true, name: true, stage: true }
  });

  if (opts?.dryRun) {
    return { archivedCount: 0, candidates: candidates.length, ids: candidates.map((c) => c.id) };
  }

  let archivedCount = 0;
  for (const lead of candidates) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.lead.update({
          where: { id: lead.id },
          data: {
            archivedAt: new Date(),
            archivedReason: "auto_8_days"
          }
        });
        await tx.leadHistory.create({
          data: {
            tenantId: lead.tenantId,
            leadId: lead.id,
            type: "ARCHIVED",
            toValue: "auto_8_days",
            notes: "Arquivamento automatico (8+ dias sem interacao)"
          }
        });
      });
      archivedCount += 1;
    } catch (err) {
      console.error("[crm.archive-job] failed lead", lead.id, err);
    }
  }

  return { archivedCount, candidates: candidates.length };
}
