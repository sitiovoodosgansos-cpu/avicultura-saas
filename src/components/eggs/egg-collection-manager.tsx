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

type DayDraft = {
  totalEggs: number;
  crackedEggs: number;
};

const EMOJI = {
  egg: "\u{1F95A}",
  warning: "\u26A0\uFE0F",
  chart: "\u{1F4C8}",
  week: "\u{1F4C6}",
  month: "\u{1F5D3}\uFE0F",
  year: "\u{1F4CA}",
  matrix: "\u{1F95A}",
  annual: "\u{1F4CA}"
} as const;

const selectClass =
  "h-11 w-full rounded-2xl border border-[color:var(--line)] bg-white/90 px-4 text-sm text-slate-800 outline-none focus:ring-4 focus:ring-[color:var(--brand)]/20";

const weekLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const todayIso = (() => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
})();

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
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [dayRows, setDayRows] = useState<CollectionRow[]>([]);
  const [dayDraftByGroup, setDayDraftByGroup] = useState<Record<string, DayDraft>>({});
  const [loadingDay, setLoadingDay] = useState(false);
  const [filterGroupId, setFilterGroupId] = useState("");
  const [capacityDraft, setCapacityDraft] = useState<Record<string, number>>({});
  const [monthCursor, setMonthCursor] = useState(monthKeyFromDate(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [showDayModal, setShowDayModal] = useState(false);

  const groups = useMemo(() => metrics?.groupCards ?? [], [metrics]);
  const overallTotals = useMemo(() => {
    return groups.reduce(
      (acc, group) => {
        acc.week += group.eggs7;
        acc.month += group.eggs30;
        acc.year += group.eggs365;
        return acc;
      },
      { week: 0, month: 0, year: 0 }
    );
  }, [groups]);

  async function loadData() {
    setError(null);

    const metricsRes = await fetch("/api/eggs/metrics", { cache: "no-store" });

    if (!metricsRes.ok) {
      setError("Nao foi possivel carregar a coleta de ovos.");
      return;
    }

    const metricsData = (await metricsRes.json()) as MetricsResponse;

    setMetrics(metricsData);
    setCapacityDraft(
      Object.fromEntries(metricsData.groupCards.map((group) => [group.groupId, group.expectedLayCapacity || 0]))
    );
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterGroupId, monthCursor]);

  useEffect(() => {
    if (!showDayModal) return;
    loadDayRows(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, selectedDate, showDayModal]);

  async function loadDayRows(date: string) {
    setLoadingDay(true);
    try {
      const params = new URLSearchParams();
      params.set("from", date);
      params.set("to", date);
      const response = await fetch(`/api/eggs/collections?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        setError("Nao foi possivel carregar os registros desse dia.");
        return;
      }

      const payload = (await response.json()) as { collections: CollectionRow[] };
      const collections = payload.collections ?? [];
      setDayRows(collections);

      const nextDraft: Record<string, DayDraft> = Object.fromEntries(
        groups.map((group) => [group.groupId, { totalEggs: 0, crackedEggs: 0 }])
      );

      for (const row of collections) {
        const current = nextDraft[row.flockGroupId] ?? { totalEggs: 0, crackedEggs: 0 };
        nextDraft[row.flockGroupId] = {
          totalEggs: current.totalEggs + row.totalEggs,
          crackedEggs: current.crackedEggs + row.crackedEggs
        };
      }

      setDayDraftByGroup(nextDraft);
    } finally {
      setLoadingDay(false);
    }
  }

  async function saveDayCollections() {
    if (groups.length === 0) {
      setError("Cadastre pelo menos um grupo no plantel para lancar coleta.");
      return;
    }

    for (const group of groups) {
      const draft = dayDraftByGroup[group.groupId] ?? { totalEggs: 0, crackedEggs: 0 };
      const totalEggs = Math.max(0, Number(draft.totalEggs) || 0);
      const crackedEggs = Math.max(0, Number(draft.crackedEggs) || 0);
      if (crackedEggs > totalEggs) {
        setError(`No grupo ${group.title}, trincados nao pode ser maior que total.`);
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      for (const group of groups) {
        const draft = dayDraftByGroup[group.groupId] ?? { totalEggs: 0, crackedEggs: 0 };
        const totalEggs = Math.max(0, Number(draft.totalEggs) || 0);
        const crackedEggs = Math.max(0, Number(draft.crackedEggs) || 0);
        const existing = dayRows.filter((row) => row.flockGroupId === group.groupId);

        if (totalEggs === 0 && crackedEggs === 0) {
          for (const row of existing) {
            const response = await fetch(`/api/eggs/collections/${row.id}`, { method: "DELETE" });
            if (!response.ok) {
              throw new Error(`Nao foi possivel limpar o grupo ${group.title}.`);
            }
          }
          continue;
        }

        const payload = {
          date: selectedDate,
          flockGroupId: group.groupId,
          totalEggs,
          crackedEggs,
          notes: existing[0]?.notes ?? ""
        };

        if (existing.length > 0) {
          const primary = existing[0];
          const updateResponse = await fetch(`/api/eggs/collections/${primary.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (!updateResponse.ok) {
            throw new Error(`Nao foi possivel atualizar o grupo ${group.title}.`);
          }

          for (const extra of existing.slice(1)) {
            const deleteResponse = await fetch(`/api/eggs/collections/${extra.id}`, { method: "DELETE" });
            if (!deleteResponse.ok) {
              throw new Error(`Nao foi possivel consolidar registros duplicados do grupo ${group.title}.`);
            }
          }
          continue;
        }

        const createResponse = await fetch("/api/eggs/collections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!createResponse.ok) {
          throw new Error(`Nao foi possivel registrar a coleta do grupo ${group.title}.`);
        }
      }

      await loadDayRows(selectedDate);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar as coletas do dia.");
    } finally {
      setSaving(false);
    }
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
    setError(null);
    setShowDayModal(true);
  }

  const selectedDayTotals = useMemo(() => {
    let totalEggs = 0;
    let crackedEggs = 0;

    for (const group of groups) {
      const draft = dayDraftByGroup[group.groupId];
      if (!draft) continue;
      totalEggs += Math.max(0, Number(draft.totalEggs) || 0);
      crackedEggs += Math.max(0, Number(draft.crackedEggs) || 0);
    }

    return {
      totalEggs,
      crackedEggs,
      goodRate: totalEggs > 0 ? (Math.max(totalEggs - crackedEggs, 0) / totalEggs) * 100 : 0
    };
  }, [dayDraftByGroup, groups]);

  return (
    <main className="space-y-6">
      <PageTitle
        title="Coleta de ovos"
        description="Visao mensal para acompanhar o sitio sem lotar a tela com listas longas."
        icon={EMOJI.egg}
      />

      {error && !showDayModal ? (
        <Card className="border-rose-200 bg-rose-50">
          <p className="text-sm font-medium text-rose-700">{error}</p>
        </Card>
      ) : null}

      <section className="mobile-kpi-grid grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile emoji={EMOJI.egg} label="Hoje" value={metrics?.summary.eggsToday ?? 0} />
        <StatTile emoji={EMOJI.warning} label="Trincados" value={metrics?.summary.crackedEggsToday ?? 0} />
        <StatTile emoji={EMOJI.chart} label="Bons" value={formatPercent(metrics?.summary.goodRateToday ?? 0)} />
        <StatTile emoji={EMOJI.week} label="Semana" value={overallTotals.week} />
        <StatTile emoji={EMOJI.month} label="Mes" value={overallTotals.month} />
        <StatTile emoji={EMOJI.year} label="Ano" value={overallTotals.year} />
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
                  {EMOJI.matrix} matrizes {group.matrixCount} - meta/matriz {group.expectedLayCapacity || 0}
                </p>
                <p className="mt-1 text-xs text-[color:var(--ink-soft)]">
                  {EMOJI.annual} anual {group.eggs365}/{group.expectedGroupAnnual || 0} ({formatPercent(group.progress)})
                </p>
              </div>
            </Card>
          );
        })}
      </section>

      {showDayModal ? (
        <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 backdrop-blur-sm md:items-center md:p-4">
          <div className="mt-2 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[32px] border border-[color:var(--line)] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.25)] md:mt-0">
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

            <div className="mt-6 grid gap-4">
              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                  <p className="text-sm font-medium text-rose-700">{error}</p>
                </div>
              ) : null}
              <div className="rounded-2xl border border-dashed border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Resumo do dia</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <p className="text-sm text-slate-600">
                    Total: <span className="font-semibold text-slate-900">{selectedDayTotals.totalEggs}</span>
                  </p>
                  <p className="text-sm text-slate-600">
                    Trincados: <span className="font-semibold text-slate-900">{selectedDayTotals.crackedEggs}</span>
                  </p>
                  <p className="text-sm text-slate-600">
                    Taxa bons: <span className="font-semibold text-slate-900">{formatPercent(selectedDayTotals.goodRate)}</span>
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-500">Preencha por grupo e salve tudo de uma vez.</p>
              </div>

              {loadingDay ? (
                <p className="text-sm text-[color:var(--ink-soft)]">Carregando grupos...</p>
              ) : groups.length === 0 ? (
                <p className="text-sm text-[color:var(--ink-soft)]">Nenhum grupo cadastrado no plantel.</p>
              ) : (
                <div className="grid gap-3">
                  {groups.map((group) => {
                    const draft = dayDraftByGroup[group.groupId] ?? { totalEggs: 0, crackedEggs: 0 };
                    const totalEggs = Math.max(0, Number(draft.totalEggs) || 0);
                    const crackedEggs = Math.max(0, Number(draft.crackedEggs) || 0);
                    const goodRate = totalEggs > 0 ? (Math.max(totalEggs - crackedEggs, 0) / totalEggs) * 100 : 0;

                    return (
                      <div
                        key={group.groupId}
                        className="grid gap-3 rounded-2xl border border-[color:var(--line)] bg-slate-50/60 p-3 md:grid-cols-[minmax(0,1fr)_130px_130px_110px] md:items-center"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{group.title}</p>
                          <p className="text-xs text-slate-500">
                            {group.species} - {group.breed}
                            {group.variety ? ` - ${group.variety}` : ""}
                          </p>
                        </div>

                        <Field label="Ovos">
                          <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={totalEggs === 0 ? "" : totalEggs}
                            onChange={(event) => {
                              const value = Math.max(0, Number(event.target.value || 0));
                              setDayDraftByGroup((prev) => ({
                                ...prev,
                                [group.groupId]: {
                                  ...(prev[group.groupId] ?? { totalEggs: 0, crackedEggs: 0 }),
                                  totalEggs: value
                                }
                              }));
                            }}
                          />
                        </Field>

                        <Field label="Trincados">
                          <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={crackedEggs === 0 ? "" : crackedEggs}
                            onChange={(event) => {
                              const value = Math.max(0, Number(event.target.value || 0));
                              setDayDraftByGroup((prev) => ({
                                ...prev,
                                [group.groupId]: {
                                  ...(prev[group.groupId] ?? { totalEggs: 0, crackedEggs: 0 }),
                                  crackedEggs: value
                                }
                              }));
                            }}
                          />
                        </Field>

                        <div className="rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-center">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Bons</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{formatPercent(goodRate)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={saveDayCollections} disabled={saving || loadingDay}>
                  {saving ? "Salvando..." : "Salvar coleta do dia"}
                </Button>
                <Button type="button" variant="outline" onClick={() => loadDayRows(selectedDate)} disabled={loadingDay || saving}>
                  Recarregar
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
