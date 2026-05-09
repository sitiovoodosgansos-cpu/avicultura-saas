"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { LeadStage } from "@prisma/client";
import { LeadCard } from "@/components/crm/lead-card";
import { STAGE_META } from "@/lib/crm/sub-status";
import type { Lead } from "@/components/crm/types";

export function KanbanColumn({
  stage,
  leads,
  onOpenLead,
  onArchiveLead,
  onMoveToStage
}: {
  stage: LeadStage;
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
  onArchiveLead: (lead: Lead) => void;
  onMoveToStage?: (lead: Lead, stage: LeadStage) => void;
}) {
  const meta = STAGE_META[stage];
  const { setNodeRef, isOver } = useDroppable({ id: `column-${stage}`, data: { type: "column", stage } });

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full min-h-[60vh] w-72 shrink-0 flex-col rounded-2xl border-2 ${meta.columnAccent} ${isOver ? "ring-2 ring-emerald-400" : ""} p-2 snap-start`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <p className={`text-xs font-bold uppercase tracking-wider`}>
          <span aria-hidden>{meta.emoji}</span> {meta.label}
        </p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.chip}`}>
          {leads.length}
        </span>
      </div>
      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {leads.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-white/60 px-3 py-4 text-center text-[11px] text-zinc-400">
              Arraste cards pra cá
            </p>
          ) : (
            leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onOpen={onOpenLead}
                onArchive={onArchiveLead}
                onMoveToStage={onMoveToStage}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
