"use client";

import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CollectionRow = {
  id: string;
  date: string;
  flockGroupId: string;
  totalEggs: number;
  goodEggs: number;
  crackedEggs: number;
  notes: string | null;
  goodRate: number;
  crackedRate: number;
  flockGroup: {
    id: string;
    title: string;
  };
};

type MetricsResponse = {
  summary: {
    eggsToday: number;
    goodEggsToday: number;
    crackedEggsToday: number;
    goodRateToday: number;
  };
  calendar: Array<{ date: string; total: number; good: number; cracked: number }>;
  groupCards: Array<{
    groupId: string;
    title: string;
    species: string;
    breed: string;
    variety: string | null;
    matrixCount: number;
    expectedLayCapacity: number;
    expectedGroupAnnual: number;
    eggs7: number;
    eggs30: number;
    eggs365: number;
    goodEggRate: number;
    averageDaily: number;
    averageWeekly: number;
    averageMonthly: number;
    progress: number;
    performance: "below" | "on_track" | "above";
  }>;
};

type FormState = {
  date: string;
  flockGroupId: string;
  totalEggs: number;
  crackedEggs: number;
  notes: string;
};

const selectClass =
  "h-11 w-full rounded-2xl border border-[color:var(--line)] bg-white/90 px-4 text-sm text-slate-800 outline-none focus:ring-4 focus:ring-[color:var(--brand)]/20";

const textareaClass =
  "min-h-24 w-full rounded-2xl border border-[color:var(--line)] bg-white/90 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-[color:var(--brand)]/20";

const weekLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const todayIso = (() => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
})();

const emptyForm: FormState = {
  date: todayIso,
  flockGroupId: "",
  totalEggs: 0,
  crackedEggs: 0,
  notes: ""
};

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {children}
    </label>
  );
}

function StatTile({
  emoji,
  label,
  value
}: {
  emoji: string;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="rounded-2xl p-3 sm:p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:text-xs">
        {emoji} {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">{value}</p>
    </Card>
  );
}

function formatDateInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatPerfLabel(perf: "below" | "on_track" | "above") {
  if (perf === "below") return "Abaixo";
  if (perf === "above") return "Acima";
  return "No alvo";
}

function perfColor(perf: "below" | "on_track" | "above") {
  if (perf === "below") return "bg-rose-500";
  if (perf === "above") return "bg-emerald-500";
  return "bg-amber-400";
}

function monthKeyFromDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function EggCollectionManager() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CollectionRow[]>([]);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterGroupId, setFilterGroupId] = useState("");
  const [capacityDraft, setCapacityDraft] = useState<Record<string, number>>({});
  const [monthCursor, setMonthCursor] = useState(monthKeyFromDate(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [showDayModal, setShowDayModal] = useState(false);

  const groups = useMemo(() => metrics?.groupCards ?? [], [metrics]);
  const overallAverages = useMemo(() => {
    return groups.reduce(
      (acc, group) => {
        acc.daily += group.averageDaily;
        acc.weekly += group.averageWeekly;
        acc.monthly += group.averageMonthly;
        return acc;
      },
      { daily: 0, weekly: 0, monthly: 0 }
    );
  }, [groups]);

  async function loadData() {
    setError(null);

    const monthStart = `${monthCursor}-01`;
    const [year, month] = monthCursor.split("-").map(Number);
    const monthEnd = new Date(year, month, 0);
    const monthEndKey = `${monthCursor}-${String(monthEnd.getDate()).padStart(2, "0")}`;

    const params = new URLSearchParams();
    params.set("from", monthStart);
    params.set("to", monthEndKey);
    if (filterGroupId) params.set("groupId", filterGroupId);

    const [collectionRes, metricsRes] = await Promise.all([
      fetch(`/api/eggs/collections?${params.toString()}`, { cache: "no-store" }),
      fetch("/api/eggs/metrics", { cache: "no-store" })
    ]);

    if (!collectionRes.ok || !metricsRes.ok) {
      setError("Nao foi possivel carregar a coleta de ovos.");
      return;
    }

    const collectionData = (await collectionRes.json()) as { collections: CollectionRow[] };
    const metricsData = (await metricsRes.json()) as MetricsResponse;

    setRows(collectionData.collections);
    setMetrics(metricsData);
    setCapacityDraft(
      Object.fromEntries(metricsData.groupCards.map((group) => [group.groupId, group.expectedLayCapacity || 0]))
    );

    if (!form.flockGroupId && metricsData.groupCards.length > 0) {
      setForm((prev) => ({ ...prev, flockGroupId: metricsData.groupCards[0].groupId }));
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterGroupId, monthCursor]);

  async function submitCollection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const endpoint = editingId ? `/api/eggs/collections/${editingId}` : "/api/eggs/collections";
    const method = editingId ? "PUT" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Falha ao salvar coleta.");
      setSaving(false);
      return;
    }

    setForm((prev) => ({ ...emptyForm, flockGroupId: prev.flockGroupId || form.flockGroupId, date: selectedDate }));
    setEditingId(null);
    setSaving(false);
    setShowDayModal(false);
    await loadData();
  }

  async function deleteCollection(id: string) {
    if (!window.confirm("Deseja excluir este registro de coleta?")) return;

    const response = await fetch(`/api/eggs/collections/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Nao foi possivel excluir o registro.");
      return;
    }

    await loadData();
  }

  async function saveCapacity(groupId: string) {
    const expectedLayCapacity = capacityDraft[groupId] ?? 0;
    const response = await fetch(`/api/eggs/groups/${groupId}/capacity`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedLayCapacity })
    });

    if (!response.ok) {
      setError("Nao foi possivel atualizar a meta do grupo.");
      return;
    }

    await loadData();
  }

  const calendarMap = useMemo(() => {
    const map = new Map<string, { total: number; good: number; cracked: number }>();
    for (const row of metrics?.calendar ?? []) {
      map.set(row.date, { total: row.total, good: row.good, cracked: row.cracked });
    }
    return map;
  }, [metrics]);

  const rowsByDate = useMemo(() => {
    return rows.reduce<Record<string, CollectionRow[]>>((acc, row) => {
      const key = formatDateInput(row.date);
      acc[key] = acc[key] ?? [];
      acc[key].push(row);
      return acc;
    }, {});
  }, [rows]);

  const selectedDateRows = rowsByDate[selectedDate] ?? [];

  const monthDate = useMemo(() => {
    const [year, month] = monthCursor.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }, [monthCursor]);

  const monthName = monthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const monthDays = useMemo(() => {
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const firstWeekDay = start.getDay();
    const totalDays = end.getDate();
    const cells: Array<{ key: string; day?: number; date?: string }> = [];

    for (let i = 0; i < firstWeekDay; i += 1) {
      cells.push({ key: `empty-${i}` });
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const dateKey = `${monthCursor}-${String(day).padStart(2, "0")}`;
      cells.push({ key: dateKey, day, date: dateKey });
    }

    return cells;
  }, [monthCursor, monthDate]);

  function goMonth(direction: -1 | 1) {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + direction, 1);
    const nextKey = monthKeyFromDate(next);
    setMonthCursor(nextKey);
    setSelectedDate(`${nextKey}-01`);
    setShowDayModal(false);
  }

  function openDay(date: string) {
    setSelectedDate(date);
    setForm((prev) => ({ ...prev, date }));
    setEditingId(null);
    setShowDayModal(true);
  }

  return (
    <main className="space-y-6">
      <PageTitle
        title={`${"\u{1F95A}"} Coleta de ovos`}
        description="Visao mensal para acompanhar o sitio sem lotar a tela com listas longas."
      />

      {error ? (
        <Card className="border-rose-200 bg-rose-50">
          <p className="text-sm font-medium text-rose-700">{error}</p>
        </Card>
      ) : null}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile emoji={"\u{1F95A}"} label="Hoje" value={metrics?.summary.eggsToday ?? 0} />
        <StatTile emoji={"\u{26A0}\u{FE0F}"} label="Trincados" value={metrics?.summary.crackedEggsToday ?? 0} />
        <StatTile emoji={"\u{1F4C8}"} label="Bons" value={formatPercent(metrics?.summary.goodRateToday ?? 0)} />
        <StatTile emoji={"\u{1F4C5}"} label="Media dia" value={overallAverages.daily.toFixed(1)} />
        <StatTile emoji={"\u{1F5D3}\u{FE0F}"} label="Media sem" value={overallAverages.weekly.toFixed(1)} />
        <StatTile emoji={"\u{1F4CA}"} label="Media mes" value={overallAverages.monthly.toFixed(1)} />
      </section>

      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Calendario do mes</h3>
            <p className="mt-1 text-sm text-slate-500">Estilo agenda: toque no dia para abrir os registros.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select className={`${selectClass} sm:w-64`} value={filterGroupId} onChange={(event) => setFilterGroupId(event.target.value)}>
              <option value="">Todos os grupos</option>
              {groups.map((group) => (
                <option key={group.groupId} value={group.groupId}>
                  {group.title}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" onClick={() => goMonth(-1)}>
              Mes anterior
            </Button>
            <Button type="button" variant="outline" onClick={() => goMonth(1)}>
              Proximo mes
            </Button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-[color:var(--surface-soft)] px-4 py-3">
          <p className="text-base font-semibold capitalize text-slate-900 sm:text-lg">{monthName}</p>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:gap-2 sm:text-xs">
          {weekLabels.map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-1.5 sm:gap-2">
          {monthDays.map((cell) => {
            if (!cell.date || !cell.day) {
              return <div key={cell.key} className="h-16 rounded-xl bg-white/40 sm:h-24 sm:rounded-2xl" />;
            }

            const values = calendarMap.get(cell.date);
            const total = values?.total ?? 0;
            const hasRecords = total > 0;
            const isSelected = selectedDate === cell.date;

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => openDay(cell.date!)}
                className={`h-16 rounded-xl border p-1.5 text-left transition sm:h-24 sm:rounded-2xl sm:p-2 ${
                  isSelected
                    ? "border-[color:var(--brand)] bg-[color:var(--surface-soft)]"
                    : "border-[color:var(--line)] bg-white hover:bg-[color:var(--surface-soft)]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-semibold text-slate-800 sm:text-sm">{cell.day}</span>
                  {hasRecords ? <span className="size-2 rounded-full bg-emerald-500" /> : null}
                </div>
                <div className="mt-2 flex items-end gap-1 sm:mt-6">
                  <span className="text-sm font-semibold text-slate-900 sm:text-lg">{total}</span>
                  <span className="text-[10px] text-slate-500 sm:text-xs">ovos</span>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => {
          const width = Math.min(group.progress, 100);
          return (
            <Card key={group.groupId} className="rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{group.title}</h3>
                  <p className="text-xs text-[color:var(--ink-soft)]">
                    {group.species} - {group.breed}
                    {group.variety ? ` - ${group.variety}` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-[color:var(--surface-soft)] px-2 py-1 text-[10px] font-semibold text-[color:var(--brand-strong)] sm:text-xs">
                  {formatPerfLabel(group.performance)}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 px-2 py-2">
                  <p className="text-[10px] text-slate-500">7d</p>
                  <p className="text-sm font-semibold text-slate-900">{group.eggs7}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-2 py-2">
                  <p className="text-[10px] text-slate-500">30d</p>
                  <p className="text-sm font-semibold text-slate-900">{group.eggs30}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-2 py-2">
                  <p className="text-[10px] text-slate-500">365d</p>
                  <p className="text-sm font-semibold text-slate-900">{group.eggs365}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-2 py-2">
                  <p className="text-[10px] text-slate-500">bons</p>
                  <p className="text-sm font-semibold text-slate-900">{formatPercent(group.goodEggRate)}</p>
                </div>
              </div>

              <div className="mt-4">
                <Field label="Meta anual por ave matriz (ovos/ano)">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={365}
                      placeholder="0 a 365"
                      value={capacityDraft[group.groupId] ?? 0}
                      onChange={(event) =>
                        setCapacityDraft((prev) => ({
                          ...prev,
                          [group.groupId]: Number(event.target.value)
                        }))
                      }
                    />
                    <Button type="button" variant="outline" onClick={() => saveCapacity(group.groupId)}>
                      Salvar
                    </Button>
                  </div>
                </Field>

                <div className="mt-3 h-2.5 w-full rounded-full bg-slate-200">
                  <div className={`h-2.5 rounded-full ${perfColor(group.performance)}`} style={{ width: `${width}%` }} />
                </div>
                <p className="mt-2 text-xs text-[color:var(--ink-soft)]">
                  {"\u{1F95A}"} matrizes {group.matrixCount} - meta/matriz {group.expectedLayCapacity || 0}
                </p>
                <p className="mt-1 text-xs text-[color:var(--ink-soft)]">
                  {"\u{1F4CA}"} anual {group.eggs365}/{group.expectedGroupAnnual || 0} ({formatPercent(group.progress)})
                </p>
              </div>
            </Card>
          );
        })}
      </section>

      {showDayModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[32px] border border-[color:var(--line)] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.25)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Dia selecionado</p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-900">
                  {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                  })}
                </h3>
              </div>
              <Button type="button" variant="outline" onClick={() => setShowDayModal(false)}>
                Fechar
              </Button>
            </div>

            <form className="mt-6 grid gap-4" onSubmit={submitCollection}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Data da coleta">
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(event) => {
                      setSelectedDate(event.target.value);
                      setForm((prev) => ({ ...prev, date: event.target.value }));
                    }}
                  />
                </Field>
                <Field label="Grupo de origem">
                  <select
                    className={selectClass}
                    value={form.flockGroupId}
                    onChange={(event) => setForm((prev) => ({ ...prev, flockGroupId: event.target.value }))}
                  >
                    <option value="">Selecione o grupo</option>
                    {groups.map((group) => (
                      <option key={group.groupId} value={group.groupId}>
                        {group.title}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Total de ovos">
                  <Input
                    type="number"
                    min={0}
                    value={form.totalEggs}
                    onChange={(event) => setForm((prev) => ({ ...prev, totalEggs: Number(event.target.value) }))}
                  />
                </Field>
                <Field label="Ovos trincados">
                  <Input
                    type="number"
                    min={0}
                    value={form.crackedEggs}
                    onChange={(event) => setForm((prev) => ({ ...prev, crackedEggs: Number(event.target.value) }))}
                  />
                </Field>
                <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Taxa de ovos bons</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatPercent(
                      form.totalEggs > 0 ? ((Math.max(form.totalEggs - form.crackedEggs, 0) / form.totalEggs) * 100) : 0
                    )}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Calculo automatico: total menos trincados.</p>
                </div>
              </div>

              <Field label="Observacoes">
                <textarea
                  className={textareaClass}
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Observacoes da coleta"
                />
              </Field>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : editingId ? "Atualizar coleta" : "Registrar coleta"}
                </Button>
                {editingId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingId(null);
                      setForm((prev) => ({ ...emptyForm, flockGroupId: prev.flockGroupId, date: selectedDate }));
                    }}
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </form>

            <div className="mt-6 space-y-3">
              {selectedDateRows.length === 0 ? (
                <p className="text-sm text-[color:var(--ink-soft)]">Nenhuma coleta encontrada para essa data.</p>
              ) : (
                selectedDateRows.map((row) => (
                  <div key={row.id} className="rounded-3xl border border-[color:var(--line)] bg-slate-50/70 p-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <h5 className="text-base font-semibold text-slate-900">{row.flockGroup.title}</h5>
                        <p className="text-sm text-[color:var(--ink-soft)]">
                          {row.totalEggs} ovos no total - {row.crackedEggs} trincados
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Taxa de ovos bons {formatPercent(row.goodRate)} - Trincados {formatPercent(row.crackedRate)}
                        </p>
                        {row.notes ? <p className="mt-2 text-sm text-slate-600">{row.notes}</p> : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => {
                            setEditingId(row.id);
                            setForm({
                              date: formatDateInput(row.date),
                              flockGroupId: row.flockGroupId,
                              totalEggs: row.totalEggs,
                              crackedEggs: row.crackedEggs,
                              notes: row.notes ?? ""
                            });
                          }}
                        >
                          Editar
                        </Button>
                        <Button variant="danger" type="button" onClick={() => deleteCollection(row.id)}>
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
