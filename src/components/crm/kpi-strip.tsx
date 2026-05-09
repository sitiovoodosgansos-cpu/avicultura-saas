"use client";

import type { LeadStage } from "@prisma/client";
import { STAGE_META } from "@/lib/crm/sub-status";
import type { CrmMetrics } from "@/components/crm/types";

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function KpiStrip({ metrics }: { metrics: CrmMetrics | null }) {
  const m = metrics;
  return (
    <div className="grid gap-2">
      {/* Linha principal: KPIs de negocio */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <Kpi
          label="🆕 Novos hoje"
          value={m ? String(m.newToday) : "—"}
          accent="bg-sky-100 text-sky-800"
          hint={
            m
              ? `média ${m.newAvgPerDay30d.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}/dia (30d)`
              : undefined
          }
        />
        <Kpi label="Total ativos" value={m ? String(m.totalActive) : "—"} accent="bg-zinc-100 text-zinc-800" />
        <Kpi
          label={`${STAGE_META.COMPROU.emoji} Vendas 30d`}
          value={m ? String(m.salesCount30d) : "—"}
          accent={STAGE_META.COMPROU.chip}
          hint={m && m.archivedLast30 > 0 ? `${m.archivedLast30} arquivados 30d` : undefined}
        />
        <Kpi
          label="Conversão 30d"
          value={m ? `${m.conversion30d}%` : "—"}
          accent="bg-emerald-50 text-emerald-700"
          hint="vendidos / (vendidos + arquivados)"
        />
        <Kpi
          label="Ticket médio"
          value={m ? formatBRL(m.ticketAverage) : "—"}
          accent="bg-amber-50 text-amber-800"
          hint={m ? formatBRL(m.revenue30d) + " 30d" : undefined}
        />
      </div>

      {/* Linha secundaria: contagem por fase do funil (compacta) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStage stage="NOVO_CONTATO" value={m?.byStage.NOVO_CONTATO} />
        <MiniStage stage="EM_NEGOCIACAO" value={m?.byStage.EM_NEGOCIACAO} />
        <MiniStage stage="COMPROU" value={m?.byStage.COMPROU} />
        <MiniStage stage="EM_ESPERA" value={m?.byStage.EM_ESPERA} />
      </div>
    </div>
  );
}

function Kpi({ label, value, accent, hint }: { label: string; value: string; accent: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-1 inline-block rounded-lg px-2 py-0.5 text-lg font-bold tabular-nums ${accent}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function MiniStage({ stage, value }: { stage: LeadStage; value: number | undefined }) {
  const meta = STAGE_META[stage];
  return (
    <div className={`flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5`}>
      <span className="text-xs font-medium text-zinc-600">
        {meta.emoji} {meta.label}
      </span>
      <span className={`rounded-md px-1.5 py-0.5 text-sm font-bold tabular-nums ${meta.chip}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}
