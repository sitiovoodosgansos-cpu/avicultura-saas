"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteActionButton } from "@/components/ui/delete-action-button";
import { Input } from "@/components/ui/input";

const inputClass =
  "h-10 w-full rounded-xl border border-[color:var(--line)] bg-white/90 px-3 text-[13px] text-slate-800 outline-none focus:ring-4 focus:ring-[color:var(--brand)]/20 sm:h-11 sm:rounded-2xl sm:px-4 sm:text-sm";

const textareaClass =
  "min-h-20 w-full rounded-2xl border border-[color:var(--line)] bg-white/90 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-[color:var(--brand)]/20 sm:px-4 sm:py-3";

type CatalogKey = "diseases" | "medications" | "vaccines" | "death-reasons";

const CATALOG_META: Record<
  CatalogKey,
  { label: string; emoji: string; addLabel: string; itemLabel: string }
> = {
  diseases: { label: "Doenças", emoji: "🦠", addLabel: "Nova doença", itemLabel: "doença" },
  medications: {
    label: "Medicamentos",
    emoji: "💊",
    addLabel: "Novo medicamento",
    itemLabel: "medicamento"
  },
  vaccines: { label: "Vacinas", emoji: "💉", addLabel: "Nova vacina", itemLabel: "vacina" },
  "death-reasons": {
    label: "Motivos de óbito",
    emoji: "⚰️",
    addLabel: "Novo motivo",
    itemLabel: "motivo"
  }
};

type AnyItem = {
  id: string;
  name: string;
  description?: string | null;
  symptoms?: string | null;
  defaultTreatment?: string | null;
  defaultDosage?: string | null;
  route?: string | null;
  recommendedAgeMonths?: number | null;
  intervalMonths?: number | null;
  notes?: string | null;
};

type FormState = Record<string, string>;

function endpointFor(catalog: CatalogKey, id?: string) {
  const base = `/api/health/catalogs/${catalog}`;
  return id ? `${base}/${id}` : base;
}

function payloadFor(catalog: CatalogKey, form: FormState) {
  switch (catalog) {
    case "diseases":
      return {
        name: form.name,
        description: form.description || null,
        symptoms: form.symptoms || null,
        defaultTreatment: form.defaultTreatment || null
      };
    case "medications":
      return {
        name: form.name,
        defaultDosage: form.defaultDosage || null,
        route: form.route || null,
        notes: form.notes || null
      };
    case "vaccines":
      return {
        name: form.name,
        recommendedAgeMonths: form.recommendedAgeMonths
          ? Number(form.recommendedAgeMonths)
          : null,
        intervalMonths: form.intervalMonths ? Number(form.intervalMonths) : null,
        notes: form.notes || null
      };
    case "death-reasons":
      return {
        name: form.name,
        notes: form.notes || null
      };
  }
}

function formFromItem(catalog: CatalogKey, item: AnyItem | null): FormState {
  if (!item) {
    return { name: "", description: "", symptoms: "", defaultTreatment: "", notes: "" };
  }
  switch (catalog) {
    case "diseases":
      return {
        name: item.name ?? "",
        description: item.description ?? "",
        symptoms: item.symptoms ?? "",
        defaultTreatment: item.defaultTreatment ?? ""
      };
    case "medications":
      return {
        name: item.name ?? "",
        defaultDosage: item.defaultDosage ?? "",
        route: item.route ?? "",
        notes: item.notes ?? ""
      };
    case "vaccines":
      return {
        name: item.name ?? "",
        recommendedAgeMonths: item.recommendedAgeMonths?.toString() ?? "",
        intervalMonths: item.intervalMonths?.toString() ?? "",
        notes: item.notes ?? ""
      };
    case "death-reasons":
      return {
        name: item.name ?? "",
        notes: item.notes ?? ""
      };
  }
}

function describeItem(catalog: CatalogKey, item: AnyItem): string | null {
  switch (catalog) {
    case "diseases":
      return item.symptoms || item.description || item.defaultTreatment || null;
    case "medications": {
      const parts = [item.defaultDosage, item.route].filter(Boolean);
      return parts.length > 0 ? parts.join(" · ") : item.notes ?? null;
    }
    case "vaccines": {
      const parts: string[] = [];
      if (item.recommendedAgeMonths !== null && item.recommendedAgeMonths !== undefined) {
        parts.push(`Idade: ${item.recommendedAgeMonths}m`);
      }
      if (item.intervalMonths !== null && item.intervalMonths !== undefined) {
        parts.push(`Intervalo: ${item.intervalMonths}m`);
      }
      return parts.length > 0 ? parts.join(" · ") : item.notes ?? null;
    }
    case "death-reasons":
      return item.notes ?? null;
  }
}

function CatalogList({ catalog }: { catalog: CatalogKey }) {
  const [items, setItems] = useState<AnyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnyItem | null>(null);
  const [form, setForm] = useState<FormState>(formFromItem(catalog, null));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const meta = CATALOG_META[catalog];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(endpointFor(catalog), { cache: "no-store" });
      if (!response.ok) throw new Error("Falha ao carregar.");
      const data = (await response.json()) as { items: AnyItem[] };
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }, [catalog]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(formFromItem(catalog, null));
    setFormError(null);
    setOpen(true);
  }

  function openEdit(item: AnyItem) {
    setEditing(item);
    setForm(formFromItem(catalog, item));
    setFormError(null);
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch(endpointFor(catalog, editing?.id), {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFor(catalog, form))
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Erro ao salvar.");
      }
      setOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(`Remover este ${meta.itemLabel}?`)) return;
    try {
      const response = await fetch(endpointFor(catalog, id), { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Erro ao remover.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover.");
    }
  }

  return (
    <>
    <Card className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">
          {meta.emoji} {meta.label}
        </h3>
        <Button type="button" onClick={openCreate}>
          + {meta.addLabel}
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-slate-500">Carregando...</p> : null}

      {!loading && items.length === 0 ? (
        <p className="rounded-xl bg-[color:var(--surface-soft)] px-3 py-2 text-sm text-slate-500">
          Nenhum {meta.itemLabel} cadastrado ainda.
        </p>
      ) : null}

      <ul className="grid gap-2">
        {items.map((item) => {
          const detail = describeItem(catalog, item);
          return (
            <li
              key={item.id}
              className="flex items-start justify-between gap-2 rounded-2xl border border-[color:var(--line)] bg-white/70 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                {detail ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{detail}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => openEdit(item)}
                  aria-label="Editar"
                  title="Editar"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
                <DeleteActionButton
                  iconOnly
                  onClick={() => handleDelete(item.id)}
                  className="h-8 w-8 sm:h-9 sm:w-9"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>

      <AppModal
        open={open}
        title={`${editing ? "Editar" : "Novo"} ${meta.itemLabel}`}
        onClose={() => setOpen(false)}
        error={formError}
      >
        <form onSubmit={handleSubmit} className="grid gap-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">Nome</span>
            <Input
              required
              value={form.name ?? ""}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>

          {catalog === "diseases" ? (
            <>
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold text-slate-800">Descrição</span>
                <textarea
                  className={textareaClass}
                  value={form.description ?? ""}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold text-slate-800">Sintomas</span>
                <textarea
                  className={textareaClass}
                  value={form.symptoms ?? ""}
                  onChange={(event) => setForm({ ...form, symptoms: event.target.value })}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold text-slate-800">Tratamento padrão</span>
                <textarea
                  className={textareaClass}
                  value={form.defaultTreatment ?? ""}
                  onChange={(event) => setForm({ ...form, defaultTreatment: event.target.value })}
                />
              </label>
            </>
          ) : null}

          {catalog === "medications" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-slate-800">Dosagem padrão</span>
                  <Input
                    value={form.defaultDosage ?? ""}
                    onChange={(event) =>
                      setForm({ ...form, defaultDosage: event.target.value })
                    }
                    placeholder="Ex: 0,5 mL/kg"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-slate-800">Via</span>
                  <select
                    className={inputClass}
                    value={form.route ?? ""}
                    onChange={(event) => setForm({ ...form, route: event.target.value })}
                  >
                    <option value="">Selecione</option>
                    <option value="Oral">Oral</option>
                    <option value="Injetável">Injetável</option>
                    <option value="Tópico">Tópico</option>
                    <option value="Água">Água</option>
                    <option value="Ração">Ração</option>
                  </select>
                </label>
              </div>
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold text-slate-800">Observações</span>
                <textarea
                  className={textareaClass}
                  value={form.notes ?? ""}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                />
              </label>
            </>
          ) : null}

          {catalog === "vaccines" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-slate-800">
                    Idade recomendada (meses)
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={form.recommendedAgeMonths ?? ""}
                    onChange={(event) =>
                      setForm({ ...form, recommendedAgeMonths: event.target.value })
                    }
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-slate-800">
                    Intervalo de revacinação (meses)
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={form.intervalMonths ?? ""}
                    onChange={(event) =>
                      setForm({ ...form, intervalMonths: event.target.value })
                    }
                  />
                </label>
              </div>
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold text-slate-800">Observações</span>
                <textarea
                  className={textareaClass}
                  value={form.notes ?? ""}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                />
              </label>
            </>
          ) : null}

          {catalog === "death-reasons" ? (
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-slate-800">Observações</span>
              <textarea
                className={textareaClass}
                value={form.notes ?? ""}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </label>
          ) : null}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </AppModal>
    </>
  );
}

export function CatalogsTab() {
  const [activeKey, setActiveKey] = useState<CatalogKey>("diseases");

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(CATALOG_META) as CatalogKey[]).map((key) => {
          const meta = CATALOG_META[key];
          const active = activeKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveKey(key)}
              className={
                "rounded-full px-3 py-1.5 text-xs font-semibold transition " +
                (active
                  ? "bg-[linear-gradient(135deg,var(--brand),var(--brand-strong))] text-white shadow"
                  : "border border-[color:var(--line)] bg-white text-slate-700 hover:bg-[color:var(--surface-soft)]")
              }
            >
              {meta.emoji} {meta.label}
            </button>
          );
        })}
      </div>
      <CatalogList catalog={activeKey} />
    </div>
  );
}
