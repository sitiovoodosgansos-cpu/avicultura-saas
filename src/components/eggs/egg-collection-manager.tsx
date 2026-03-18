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

function formatDateInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatPerfLabel(perf: "below" | "on_track" | "above") {
  if (perf === "below") return "Abaixo do esperado";
  if (perf === "above") return "Acima do esperado";
  return "Dentro do esperado";
}

function perfColor(perf: "below" | "on_track" | "above") {
  if (perf === "below") return "bg-red-500";
  if (perf === "above") return "bg-emerald-500";
  return "bg-amber-500";
}

export function EggCollectionManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [rows, setRows] = useState<CollectionRow[]>([]);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterGroupId, setFilterGroupId] = useState("");
  const [capacityDraft, setCapacityDraft] = useState<Record<string, number>>({});

  const groups = useMemo(() => metrics?.groupCards ?? [], [metrics]);

  async function loadData() {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    if (filterGroupId) params.set("groupId", filterGroupId);

    const [collectionRes, metricsRes] = await Promise.all([
      fetch(`/api/eggs/collections?${params.toString()}`, { cache: "no-store" }),
      fetch("/api/eggs/metrics", { cache: "no-store" })
    ]);

    if (!collectionRes.ok || !metricsRes.ok) {
      setError("Não foi possível carregar a coleta de ovos.");
      setLoading(false);
      return;
    }

    const collectionData = (await collectionRes.json()) as { collections: CollectionRow[] };
    const metricsData = (await metricsRes.json()) as MetricsResponse;

    setRows(collectionData.collections);
    setMetrics(metricsData);
    setCapacityDraft(
      Object.fromEntries(
        metricsData.groupCards.map((group) => [group.groupId, group.expectedLayCapacity || 0])
      )
    );

    if (!form.flockGroupId && metricsData.groupCards.length > 0) {
      setForm((prev) => ({ ...prev, flockGroupId: metricsData.groupCards[0].groupId }));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterFrom, filterTo, filterGroupId]);

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

    setForm((prev) => ({ ...emptyForm, flockGroupId: prev.flockGroupId || form.flockGroupId }));
    setEditingId(null);
    setSaving(false);
    await loadData();
  }

  async function deleteCollection(id: string) {
    if (!window.confirm("Deseja excluir este registro de coleta?")) return;

    const response = await fetch(`/api/eggs/collections/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Não foi possível excluir o registro.");
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
      setError("Não foi possível atualizar a meta do grupo.");
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

  const monthBase = new Date();
  const monthStart = new Date(monthBase.getFullYear(), monthBase.getMonth(), 1);
  const monthEnd = new Date(monthBase.getFullYear(), monthBase.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();

  return (
    <main className="space-y-6">
      <PageTitle
        title="Coleta de Ovos"
        description="Controle diário em lista e calendário, com indicadores por grupo."
      />

      {error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-zinc-500">Ovos coletados hoje</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.eggsToday ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Ovos bons hoje</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.goodEggsToday ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Ovos trincados hoje</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.crackedEggsToday ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Taxa de ovos bons</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatPercent(metrics?.summary.goodRateToday ?? 0)}</p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-base font-semibold text-zinc-900">
            {editingId ? "Editar coleta" : "Nova coleta"}
          </h3>
          <form className="mt-4 grid gap-3" onSubmit={submitCollection}>
            <Input
              type="date"
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
            />

            <select
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
              value={form.flockGroupId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, flockGroupId: event.target.value }))
              }
            >
              <option value="">Selecione o grupo</option>
              {groups.map((group) => (
                <option key={group.groupId} value={group.groupId}>
                  {group.title}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-3 gap-3">
              <Input
                type="number"
                min={0}
                value={form.totalEggs}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, totalEggs: Number(event.target.value) }))
                }
                placeholder="Total"
              />
              <Input
                type="number"
                min={0}
                value={form.goodEggs}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, goodEggs: Number(event.target.value) }))
                }
                placeholder="Bons"
              />
              <Input
                type="number"
                min={0}
                value={form.crackedEggs}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, crackedEggs: Number(event.target.value) }))
                }
                placeholder="Trincados"
              />
            </div>

            <Input
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Observações"
            />

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : editingId ? "Atualizar coleta" : "Registrar coleta"}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setForm((prev) => ({ ...emptyForm, flockGroupId: prev.flockGroupId }));
                  }}
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-zinc-900">Filtros e visualização</h3>
          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={filterFrom} onChange={(event) => setFilterFrom(event.target.value)} />
              <Input type="date" value={filterTo} onChange={(event) => setFilterTo(event.target.value)} />
            </div>
            <select
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
              value={filterGroupId}
              onChange={(event) => setFilterGroupId(event.target.value)}
            >
              <option value="">Todos os grupos</option>
              {groups.map((group) => (
                <option key={group.groupId} value={group.groupId}>
                  {group.title}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <Button type="button" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>
                Lista
              </Button>
              <Button type="button" variant={view === "calendar" ? "default" : "outline"} onClick={() => setView("calendar")}>
                Calendário
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => {
          const width = Math.min(group.progress, 160);
          return (
            <Card key={group.groupId}>
              <h3 className="text-base font-semibold text-zinc-900">{group.title}</h3>
              <p className="text-xs text-zinc-500">
                {group.species} • {group.breed}
                {group.variety ? ` • ${group.variety}` : ""}
              </p>

              <div className="mt-3 grid gap-1 text-sm text-zinc-700">
                <p>7 dias: {group.eggs7} ovos</p>
                <p>30 dias: {group.eggs30} ovos</p>
                <p>365 dias: {group.eggs365} ovos</p>
                <p>Taxa ovos bons: {formatPercent(group.goodEggRate)}</p>
                <p>Média diária: {group.averageDaily}</p>
                <p>Média semanal: {group.averageWeekly}</p>
                <p>Média mensal: {group.averageMonthly}</p>
              </div>

              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Meta mensal de postura (ovos)</p>
                <div className="mt-2 flex gap-2">
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
                <div className="mt-3 h-2 w-full rounded-full bg-zinc-200">
                  <div className={`h-2 rounded-full ${perfColor(group.performance)}`} style={{ width: `${width}%` }} />
                </div>
                <p className="mt-2 text-xs text-zinc-600">
                  Desempenho real: {group.eggs30} / meta {group.expectedLayCapacity || 0} ({formatPercent(group.progress)})
                </p>
                <p className={`mt-1 text-xs ${group.performance === "below" ? "text-red-600" : "text-emerald-700"}`}>
                  {formatPerfLabel(group.performance)}
                </p>
              </div>
            </Card>
          );
        })}
      </section>

      <Card>
        <h3 className="text-base font-semibold text-zinc-900">Registros de coleta</h3>

        {loading ? <p className="mt-4 text-sm text-zinc-500">Carregando...</p> : null}
        {!loading && rows.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Nenhuma coleta encontrada no período selecionado.</p>
        ) : null}

        {!loading && rows.length > 0 && view === "list" ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Grupo</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2 pr-3">Bons</th>
                  <th className="py-2 pr-3">Trincados</th>
                  <th className="py-2 pr-3">Taxas</th>
                  <th className="py-2 pr-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-3">{new Date(row.date).toLocaleDateString("pt-BR")}</td>
                    <td className="py-2 pr-3">{row.flockGroup.title}</td>
                    <td className="py-2 pr-3">{row.totalEggs}</td>
                    <td className="py-2 pr-3">{row.goodEggs}</td>
                    <td className="py-2 pr-3">{row.crackedEggs}</td>
                    <td className="py-2 pr-3">
                      Bons {formatPercent(row.goodRate)} • Trincados {formatPercent(row.crackedRate)}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => {
                            setEditingId(row.id);
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && rows.length > 0 && view === "calendar" ? (
          <div className="mt-4">
            <p className="mb-2 text-sm text-zinc-600">
              Calendário de {monthBase.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </p>
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-zinc-500">
              {[
                "Dom",
                "Seg",
                "Ter",
                "Qua",
                "Qui",
                "Sex",
                "Sáb"
              ].map((label) => (
                <div key={label}>{label}</div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {Array.from({ length: monthStart.getDay() }).map((_, index) => (
                <div key={`empty-${index}`} className="h-20 rounded-md border border-zinc-100 bg-zinc-50" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const date = new Date(monthBase.getFullYear(), monthBase.getMonth(), day);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const values = calendarMap.get(key);
                return (
                  <div key={key} className="h-20 rounded-md border border-zinc-200 bg-white p-2 text-left">
                    <p className="text-xs font-semibold text-zinc-800">{day}</p>
                    <p className="mt-1 text-[11px] text-zinc-600">Total: {values?.total ?? 0}</p>
                    <p className="text-[11px] text-emerald-700">Bons: {values?.good ?? 0}</p>
                    <p className="text-[11px] text-red-600">Trinc.: {values?.cracked ?? 0}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </Card>
    </main>
  );
}
