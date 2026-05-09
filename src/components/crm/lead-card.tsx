"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Archive, MessageCircle } from "lucide-react";
import type { LeadStage } from "@prisma/client";
import { ChannelIcon } from "@/components/crm/channel-icon";
import { TemperatureBar } from "@/components/crm/temperature-bar";
import { findSubStatus, INTEREST_META, STAGE_META, STAGES_ORDER, STAGES_WITHOUT_TEMPERATURE } from "@/lib/crm/sub-status";
import { TEMPERATURE_EMOJI, TEMPERATURE_STYLES, temperatureFor } from "@/lib/crm/temperature";
import { whatsappLink, type Lead } from "@/components/crm/types";

export function LeadCard({
  lead,
  onOpen,
  onArchive,
  onMoveToStage
}: {
  lead: Lead;
  onOpen: (lead: Lead) => void;
  onArchive: (lead: Lead) => void;
  /** Tap-to-move: usuario abre o popup e escolhe a coluna (mais
   *  amigavel que arrastar no celular). Opcional pra retrocompatibilidade. */
  onMoveToStage?: (lead: Lead, stage: LeadStage) => void;
}) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: "lead", lead }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  };

  const isCompro = lead.stage === "COMPROU";
  const isEspera = lead.stage === "EM_ESPERA";
  const noTemperature = STAGES_WITHOUT_TEMPERATURE.includes(lead.stage);
  const temp = temperatureFor(lead.lastInteractionAt);
  const tempStyles = TEMPERATURE_STYLES[temp];
  const cardBorder = isCompro
    ? "border-yellow-300"
    : isEspera
      ? "border-violet-300"
      : tempStyles.cardBorder;
  const cardBg = isCompro
    ? "bg-gradient-to-br from-amber-50 to-yellow-100/40"
    : isEspera
      ? "bg-violet-50/40"
      : tempStyles.cardBg;

  const subStatus = findSubStatus(lead.stage, lead.subStatus);
  const interestMeta = lead.interestType ? INTEREST_META[lead.interestType] : null;
  const stageMeta = STAGE_META[lead.stage];
  const wapp = whatsappLink(lead.phone, lead.name);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-2xl border ${cardBorder} ${cardBg} p-2.5 shadow-sm hover:shadow-md transition`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none select-none"
      >
        <div className="flex items-start gap-2">
          {/* Avatar = indicador visual: emoji de temperatura na maioria,
              ✨ se Comprou, ⏸️ se Em Espera (parking intencional). */}
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-base shadow-sm"
            title={isCompro ? "Comprou" : isEspera ? "Em espera" : tempStyles.label}
          >
            <span aria-hidden>{isCompro ? "✨" : isEspera ? "⏸️" : TEMPERATURE_EMOJI[temp]}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-zinc-900">{lead.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              <ChannelIcon channel={lead.channel} channelOther={lead.channelOther} />
              {lead.city ? (
                <span className="text-[10px] text-zinc-500">
                  📍 {lead.city}
                  {lead.state ? `/${lead.state}` : ""}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {interestMeta || lead.interestText ? (
          <p className="mt-1.5 truncate text-[11px] text-zinc-700">
            <span aria-hidden>{interestMeta?.emoji ?? "🎯"}</span>{" "}
            <span className="font-medium">Interesse:</span>{" "}
            {lead.interestText || interestMeta?.label || "—"}
          </p>
        ) : null}

        {lead.tags.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {lead.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] font-medium text-violet-700"
              >
                {tag}
              </span>
            ))}
            {lead.tags.length > 3 ? (
              <span className="text-[9px] text-zinc-500">+{lead.tags.length - 3}</span>
            ) : null}
          </div>
        ) : null}

        {subStatus ? (
          <div className={`mt-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${stageMeta.chip}`}>
            {subStatus.emoji} {subStatus.label}
          </div>
        ) : null}

        {isCompro && lead.financialEntry ? (
          <div className="mt-1.5 rounded-md bg-amber-100/60 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
            💰 R$ {Number(lead.financialEntry.amount).toFixed(2)}
          </div>
        ) : null}

        <TemperatureBar lastInteractionAt={lead.lastInteractionAt} hidden={noTemperature} />
      </div>

      {/* Acoes — fora do drag handle */}
      <div className="mt-2 flex gap-1">
        <button
          type="button"
          onClick={() => onOpen(lead)}
          className="flex-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Detalhes
        </button>
        {onMoveToStage ? (
          <button
            type="button"
            onClick={() => setShowMoveMenu((v) => !v)}
            className="inline-flex items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100"
            title="Mover para outra fase"
          >
            ➜
          </button>
        ) : null}
        {wapp ? (
          <a
            href={wapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700 hover:bg-emerald-100"
            title="Abrir WhatsApp"
          >
            <MessageCircle className="h-3 w-3" />
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => onArchive(lead)}
          className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-500 hover:bg-zinc-50"
          title="Arquivar"
        >
          <Archive className="h-3 w-3" />
        </button>
      </div>

      {/* Menu de mover (alternativa ao drag, otima pra mobile).
          Aparece inline abaixo do card com as outras 3 colunas. */}
      {showMoveMenu && onMoveToStage ? (
        <div className="mt-1.5 grid gap-1 rounded-xl border border-indigo-200 bg-indigo-50/60 p-1.5">
          <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
            Mover para:
          </p>
          {STAGES_ORDER.filter((s) => s !== lead.stage).map((s) => {
            const meta = STAGE_META[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onMoveToStage(lead, s);
                  setShowMoveMenu(false);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 text-left text-xs font-medium text-slate-800 shadow-sm hover:bg-indigo-100"
              >
                <span aria-hidden>{meta.emoji}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowMoveMenu(false)}
            className="rounded-lg px-2 py-1 text-[10px] font-semibold text-zinc-500 hover:bg-zinc-100"
          >
            Cancelar
          </button>
        </div>
      ) : null}
    </div>
  );
}
