"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteActionButton } from "@/components/ui/delete-action-button";
import { Input } from "@/components/ui/input";

const inputClass =
  "h-10 w-full rounded-xl border border-[color:var(--line)] bg-white/90 px-3 text-[13px] text-slate-800 outline-none focus:ring-4 focus:ring-[color:var(--brand)]/20 sm:h-11 sm:rounded-2xl sm:px-4 sm:text-sm";

const textareaClass =
  "min-h-20 w-full rounded-2xl border border-[color:var(--line)] bg-white/90 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-[color:var(--brand)]/20 sm:px-4 sm:py-3";

type Vaccine = { id: string; name: string };
type FlockGroup = {
  id: string;
  title: string;
  species: { name: string } | null;
  breed: { name: string } | null;
  variety: { name: string } | null;
  birdCount: number;
};
type VaccinationItem = {
  id: string;
  appliedAt: string;
  notes: string | null;
  vaccine: { id: string; name: string };
  bird: {
    id: string;
    ringNumber: string;
    nickname: string | null;
    flockGroup: { title: string };
  };
};

type GroupedVaccination = {
  key: string;
  appliedAt: string;
  notes: string | null;
  vaccine: { id: string; name: string };
  flockGroupTitle: string;
  birdCount: number;
  ids: string[];
};

type FormState = {
  flockGroupId: string;
  vaccineId: string;
  appliedAt: string;
  notes: string;
};

const emptyForm: FormState = { flockGroupId: "", vaccineId: "", appliedAt: "", notes: "" };

function todayInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

export function VaccinationsTab() {
  const [items, setItems] = useState<VaccinationItem[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [flockGroups, setFlockGroups] = useState<FlockGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ ...emptyForm, appliedAt: todayInput() });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [vaccinationsRes, vaccinesRes, groupsRes] = await Promise.all([
        fetch("/api/health/vaccinations", { cache: "no-store" }),
        fetch("/api/health/catalogs/vaccines", { cache: "no-store" }),
        fetch("/api/health/flock-groups", { cache: "no-store" })
      ]);
      if (!vaccinationsRes.ok) throw new Error("Falha ao carregar vacinações.");
      const vaccinationsJson = (await vaccinationsRes.json()) as { items: VaccinationItem[] };
      setItems(vaccinationsJson.items);

      if (vaccinesRes.ok) {
        const vaccinesJson = (await vaccinesRes.json()) as { items: Vaccine[] };
        setVaccines(vaccinesJson.items);
      }

      if (groupsRes.ok) {
        const groupsJson = (await groupsRes.json()) as { groups: FlockGroup[] };
        setFlockGroups(groupsJson.groups);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm({ ...emptyForm, appliedAt: todayInput() });
    setFormError(null);
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch("/api/health/vaccinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flockGroupId: form.flockGroupId,
          vaccineId: form.vaccineId,
          appliedAt: form.appliedAt,
          notes: form.notes || null
        })
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Erro ao registrar vacinação.");
      }
      setOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao registrar vacinação.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteGroup(ids: string[]) {
    if (!confirm(`Remover ${ids.length} ${ids.length === 1 ? "registro" : "registros"} desta aplicação?`)) return;
    try {
      const results = await Promise.all(
        ids.map((id) => fetch(`/api/health/vaccinations/${id}`, { method: "DELETE" }))
      );
      const failed = results.find((r) => !r.ok);
      if (failed) {
        const body = (await failed.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Erro ao remover.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover.");
    }
  }

  const vaccinesById = useMemo(() => new Map(vaccines.map((v) => [v.id, v])), [vaccines]);
  const noVaccines = vaccines.length === 0;
  const noFlocks = flockGroups.length === 0;
  const flocksWithBirds = flockGroups.filter((g) => g.birdCount > 0);
  const noVaccinableFlocks = flocksWithBirds.length === 0;

  const groupedItems = useMemo<GroupedVaccination[]>(() => {
    const map = new Map<string, GroupedVaccination>();
    for (const item of items) {
      const dayKey = item.appliedAt.slice(0, 10);
      const key = `${item.vaccine.id}|${dayKey}|${item.bird.flockGroup.title}`;
      const existing = map.get(key);
      if (existing) {
        existing.birdCount += 1;
        existing.ids.push(item.id);
      } else {
        map.set(key, {
          key,
          appliedAt: item.appliedAt,
          notes: item.notes,
          vaccine: item.vaccine,
          flockGroupTitle: item.bird.flockGroup.title,
          birdCount: 1,
          ids: [item.id]
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      b.appliedAt.localeCompare(a.appliedAt)
    );
  }, [items]);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groupedItems;
    return groupedItems.filter((g) => {
      const haystack = `${g.vaccine.name} ${g.flockGroupTitle} ${g.notes ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [groupedItems, search]);

  return (
    <>
    <Card className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">💉 Vacinações aplicadas</h3>
        <Button type="button" onClick={openCreate} disabled={noVaccines || noVaccinableFlocks}>
          + Registrar
        </Button>
      </div>

      {items.length > 0 ? (
        <Input
          type="search"
          placeholder="Buscar por vacina, lote ou observação..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      ) : null}

      {noVaccines || noFlocks || noVaccinableFlocks ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {noVaccines
            ? "Cadastre vacinas no catálogo antes de registrar aplicações."
            : noFlocks
              ? "Cadastre lotes no Plantel antes de registrar vacinações."
              : "Nenhum lote tem aves vivas para vacinar."}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-slate-500">Carregando...</p> : null}

      {!loading && items.length === 0 ? (
        <p className="rounded-xl bg-[color:var(--surface-soft)] px-3 py-2 text-sm text-slate-500">
          Nenhuma vacinação registrada ainda.
        </p>
      ) : null}

      {!loading && items.length > 0 && visibleItems.length === 0 ? (
        <p className="rounded-xl bg-[color:var(--surface-soft)] px-3 py-2 text-sm text-slate-500">
          Nenhum registro corresponde à busca.
        </p>
      ) : null}

      <ul className="grid gap-2">
        {visibleItems.map((group) => (
          <li
            key={group.key}
            className="flex items-start justify-between gap-2 rounded-2xl border border-[color:var(--line)] bg-white/70 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {group.vaccine.name}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                {group.flockGroupTitle} · {group.birdCount}{" "}
                {group.birdCount === 1 ? "ave" : "aves"} · {formatDate(group.appliedAt)}
              </p>
              {group.notes ? (
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{group.notes}</p>
              ) : null}
            </div>
            <DeleteActionButton
              iconOnly
              onClick={() => handleDeleteGroup(group.ids)}
              className="h-8 w-8 sm:h-9 sm:w-9"
            />
          </li>
        ))}
      </ul>
    </Card>

      <AppModal
        open={open}
        title="Registrar vacinação"
        onClose={() => setOpen(false)}
        error={formError}
      >
        <form onSubmit={handleSubmit} className="grid gap-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">Lote</span>
            <select
              className={inputClass}
              required
              value={form.flockGroupId}
              onChange={(event) => setForm({ ...form, flockGroupId: event.target.value })}
            >
              <option value="">Selecione</option>
              {flocksWithBirds.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.title} ({group.birdCount}{" "}
                  {group.birdCount === 1 ? "ave" : "aves"})
                </option>
              ))}
            </select>
            {form.flockGroupId ? (
              (() => {
                const selected = flocksWithBirds.find((g) => g.id === form.flockGroupId);
                if (!selected) return null;
                return (
                  <span className="text-[11px] text-slate-500">
                    {selected.birdCount} {selected.birdCount === 1 ? "ave" : "aves"} viva
                    {selected.birdCount === 1 ? "" : "s"} serão vacinadas neste lote.
                  </span>
                );
              })()
            ) : null}
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">Vacina</span>
            <select
              className={inputClass}
              required
              value={form.vaccineId}
              onChange={(event) => setForm({ ...form, vaccineId: event.target.value })}
            >
              <option value="">Selecione</option>
              {vaccines.map((vaccine) => (
                <option key={vaccine.id} value={vaccine.id}>
                  {vaccine.name}
                </option>
              ))}
            </select>
            {form.vaccineId && vaccinesById.has(form.vaccineId) ? (
              <span className="text-[11px] text-slate-500">
                {vaccinesById.get(form.vaccineId)!.name}
              </span>
            ) : null}
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">Data de aplicação</span>
            <Input
              type="date"
              required
              value={form.appliedAt}
              onChange={(event) => setForm({ ...form, appliedAt: event.target.value })}
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">Observações</span>
            <textarea
              className={textareaClass}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Reação observada, lote da vacina, profissional aplicador..."
            />
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </AppModal>
    </>
  );
}
