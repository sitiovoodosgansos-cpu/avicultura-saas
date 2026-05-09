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

  // Sensors snappy: ativa o drag em 4px no mouse / 150ms no touch.
  // O comportamento de "swipe direcional" abaixo (handleDragEnd) joga
  // o card pra coluna vizinha mesmo se o usuario nao soltar exatamente
  // sobre ela, basta arrastar uns 50px na direcao certa.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  // Distancia minima de drag horizontal pra disparar swipe direcional
  // (em px). Bem curta — meio movimento e ja move pra coluna vizinha.
  // CAP: drag SEMPRE move 1 coluna no maximo por vez. Distancias
  // maiores nao pulam multiplas colunas (evita "cair" longe demais
  // sem perceber). Quer mover mais? Arrasta de novo.
  const SWIPE_THRESHOLD = 50;

  const grouped = useMemo(() => {
    const map: Record<LeadStage, Lead[]> = {
      NOVO_CONTATO: [],
      EM_NEGOCIACAO: [],
      EM_ESPERA: [],
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
    const { active, over, delta } = event;

    const activeData = active.data.current as { type?: string; lead?: Lead } | undefined;
    if (!activeData?.lead) return;
    const lead = activeData.lead;

    let toStage: LeadStage | null = null;
    let toPosition: number | null = null;

    // 1) Drop direto sobre coluna ou card: usa o alvo
    const overData = over?.data.current as { type?: string; stage?: LeadStage; lead?: Lead } | undefined;
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

    // 2) Swipe direcional: se nao caiu em alvo OU caiu na mesma coluna,
    //    usa o delta horizontal pra mandar pra coluna VIZINHA (1 unica).
    //    Drags longos NAO pulam multiplas colunas — evita cair longe
    //    demais sem perceber. Pra mover varias colunas, repita o swipe.
    const noUsefulDrop = toStage === null || toStage === lead.stage;
    if (noUsefulDrop && Math.abs(delta.x) > SWIPE_THRESHOLD) {
      const dir = delta.x > 0 ? 1 : -1;
      const currentIdx = STAGES_ORDER.indexOf(lead.stage);
      const targetIdx = Math.min(STAGES_ORDER.length - 1, Math.max(0, currentIdx + dir));
      if (targetIdx !== currentIdx) {
        toStage = STAGES_ORDER[targetIdx];
        const list = grouped[toStage];
        const last = list[list.length - 1];
        toPosition = (last?.position ?? 0) + 1024;
      }
    }

    if (toStage === null || toPosition === null) return;
    if (lead.stage === toStage && Math.abs(lead.position - toPosition) < 0.001) return;

    await onMove(lead.id, toStage, toPosition);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      // autoScroll mais lento — antes "passava pelas colunas" rapido
      // demais quando o usuario chegava perto da borda no mobile.
      // acceleration baixo + threshold maior = scroll suave e controlado.
      autoScroll={{
        threshold: { x: 0.15, y: 0.1 },
        acceleration: 4,
        interval: 16
      }}
    >
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
