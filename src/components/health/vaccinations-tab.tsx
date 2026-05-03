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

type VaccinationTarget = {
  id: string;
  flockGroupId: string;
  title: string;
  taxonomy: string;
  birdCount: number;
  parentTitle?: string;
};

type TargetsResponse = {
  plantelGroups: VaccinationTarget[];
  vitrineListings: VaccinationTarget[];
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

type SelectedTarget = {
  flockGroupId: string;
  source: "plantel" | "vitrine";
  title: string;
  birdCount: number;
};

type FormState = {
  vaccineId: string;
  appliedAt: string;
  notes: string;
};

const emptyForm: FormState = { vaccineId: "", appliedAt: "", notes: "" };

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
  const [plantelTargets, setPlantelTargets] = useState<VaccinationTarget[]>([]);
  const [vitrineTargets, setVitrineTargets] = useState<VaccinationTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ ...emptyForm, appliedAt: todayInput() });
  const [selectedTargets, setSelectedTargets] = useState<SelectedTarget[]>([]);
  const [activeTab, setActiveTab] = useState<"plantel" | "vitrine">("plantel");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [vaccinationsRes, vaccinesRes, targetsRes] = await Promise.all([
        fetch("/api/health/vaccinations", { cache: "no-store" }),
        fetch("/api/health/catalogs/vaccines", { cache: "no-store" }),
        fetch("/api/health/vaccination-targets", { cache: "no-store" })
      ]);
      if (!vaccinationsRes.ok) throw new Error("Falha ao carregar vacinações.");
      const vaccinationsJson = (await vaccinationsRes.json()) as { items: VaccinationItem[] };
      setItems(vaccinationsJson.items);

      if (vaccinesRes.ok) {
        const vaccinesJson = (await vaccinesRes.json()) as { items: Vaccine[] };
        setVaccines(vaccinesJson.items);
      }

      if (targetsRes.ok) {
        const data = (await targetsRes.json()) as TargetsResponse;
        setPlantelTargets(data.plantelGroups ?? []);
        setVitrineTargets(data.vitrineListings ?? []);
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
    setSelectedTargets([]);
    setActiveTab("plantel");
    setFormError(null);
    setOpen(true);
  }

  function toggleTarget(target: VaccinationTarget, source: "plantel" | "vitrine") {
    setSelectedTargets((prev) => {
      const exists = prev.some(
        (t) => t.flockGroupId === target.flockGroupId && t.source === source
      );
      if (exists) {
        return prev.filter(
          (t) => !(t.flockGroupId === target.flockGroupId && t.source === source)
        );
      }
      return [
        ...prev,
        {
          flockGroupId: target.flockGroupId,
          source,
          title: target.title,
          birdCount: target.birdCount
        }
      ];
    });
  }

  function isSelected(flockGroupId: string, source: "plantel" | "vitrine") {
    return selectedTargets.some(
      (t) => t.flockGroupId === flockGroupId && t.source === source
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedTargets.length === 0) {
      setFormError("Selecione ao menos um lote.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const flockGroupIds = Array.from(
        new Set(selectedTargets.map((t) => t.flockGroupId))
      );
      const response = await fetch("/api/health/vaccinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flockGroupIds,
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
  const plantelWithBirds = plantelTargets.filter((g) => g.birdCount > 0);
  const vitrineWithBirds = vitrineTargets.filter((g) => g.birdCount > 0);
  const totalSelectedBirds = useMemo(() => {
    const seen = new Set<string>();
    let total = 0;
    for (const t of selectedTargets) {
      if (seen.has(t.flockGroupId)) continue;
      seen.add(t.flockGroupId);
      total += t.birdCount;
    }
    return total;
  }, [selectedTargets]);
  const noVaccinableTargets = plantelWithBirds.length + vitrineWithBirds.length === 0;

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
        <Button type="button" onClick={openCreate} disabled={noVaccines || noVaccinableTargets}>
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

      {noVaccines || noVaccinableTargets ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {noVaccines
            ? "Cadastre vacinas no catálogo antes de registrar aplicações."
            : "Nenhum lote do plantel ou da vitrine tem aves vivas para vacinar."}
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
        title="💉 Registrar vacinação"
        onClose={() => setOpen(false)}
        error={formError}
      >
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">Lotes a vacinar</span>
            <p className="text-[11px] text-slate-500">
              Marque um ou mais lotes (plantel e/ou vitrine). A vacina será aplicada
              em todas as aves vivas dos lotes selecionados.
            </p>

            {selectedTargets.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-1.5">
                {selectedTargets.map((t) => (
                  <span
                    key={`${t.source}-${t.flockGroupId}`}
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      t.source === "plantel"
                        ? "bg-sky-100 text-sky-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {t.source === "plantel" ? "🦚" : "🏪"} {t.title}
                    <span className="text-slate-500">({t.birdCount})</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTargets((prev) =>
                          prev.filter(
                            (x) => !(x.flockGroupId === t.flockGroupId && x.source === t.source)
                          )
                        )
                      }
                      className="ml-1 text-slate-500 hover:text-slate-800"
                      aria-label="Remover"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("plantel")}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "plantel"
                    ? "bg-white text-sky-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🦚 Plantel ({plantelWithBirds.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("vitrine")}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "vitrine"
                    ? "bg-white text-amber-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🏪 Vitrine ({vitrineWithBirds.length})
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-xl border border-[color:var(--line)] bg-white">
              {activeTab === "plantel" ? (
                plantelWithBirds.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-slate-500">
                    Nenhum lote do plantel com aves vivas.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {plantelWithBirds.map((target) => {
                      const checked = isSelected(target.flockGroupId, "plantel");
                      return (
                        <li key={target.id}>
                          <label
                            className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition ${
                              checked ? "bg-sky-50" : "hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTarget(target, "plantel")}
                              className="size-4 cursor-pointer accent-sky-600"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-slate-900">
                                {target.title}
                              </p>
                              {target.taxonomy ? (
                                <p className="truncate text-[11px] text-slate-500">
                                  {target.taxonomy}
                                </p>
                              ) : null}
                            </div>
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              {target.birdCount} {target.birdCount === 1 ? "ave" : "aves"}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : null}

              {activeTab === "vitrine" ? (
                vitrineWithBirds.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-slate-500">
                    Nenhum lote da vitrine com aves vivas.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {vitrineWithBirds.map((target) => {
                      const checked = isSelected(target.flockGroupId, "vitrine");
                      return (
                        <li key={target.id}>
                          <label
                            className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition ${
                              checked ? "bg-amber-50" : "hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTarget(target, "vitrine")}
                              className="size-4 cursor-pointer accent-amber-600"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-slate-900">
                                {target.title}
                              </p>
                              <p className="truncate text-[11px] text-slate-500">
                                {target.parentTitle}
                                {target.taxonomy ? ` · ${target.taxonomy}` : ""}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              {target.birdCount} {target.birdCount === 1 ? "ave" : "aves"}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : null}
            </div>

            {selectedTargets.length > 0 ? (
              <span className="text-[11px] text-emerald-700">
                Total: {totalSelectedBirds} {totalSelectedBirds === 1 ? "ave" : "aves"} serão vacinadas em{" "}
                {selectedTargets.length} {selectedTargets.length === 1 ? "lote" : "lotes"}.
              </span>
            ) : null}
          </div>

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
            <Button type="submit" disabled={submitting || selectedTargets.length === 0}>
              {submitting ? "Salvando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </AppModal>
    </>
  );
}
