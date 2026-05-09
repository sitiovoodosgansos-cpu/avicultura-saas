"use client";

import { useEffect, useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CHANNEL_META, INTEREST_META } from "@/lib/crm/sub-status";
import type { Lead } from "@/components/crm/types";

const inputClass =
  "h-10 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-sm text-slate-800 outline-none focus:ring-4 focus:ring-[color:var(--brand)]/20";

export type LeadFormValues = {
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  channel: string;
  channelOther: string;
  interestType: string;
  interestText: string;
  observation: string;
  tags: string[];
};

const TAG_SUGGESTIONS = [
  "Primeira compra",
  "Recorrente",
  "VIP",
  "Atacado",
  "Pediu desconto",
  "Tem espaço pronto",
  "Iniciante"
];

function emptyForm(): LeadFormValues {
  return {
    name: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    channel: "WHATSAPP",
    channelOther: "",
    interestType: "",
    interestText: "",
    observation: "",
    tags: []
  };
}

function fromLead(l: Lead): LeadFormValues {
  return {
    name: l.name,
    phone: l.phone ?? "",
    email: l.email ?? "",
    city: l.city ?? "",
    state: l.state ?? "",
    channel: l.channel,
    channelOther: l.channelOther ?? "",
    interestType: l.interestType ?? "",
    interestText: l.interestText ?? "",
    observation: l.observation ?? "",
    tags: l.tags ?? []
  };
}

export function LeadFormModal({
  open,
  editing,
  onClose,
  onSubmit,
  error
}: {
  open: boolean;
  editing: Lead | null;
  onClose: () => void;
  onSubmit: (values: LeadFormValues, id?: string) => Promise<void>;
  error: string | null;
}) {
  const [values, setValues] = useState<LeadFormValues>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [dedupeAlert, setDedupeAlert] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setValues(editing ? fromLead(editing) : emptyForm());
    setTagDraft("");
    setDedupeAlert(null);
  }, [open, editing]);

  function patch(p: Partial<LeadFormValues>) {
    setValues((prev) => ({ ...prev, ...p }));
  }

  async function checkDedupe(phone: string) {
    if (!phone || editing) return;
    try {
      const res = await fetch("/api/crm/leads/dedupe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      if (!res.ok) return;
      const json = (await res.json()) as { existing: { id: string; name: string } | null };
      setDedupeAlert(json.existing);
    } catch {
      // silencioso — dedupe é só um aviso
    }
  }

  function addTag(t: string) {
    const tag = t.trim();
    if (!tag || values.tags.includes(tag)) return;
    patch({ tags: [...values.tags, tag] });
    setTagDraft("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(values, editing?.id);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppModal open={open} title={editing ? "Editar lead" : "Novo lead"} onClose={onClose} error={error}>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-slate-700">Nome *</span>
            <Input value={values.name} onChange={(e) => patch({ name: e.target.value })} required minLength={2} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-slate-700">Telefone</span>
            <Input
              value={values.phone}
              onChange={(e) => patch({ phone: e.target.value })}
              onBlur={(e) => checkDedupe(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </label>
        </div>

        {dedupeAlert ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Já existe um lead ativo com esse telefone: <strong>{dedupeAlert.name}</strong>. Você pode salvar mesmo assim ou cancelar e abrir o existente.
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-slate-700">E-mail</span>
            <Input type="email" value={values.email} onChange={(e) => patch({ email: e.target.value })} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-slate-700">Cidade</span>
            <Input value={values.city} onChange={(e) => patch({ city: e.target.value })} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-slate-700">UF</span>
            <Input maxLength={2} value={values.state} onChange={(e) => patch({ state: e.target.value.toUpperCase() })} />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-slate-700">Canal de origem</span>
            <select className={inputClass} value={values.channel} onChange={(e) => patch({ channel: e.target.value })}>
              {Object.entries(CHANNEL_META).map(([k, m]) => (
                <option key={k} value={k}>
                  {m.emoji} {m.label}
                </option>
              ))}
            </select>
          </label>
          {values.channel === "OUTRO" ? (
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-700">Especifique o canal</span>
              <Input value={values.channelOther} onChange={(e) => patch({ channelOther: e.target.value })} />
            </label>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-slate-700">Tipo de interesse</span>
            <select
              className={inputClass}
              value={values.interestType}
              onChange={(e) => patch({ interestType: e.target.value })}
            >
              <option value="">—</option>
              {Object.entries(INTEREST_META).map(([k, m]) => (
                <option key={k} value={k}>
                  {m.emoji} {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2 grid gap-1">
            <span className="text-xs font-semibold text-slate-700">Detalhe do interesse</span>
            <Input
              value={values.interestText}
              onChange={(e) => patch({ interestText: e.target.value })}
              placeholder="Ex: Brahma Perdiz Adulta, casal de Pavão Branco..."
            />
          </label>
        </div>

        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-700">Observação</span>
          <textarea
            className="min-h-[80px] w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm text-slate-800"
            value={values.observation}
            onChange={(e) => patch({ observation: e.target.value })}
          />
        </label>

        <div>
          <span className="text-xs font-semibold text-slate-700">Tags</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {values.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800">
                {t}
                <button
                  type="button"
                  className="text-violet-600 hover:text-violet-900"
                  onClick={() => patch({ tags: values.tags.filter((x) => x !== t) })}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(tagDraft);
                }
              }}
              placeholder="Adicionar tag e Enter"
            />
            <Button type="button" variant="outline" onClick={() => addTag(tagDraft)}>
              Adicionar
            </Button>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {TAG_SUGGESTIONS.filter((s) => !values.tags.includes(s)).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addTag(s)}
                className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-50"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting || !values.name.trim()}>
            {submitting ? "Salvando..." : editing ? "Atualizar" : "Criar lead"}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
