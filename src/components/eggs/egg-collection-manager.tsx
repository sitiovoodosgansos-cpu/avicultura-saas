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
    species: { name: string };
    breed: { name: string };
    variety: { name: string } | null;
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
  monthlySeries: Array<{ date: string; total: number; good: number; cracked: number }>;
  groupCards: Array<{
    groupId: string;
    title: string;
    species: string;
    breed: string;
    variety: string | null;
    expectedLayCapacity: number;
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
  goodEggs: number;
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
  goodEggs: 0,
  crackedEggs: 0,
  notes: ""
};

function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {children}
      {hint ? <span className="text-xs text-[color:var(--ink-soft)]">{hint}</span> : null}
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
    <Card className="rounded-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {emoji} {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
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
  if (perf === "below") return "Abaixo do esperado";
  if (perf === "above") return "Acima do esperado";
  return "Dentro do esperado";
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
  const [loading, setLoading] = useState(true);
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

  const groups = useMemo(() => metrics?.groupCards ?? [], [metrics]);

  async function loadData() {
    setLoading(true);
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
      setLoading(false);
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

    setLoading(false);
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
  }

  function applyDayToForm(date: string) {
    setSelectedDate(date);
    setForm((prev) => ({ ...prev, date }));
    setEditingId(null);
  }

  return (
    <main className="space-y-6">
      <PageTitle
        title="🥚 Coleta de ovos"
        description="A tela agora gira em torno do calendario mensal. Clique no dia para ver e editar as coletas sem se perder em listas enormes."
      />

      {error ? (
        <Card className="border-rose-200 bg-rose-50">
          <p className="text-sm font-medium text-rose-700">{error}</p>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <StatTile emoji="🥚" label="Coletados hoje" value={metrics?.summary.eggsToday ?? 0} />
        <StatTile emoji="✨" label="Ovos bons" value={metrics?.summary.goodEggsToday ?? 0} />
        <StatTile emoji="⚠️" label="Trincados" value={metrics?.summary.crackedEggsToday ?? 0} />
        <StatTile emoji="📈" label="Taxa de bons" value={formatPercent(metrics?.summary.goodRateToday ?? 0)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <h3 className="text-xl font-semibold text-slate-900">
            {editingId ? "✏️ Editar coleta" : "➕ Nova coleta"}
          </h3>
          <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
            Os numeros abaixo se referem ao dia escolhido no calendario e ao grupo selecionado.
          </p>

          <form className="mt-5 grid gap-4" onSubmit={submitCollection}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Data da coleta" hint="Dia em que os ovos foram recolhidos.">
                <Input
                  type="date"
                  value={form.date}
                  onChange={(event) => {
                    setSelectedDate(event.target.value);
                    setForm((prev) => ({ ...prev, date: event.target.value }));
                  }}
                />
              </Field>

              <Field label="Grupo de origem" hint="Escolha o card do plantel responsavel por esses ovos.">
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
              <Field label="Total de ovos" hint="Quantidade total recolhida naquele dia.">
                <Input
                  type="number"
                  min={0}
                  value={form.totalEggs}
                  onChange={(event) => setForm((prev) => ({ ...prev, totalEggs: Number(event.target.value) }))}
                />
              </Field>
              <Field label="Ovos bons" hint="Quantidade boa para uso ou incubacao.">
                <Input
                  type="number"
                  min={0}
                  value={form.goodEggs}
                  onChange={(event) => setForm((prev) => ({ ...prev, goodEggs: Number(event.target.value) }))}
                />
              </Field>
              <Field label="Ovos trincados" hint="Quantidade com rachadura ou dano.">
                <Input
                  type="number"
                  min={0}
                  value={form.crackedEggs}
                  onChange={(event) => setForm((prev) => ({ ...prev, crackedEggs: Number(event.target.value) }))}
                />
              </Field>
            </div>

            <Field label="Observacoes" hint="Detalhes daquele dia: clima, queda de postura, selecao, manejo ou anormalidades.">
              <textarea
                className={textareaClass}
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Escreva algo importante sobre essa coleta."
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
        </Card>

        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">🗓️ Calendario mensal</h3>
              <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
                Clique em uma data para ver apenas os registros daquele dia.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => goMonth(-1)}>
                Mes anterior
              </Button>
              <Button type="button" variant="outline" onClick={() => goMonth(1)}>
                Proximo mes
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[0.42fr_0.58fr]">
            <div>
              <div className="rounded-3xl bg-[color:var(--surface-soft)] px-4 py-3">
                <p className="text-sm font-semibold capitalize text-slate-900">{monthName}</p>
                <p className="mt-1 text-xs text-[color:var(--ink-soft)]">
                  Selecione o grupo para reduzir a visualizacao quando houver muitas especies.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                {weekLabels.map((label) => (
                  <div key={label}>{label}</div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-7 gap-2">
                {monthDays.map((cell) => {
                  if (!cell.date || !cell.day) {
                    return <div key={cell.key} className="h-24 rounded-2xl bg-white/40" />;
                  }

                  const values = calendarMap.get(cell.date);
                  const active = selectedDate === cell.date;
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => applyDayToForm(cell.date!)}
                      className={`h-24 rounded-2xl border p-2 text-left transition ${
                        active
                          ? "border-transparent bg-[linear-gradient(135deg,var(--brand),var(--brand-strong))] text-white shadow-[0_14px_28px_rgba(15,157,138,0.22)]"
                          : "border-[color:var(--line)] bg-white hover:bg-[color:var(--surface-soft)]"
                      }`}
                    >
                      <p className="text-sm font-semibold">{cell.day}</p>
                      <p className="mt-2 text-[11px]">Total {values?.total ?? 0}</p>
                      <p className="text-[11px]">Bons {values?.good ?? 0}</p>
                      <p className="text-[11px]">Trinc. {values?.cracked ?? 0}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-[color:var(--line)] bg-white/80 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Dia selecionado</p>
                  <h4 className="mt-1 text-lg font-semibold text-slate-900">
                    {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric"
                    })}
                  </h4>
                </div>
                <div className="w-full md:w-60">
                  <select className={selectClass} value={filterGroupId} onChange={(event) => setFilterGroupId(event.target.value)}>
                    <option value="">Todos os grupos</option>
                    {groups.map((group) => (
                      <option key={group.groupId} value={group.groupId}>
                        {group.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? <p className="mt-4 text-sm text-[color:var(--ink-soft)]">Carregando registros...</p> : null}
              {!loading && selectedDateRows.length === 0 ? (
                <p className="mt-4 text-sm text-[color:var(--ink-soft)]">
                  Nenhuma coleta encontrada para essa data.
                </p>
              ) : null}

              {!loading && selectedDateRows.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {selectedDateRows.map((row) => (
                    <div key={row.id} className="rounded-3xl border border-[color:var(--line)] bg-slate-50/70 p-4">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <h5 className="text-base font-semibold text-slate-900">{row.flockGroup.title}</h5>
                          <p className="text-sm text-[color:var(--ink-soft)]">
                            {row.totalEggs} ovos no total • {row.goodEggs} bons • {row.crackedEggs} trincados
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Bons {formatPercent(row.goodRate)} • Trincados {formatPercent(row.crackedRate)}
                          </p>
                          {row.notes ? <p className="mt-2 text-sm text-slate-600">{row.notes}</p> : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            type="button"
                            onClick={() => {
                              setEditingId(row.id);
                              setSelectedDate(formatDateInput(row.date));
                              setForm({
                                date: formatDateInput(row.date),
                                flockGroupId: row.flockGroupId,
                                totalEggs: row.totalEggs,
                                goodEggs: row.goodEggs,
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
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => {
          const width = Math.min(group.progress, 160);
          return (
            <Card key={group.groupId}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{group.title}</h3>
                  <p className="text-xs text-[color:var(--ink-soft)]">
                    {group.species} • {group.breed}
                    {group.variety ? ` • ${group.variety}` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-[color:var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--brand-strong)]">
                  {formatPerfLabel(group.performance)}
                </span>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-700">
                <p>Ultimos 7 dias: {group.eggs7} ovos</p>
                <p>Ultimos 30 dias: {group.eggs30} ovos</p>
                <p>Ultimos 365 dias: {group.eggs365} ovos</p>
                <p>Taxa de ovos bons: {formatPercent(group.goodEggRate)}</p>
                <p>Media diaria: {group.averageDaily}</p>
                <p>Media semanal: {group.averageWeekly}</p>
                <p>Media mensal: {group.averageMonthly}</p>
              </div>

              <div className="mt-5">
                <Field label="Meta de ovos" hint="Numero esperado para comparar o desempenho real.">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
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

                <div className="mt-3 h-3 w-full rounded-full bg-slate-200">
                  <div className={`h-3 rounded-full ${perfColor(group.performance)}`} style={{ width: `${width}%` }} />
                </div>
                <p className="mt-2 text-xs text-[color:var(--ink-soft)]">
                  Real {group.eggs30} / Meta {group.expectedLayCapacity || 0} ({formatPercent(group.progress)})
                </p>
              </div>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
