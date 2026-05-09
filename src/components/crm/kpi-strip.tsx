"use client";

import { STAGE_META } from "@/lib/crm/sub-status";
import type { CrmMetrics } from "@/components/crm/types";

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function KpiStrip({ metrics }: { metrics: CrmMetrics | null }) {
  const m = metrics;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
      <Kpi label="Total ativos" value={m ? String(m.totalActive) : "—"} accent="bg-zinc-100 text-zinc-800" />
      <Kpi
        label={`${STAGE_META.NOVO_CONTATO.emoji} Novo`}
        value={m ? String(m.byStage.NOVO_CONTATO) : "—"}
        accent={STAGE_META.NOVO_CONTATO.chip}
      />
      <Kpi
        label={`${STAGE_META.EM_NEGOCIACAO.emoji} Negoc.`}
        value={m ? String(m.byStage.EM_NEGOCIACAO) : "—"}
        accent={STAGE_META.EM_NEGOCIACAO.chip}
      />
      <Kpi
        label={`${STAGE_META.EM_ESPERA.emoji} Espera`}
        value={m ? String(m.byStage.EM_ESPERA) : "—"}
        accent={STAGE_META.EM_ESPERA.chip}
      />
      <Kpi
        label={`${STAGE_META.COMPROU.emoji} Comprou`}
        value={m ? String(m.byStage.COMPROU) : "—"}
        accent={STAGE_META.COMPROU.chip}
      />
      <Kpi
        label="Conversão 30d"
        value={m ? `${m.conversion30d}%` : "—"}
        accent="bg-emerald-50 text-emerald-700"
        hint={m ? `${m.salesCount30d} vendas` : undefined}
      />
      <Kpi
        label="Ticket médio"
        value={m ? formatBRL(m.ticketAverage) : "—"}
        accent="bg-amber-50 text-amber-800"
        hint={m ? formatBRL(m.revenue30d) + " 30d" : undefined}
      />
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
