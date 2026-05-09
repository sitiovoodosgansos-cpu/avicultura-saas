"use client";

import { findSubStatus, STAGE_META } from "@/lib/crm/sub-status";
import type { LeadHistoryItem } from "@/components/crm/types";
import type { LeadStage } from "@prisma/client";

const TYPE_LABELS: Record<string, string> = {
  STAGE_CHANGE: "Mudou de fase",
  SUBSTATUS_CHANGE: "Mudou status",
  NOTE: "Anotação",
  ARCHIVED: "Arquivado",
  RESTORED: "Restaurado",
  SALE_RECORDED: "Venda registrada",
  SALE_CANCELED: "Venda cancelada"
};

function fmtStageLabel(value: string | null) {
  if (!value) return "—";
  const stage = STAGE_META[value as LeadStage];
  return stage ? `${stage.emoji} ${stage.label}` : value;
}

export function LeadTimeline({ items }: { items: LeadHistoryItem[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-zinc-500">Sem histórico ainda.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const date = new Date(item.createdAt);
        const dateLabel = date.toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        });
        const label = TYPE_LABELS[item.type] ?? item.type;
        let extra: string | null = null;
        if (item.type === "STAGE_CHANGE") {
          extra = `${fmtStageLabel(item.fromValue)} → ${fmtStageLabel(item.toValue)}`;
        } else if (item.type === "SUBSTATUS_CHANGE") {
          // sub-status precisa do stage atual pra resolver o label, mas
          // como soh temos o valor cru, mostra o valor direto.
          extra = `${item.fromValue ?? "—"} → ${item.toValue ?? "—"}`;
        } else if (item.notes) {
          extra = item.notes;
        }
        return (
          <li key={item.id} className="rounded-lg border border-zinc-100 bg-white px-2.5 py-1.5">
            <p className="text-[11px] font-semibold text-zinc-700">
              <span className="text-zinc-400">{dateLabel}</span> · {label}
            </p>
            {extra ? <p className="mt-0.5 text-[11px] text-zinc-600">{extra}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

// Re-export pra que o sub-status helper seja chamado por quem precise
export { findSubStatus };
