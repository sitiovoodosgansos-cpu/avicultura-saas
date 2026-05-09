"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import type { LeadStage } from "@prisma/client";
import { KanbanColumn } from "@/components/crm/kanban-column";
import { LeadCard } from "@/components/crm/lead-card";
import { STAGES_ORDER } from "@/lib/crm/sub-status";
import type { Lead } from "@/components/crm/types";

export function KanbanBoard({
  leads,
  onMove,
  onOpenLead,
  onArchiveLead
}: {
  leads: Lead[];
  /** chamado quando o usuario solta um card numa coluna diferente
   *  OU quando escolhe "Mover" no menu do card (alternativa mobile-friendly) */
  onMove: (leadId: string, toStage: LeadStage, position: number) => Promise<void> | void;
  onOpenLead: (lead: Lead) => void;
  onArchiveLead: (lead: Lead) => void;
}) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  // Sensors: PointerSensor com threshold pra desktop, TouchSensor com
  // delay de 200ms pra nao conflitar com scroll vertical no mobile.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const grouped = useMemo(() => {
    const map: Record<LeadStage, Lead[]> = {
      NOVO_CONTATO: [],
      EM_NEGOCIACAO: [],
      COMPROU: [],
      DESISTIU: []
    };
    for (const l of leads) map[l.stage].push(l);
    for (const stage of STAGES_ORDER) map[stage].sort((a, b) => a.position - b.position);
    return map;
  }, [leads]);

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { type?: string; lead?: Lead } | undefined;
    if (data?.type === "lead" && data.lead) setActiveLead(data.lead);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as { type?: string; lead?: Lead } | undefined;
    const overData = over.data.current as { type?: string; stage?: LeadStage; lead?: Lead } | undefined;
    if (!activeData?.lead) return;

    const lead = activeData.lead;

    // Determinar coluna alvo: se solta sobre coluna usa stage, se solta
    // sobre outro card usa o stage do card.
    let toStage: LeadStage | null = null;
    let toPosition: number | null = null;

    if (overData?.type === "column" && overData.stage) {
      toStage = overData.stage;
      const list = grouped[toStage];
      const last = list[list.length - 1];
      toPosition = (last?.position ?? 0) + 1024;
    } else if (overData?.type === "lead" && overData.lead) {
      toStage = overData.lead.stage;
      const list = grouped[toStage];
      const idx = list.findIndex((l) => l.id === overData.lead!.id);
      const before = list[idx - 1];
      const target = list[idx];
      if (before) toPosition = (before.position + target.position) / 2;
      else toPosition = (target.position ?? 0) - 1024;
    }

    if (toStage === null || toPosition === null) return;

    // Sem mudancas se mesmo stage e mesma posicao
    if (lead.stage === toStage && Math.abs(lead.position - toPosition) < 0.001) return;

    await onMove(lead.id, toStage, toPosition);
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory md:snap-none">
        {STAGES_ORDER.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            leads={grouped[stage]}
            onOpenLead={onOpenLead}
            onArchiveLead={onArchiveLead}
            onMoveToStage={(lead, toStage) => {
              // Posicao = final da coluna alvo
              const list = grouped[toStage];
              const last = list[list.length - 1];
              const position = (last?.position ?? 0) + 1024;
              void onMove(lead.id, toStage, position);
            }}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead ? (
          <div className="rotate-2 opacity-90">
            <LeadCard lead={activeLead} onOpen={() => {}} onArchive={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
