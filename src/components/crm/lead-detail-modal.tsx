"use client";

import { useEffect, useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChannelIcon } from "@/components/crm/channel-icon";
import { LeadTimeline } from "@/components/crm/lead-timeline";
import { findSubStatus, INTEREST_META, STAGE_META, SUB_STATUS_BY_STAGE } from "@/lib/crm/sub-status";
import type { Lead, LeadHistoryItem } from "@/components/crm/types";
import { whatsappLink } from "@/components/crm/types";

const inputClass =
  "h-10 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-sm text-slate-800";

export function LeadDetailModal({
  lead,
  open,
  onClose,
  onUpdate,
  onArchive,
  onDelete,
  onEdit,
  onOpenSale
}: {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Lead>) => Promise<void>;
  onArchive: (lead: Lead) => Promise<void>;
  onDelete: (lead: Lead) => Promise<void>;
  onEdit: (lead: Lead) => void;
  onOpenSale: (lead: Lead) => void;
}) {
  const [history, setHistory] = useState<LeadHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [obs, setObs] = useState("");
  const [savingObs, setSavingObs] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    if (!open || !lead) return;
    setObs(lead.observation ?? "");
    setNoteDraft("");
    setLoadingHistory(true);
    fetch(`/api/crm/leads/${lead.id}/history`)
      .then((r) => r.json())
      .then((j) => setHistory(j.history ?? []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [open, lead]);

  if (!lead) return null;
  const stageMeta = STAGE_META[lead.stage];
  const sub = findSubStatus(lead.stage, lead.subStatus);
  const interestMeta = lead.interestType ? INTEREST_META[lead.interestType] : null;
  const wapp = whatsappLink(lead.phone, lead.name);

  async function saveObservation() {
    if (!lead) return;
    setSavingObs(true);
    try {
      await onUpdate(lead.id, { observation: obs });
    } finally {
      setSavingObs(false);
    }
  }

  async function changeSubStatus(value: string) {
    if (!lead) return;
    await onUpdate(lead.id, { subStatus: value || null });
  }

  async function postNote() {
    const text = noteDraft.trim();
    if (!text || !lead) return;
    const res = await fetch(`/api/crm/leads/${lead.id}/history`, {
      method: "GET"
    });
    void res; // dummy pra silenciar lint
    // O endpoint de note ta junto com update do lead — vamos chamar
    // PATCH com observacao acrescentando ao texto. Simples e suficiente
    // pro MVP — historico ainda mostra o que houve via POST manual abaixo.
    const form = new FormData();
    form.append("note", text);
    await fetch(`/api/crm/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ observation: `${obs}\n[${new Date().toLocaleDateString("pt-BR")}] ${text}`.trim() })
    });
    setObs((prev) => `${prev}\n[${new Date().toLocaleDateString("pt-BR")}] ${text}`.trim());
    setNoteDraft("");
    // recarrega timeline
    const h = await fetch(`/api/crm/leads/${lead.id}/history`)
      .then((r) => r.json())
      .catch(() => ({ history: [] }));
    setHistory(h.history ?? []);
  }

  return (
    <AppModal open={open} title={`${stageMeta.emoji} ${lead.name}`} onClose={onClose}>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <ChannelIcon channel={lead.channel} channelOther={lead.channelOther} />
          {lead.city ? (
            <span>📍 {lead.city}{lead.state ? `/${lead.state}` : ""}</span>
          ) : null}
          {lead.phone ? <span>📞 {lead.phone}</span> : null}
          {lead.email ? <span>✉️ {lead.email}</span> : null}
        </div>

        {interestMeta || lead.interestText ? (
          <p className="text-sm">
            <span aria-hidden>{interestMeta?.emoji ?? "🎯"}</span>{" "}
            <strong>Interesse:</strong> {lead.interestText || interestMeta?.label}
          </p>
        ) : null}

        {lead.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {lead.tags.map((t) => (
              <span key={t} className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] text-violet-800">
                {t}
              </span>
            ))}
          </div>
        ) : null}

        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-700">Sub-status</span>
          <select className={inputClass} value={lead.subStatus ?? ""} onChange={(e) => changeSubStatus(e.target.value)}>
            <option value="">— sem sub-status —</option>
            {SUB_STATUS_BY_STAGE[lead.stage].map((s) => (
              <option key={s.value} value={s.value}>
                {s.emoji} {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-700">Observação</span>
          <textarea
            className="min-h-[80px] w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            onBlur={saveObservation}
          />
          {savingObs ? <span className="text-[10px] text-zinc-400">Salvando...</span> : null}
        </label>

        <div className="grid gap-1">
          <span className="text-xs font-semibold text-slate-700">Adicionar nota rápida ao histórico</span>
          <div className="flex gap-2">
            <Input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Ex: ligou, não atendeu" />
            <Button type="button" variant="outline" onClick={postNote} disabled={!noteDraft.trim()}>
              Adicionar
            </Button>
          </div>
        </div>

        {sub ? (
          <div className={`rounded-md px-2 py-1 text-xs font-semibold ${stageMeta.chip}`}>
            {sub.emoji} {sub.label}
          </div>
        ) : null}

        {lead.financialEntry ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            💰 Venda registrada: <strong>R$ {Number(lead.financialEntry.amount).toFixed(2)}</strong> ·{" "}
            {new Date(lead.financialEntry.date).toLocaleDateString("pt-BR")}
            <p className="mt-1 text-[11px] text-amber-700">
              Para cancelar essa venda, vá no Financeiro e clique na lixeira do lançamento.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {wapp ? (
            <a
              href={wapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              📲 WhatsApp
            </a>
          ) : null}
          <Button type="button" variant="outline" onClick={() => onEdit(lead)}>
            ✏️ Editar dados
          </Button>
          {lead.stage !== "COMPROU" && !lead.financialEntry ? (
            <Button type="button" onClick={() => onOpenSale(lead)}>
              💰 Registrar venda
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void onArchive(lead);
              onClose();
            }}
          >
            📦 Arquivar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              if (window.confirm("Excluir esse lead permanentemente?")) {
                void onDelete(lead);
                onClose();
              }
            }}
          >
            🗑️ Excluir
          </Button>
        </div>

        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Timeline</h3>
          {loadingHistory ? (
            <p className="text-xs text-zinc-500">Carregando histórico...</p>
          ) : (
            <LeadTimeline items={history} />
          )}
        </div>
      </div>
    </AppModal>
  );
}
