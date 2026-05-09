"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChannelIcon } from "@/components/crm/channel-icon";
import { CHANNEL_META, STAGE_META } from "@/lib/crm/sub-status";
import type { Lead } from "@/components/crm/types";

const inputClass =
  "h-10 rounded-xl border border-[color:var(--line)] bg-white px-3 text-sm text-slate-800";

export function ArchiveTab({ onChange }: { onChange?: () => void }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasonFilter, setReasonFilter] = useState<string>("");
  const [channelFilter, setChannelFilter] = useState<string>("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/leads?archived=true");
      const json = (await res.json()) as { leads: Lead[] };
      setLeads(json.leads ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function restore(id: string) {
    await fetch(`/api/crm/leads/${id}/archive`, { method: "PATCH" });
    await load();
    onChange?.();
  }

  async function remove(id: string) {
    if (!window.confirm("Excluir esse lead permanentemente?")) return;
    await fetch(`/api/crm/leads/${id}`, { method: "DELETE" });
    await load();
    onChange?.();
  }

  const filtered = leads.filter((l) => {
    if (reasonFilter && l.archivedReason !== reasonFilter) return false;
    if (channelFilter && l.channel !== channelFilter) return false;
    return true;
  });

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-white p-2">
        <select className={inputClass} value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)}>
          <option value="">Todos os motivos</option>
          <option value="auto_8_days">Auto (8+ dias parado)</option>
          <option value="manual">Arquivado manualmente</option>
          <option value="venda_concluida">Venda concluída</option>
        </select>
        <select className={inputClass} value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
          <option value="">Todos os canais</option>
          {Object.entries(CHANNEL_META).map(([k, m]) => (
            <option key={k} value={k}>
              {m.emoji} {m.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Carregando arquivados...</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-3 py-6 text-center text-sm text-zinc-500">
          Nenhum lead arquivado nesse filtro.
        </p>
      ) : (
        <ul className="grid gap-2">
          {filtered.map((l) => {
            const stage = STAGE_META[l.stage];
            return (
              <li key={l.id} className="rounded-2xl border border-zinc-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {stage.emoji} {l.name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <ChannelIcon channel={l.channel} channelOther={l.channelOther} />
                      {l.city ? <span>📍 {l.city}{l.state ? `/${l.state}` : ""}</span> : null}
                      <span>arquivado {l.archivedAt ? new Date(l.archivedAt).toLocaleDateString("pt-BR") : ""}</span>
                      {l.archivedReason ? <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px]">{l.archivedReason}</span> : null}
                    </div>
                    {l.observation ? <p className="mt-1 text-xs text-slate-600">{l.observation}</p> : null}
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" variant="outline" onClick={() => restore(l.id)}>
                      ↩️ Voltar pro Kanban
                    </Button>
                    <Button type="button" variant="danger" onClick={() => remove(l.id)}>
                      🗑️
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
