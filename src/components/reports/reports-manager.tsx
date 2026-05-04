"use client";

import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ReportFocus = "GENERAL" | "PLANTEL" | "EGGS" | "HEALTH" | "FINANCE";
type ReportPreset = "7d" | "30d" | "90d" | "365d" | "ytd" | "custom";

type Trend = {
  current: number;
  previous: number;
  delta: number;
  deltaPct: number | null;
};

type Insight = {
  severity: "info" | "warning" | "critical";
  text: string;
};

type EstoqueGroup = {
  flockGroupId: string;
  title: string;
  species: string;
  breed: string | null;
  variety: string | null;
  quantity: number;
  value: number;
  listings: number;
  hasMissingTier: boolean;
};

type EstoqueResumo = {
  totalAnimals: number;
  totalValue: number;
  groups: EstoqueGroup[];
};

type ReportData = {
  focus: ReportFocus;
  granularity: string;
  period: { from: string; to: string; label: string };
  comparisonPeriod: { from: string; to: string; label: string } | null;
  generatedAt: string;
  kpis: {
    totalBirds: number;
    activeBirds: number;
    sickBirds: number;
    deadBirds: number;
    eggsTotal: number;
    goodEggRate: number;
    activeBatches: number;
    hatchRate: number;
    inTreatment: number;
    cureRate: number;
    monthIncome: number;
    monthExpenses: number;
    monthNet: number;
    mortalityRate: number;
    vaccinatedRate: number;
    costPerHatched: number;
    avgTicket: number;
    avgDaysToSale: number;
    totalHatched: number;
    totalSoldVitrine: number;
    totalRevenueVitrine: number;
  };
  trends: {
    eggsTotal: Trend;
    hatchRate: Trend;
    monthNet: Trend;
    monthIncome: Trend;
    monthExpenses: Trend;
    totalHatched: Trend;
    totalRevenueVitrine: Trend;
    totalSoldVitrine: Trend;
  };
  charts: {
    eggsByDay: Array<{ date: string; total: number }>;
    financeByMonth: Array<{ month: string; income: number; expenses: number; net: number }>;
    healthByMonth: Array<{ month: string; opened: number; cured: number; dead: number }>;
  };
  tables: {
    flockGroups: Array<{
      title: string;
      species: string;
      breed: string;
      variety: string | null;
      totalBirds: number;
      active: number;
      sick: number;
      dead: number;
    }>;
    incubatorBatches: Array<{
      incubator: string;
      group: string;
      eggsSet: number;
      hatched: number;
      infertile: number;
      hatchRate: number;
    }>;
    topDiagnoses: Array<{ diagnosis: string; count: number }>;
    eggCollectionsByGroup: Array<{
      group: string;
      total: number;
      good: number;
      cracked: number;
      goodRate: number;
    }>;
    vitrineSnapshot: Array<{
      group: string;
      title: string;
      ageMonths: number;
      available: number;
      currentPrice: number | null;
      stockValue: number;
    }>;
    vitrineSales: {
      totalSold: number;
      totalRevenue: number;
      byGroup: Array<{ group: string; sold: number; revenue: number }>;
    };
    quarantineCases: Array<{
      ringNumber: string;
      group: string;
      infirmary: string;
      entryDate: string;
      expectedExitDate: string;
      status: string;
      treatmentsCount: number;
    }>;
    newBirds: Array<{
      ringNumber: string;
      group: string;
      sex: "FEMALE" | "MALE" | "UNKNOWN";
      acquisitionDate: string;
      origin: string | null;
      purchaseValue: number | null;
    }>;
    topReproducers: Array<{ group: string; daughters: number; matrices: number; productivity: number }>;
    bestHatching: Array<{ incubator: string; group: string; hatched: number; hatchRate: number; eggsSet: number }>;
    worstHatching: Array<{ incubator: string; group: string; hatched: number; hatchRate: number; eggsSet: number }>;
    bestPosture: Array<{ group: string; total: number; goodRate: number }>;
    worstPosture: Array<{ group: string; total: number; goodRate: number }>;
  };
  insights: Insight[];
  conclusion: string;
};

const focusOptions: Array<{ value: ReportFocus; label: string; emoji: string }> = [
  { value: "GENERAL", label: "Geral", emoji: "📋" },
  { value: "PLANTEL", label: "Plantel & filhotes", emoji: "🦚" },
  { value: "EGGS", label: "Postura & chocadeira", emoji: "🥚" },
  { value: "HEALTH", label: "Sanidade", emoji: "💊" },
  { value: "FINANCE", label: "Financeiro & vitrine", emoji: "💰" }
];

const presetOptions: Array<{ value: ReportPreset; label: string }> = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias (trimestre)" },
  { value: "365d", label: "Últimos 365 dias" },
  { value: "ytd", label: "Ano corrente" },
  { value: "custom", label: "Intervalo personalizado" }
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatTrend(trend: Trend, format: "money" | "percent" | "number") {
  if (trend.deltaPct === null) {
    if (trend.current === 0) return null;
    return { arrow: "▲", color: "text-emerald-700", text: "novo" };
  }
  const positive = trend.delta >= 0;
  const arrow = positive ? "▲" : "▼";
  const color = positive ? "text-emerald-700" : "text-rose-700";
  let text: string;
  if (format === "percent") {
    text = `${trend.deltaPct >= 0 ? "+" : ""}${trend.deltaPct.toFixed(0)}%`;
  } else if (format === "money") {
    text = `${trend.deltaPct >= 0 ? "+" : ""}${trend.deltaPct.toFixed(0)}% (${formatMoney(trend.delta)})`;
  } else {
    text = `${trend.deltaPct >= 0 ? "+" : ""}${trend.deltaPct.toFixed(0)}%`;
  }
  return { arrow, color, text };
}

function KpiCard({
  label,
  value,
  trend,
  format,
  emoji
}: {
  label: string;
  value: string;
  trend?: Trend;
  format?: "money" | "percent" | "number";
  emoji?: string;
}) {
  const t = trend ? formatTrend(trend, format ?? "number") : null;
  return (
    <Card>
      <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">
        {emoji ? `${emoji} ` : ""}
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
      {t ? (
        <p className={`mt-1 text-xs font-semibold ${t.color}`}>
          {t.arrow} {t.text}
          <span className="ml-1 font-normal text-zinc-400">vs período anterior</span>
        </p>
      ) : null}
    </Card>
  );
}

// Cada foco tem seu proprio conjunto de KPIs primarios e secoes visiveis
type FocusConfig = {
  primaryKpis: Array<"eggs" | "hatched" | "hatchRate" | "net" | "totalBirds" | "mortality" | "vaccinated" | "inTreatment" | "cureRate" | "goodEgg" | "income" | "expenses" | "revenue" | "ticket" | "daysToSale" | "costPerHatched" | "soldVitrine">;
  show: {
    insights: boolean;
    secondaryKpis: boolean;
    topReproducers: boolean;
    bestHatching: boolean;
    worstHatching: boolean;
    bestPosture: boolean;
    flockGroupsTable: boolean;
    eggCollectionsTable: boolean;
    incubatorBatchesTable: boolean;
    quarantineTable: boolean;
    diagnosesTable: boolean;
    vitrineEstoque: boolean;
    revenueByGroup: boolean;
    newBirds: boolean;
  };
};

const focusConfigs: Record<ReportFocus, FocusConfig> = {
  GENERAL: {
    primaryKpis: ["eggs", "hatched", "hatchRate", "net"],
    show: {
      insights: true,
      secondaryKpis: true,
      topReproducers: true,
      bestHatching: true,
      worstHatching: true,
      bestPosture: true,
      flockGroupsTable: true,
      eggCollectionsTable: true,
      incubatorBatchesTable: false,
      quarantineTable: true,
      diagnosesTable: true,
      vitrineEstoque: true,
      revenueByGroup: true,
      newBirds: true
    }
  },
  PLANTEL: {
    primaryKpis: ["totalBirds", "hatched", "mortality", "vaccinated"],
    show: {
      insights: true,
      secondaryKpis: false,
      topReproducers: true,
      bestHatching: false,
      worstHatching: false,
      bestPosture: false,
      flockGroupsTable: true,
      eggCollectionsTable: false,
      incubatorBatchesTable: false,
      quarantineTable: false,
      diagnosesTable: false,
      vitrineEstoque: false,
      revenueByGroup: false,
      newBirds: true
    }
  },
  EGGS: {
    primaryKpis: ["eggs", "goodEgg", "hatched", "hatchRate"],
    show: {
      insights: true,
      secondaryKpis: false,
      topReproducers: false,
      bestHatching: true,
      worstHatching: true,
      bestPosture: true,
      flockGroupsTable: false,
      eggCollectionsTable: true,
      incubatorBatchesTable: true,
      quarantineTable: false,
      diagnosesTable: false,
      vitrineEstoque: false,
      revenueByGroup: false,
      newBirds: false
    }
  },
  HEALTH: {
    primaryKpis: ["mortality", "vaccinated", "inTreatment", "cureRate"],
    show: {
      insights: true,
      secondaryKpis: false,
      topReproducers: false,
      bestHatching: false,
      worstHatching: false,
      bestPosture: false,
      flockGroupsTable: false,
      eggCollectionsTable: false,
      incubatorBatchesTable: false,
      quarantineTable: true,
      diagnosesTable: true,
      vitrineEstoque: false,
      revenueByGroup: false,
      newBirds: false
    }
  },
  FINANCE: {
    primaryKpis: ["net", "revenue", "ticket", "daysToSale"],
    show: {
      insights: true,
      secondaryKpis: false,
      topReproducers: false,
      bestHatching: false,
      worstHatching: false,
      bestPosture: false,
      flockGroupsTable: false,
      eggCollectionsTable: false,
      incubatorBatchesTable: false,
      quarantineTable: false,
      diagnosesTable: false,
      vitrineEstoque: true,
      revenueByGroup: true,
      newBirds: false
    }
  }
};

function renderKpi(
  key: FocusConfig["primaryKpis"][number],
  data: ReportData
) {
  switch (key) {
    case "eggs":
      return (
        <KpiCard
          key={key}
          label="Ovos no período"
          value={String(data.kpis.eggsTotal)}
          trend={data.trends.eggsTotal}
          format="number"
          emoji="🥚"
        />
      );
    case "hatched":
      return (
        <KpiCard
          key={key}
          label="Filhotes nascidos"
          value={String(data.kpis.totalHatched)}
          trend={data.trends.totalHatched}
          format="number"
          emoji="🐣"
        />
      );
    case "hatchRate":
      return (
        <KpiCard
          key={key}
          label="Taxa de eclosão"
          value={formatPercent(data.kpis.hatchRate)}
          trend={data.trends.hatchRate}
          format="percent"
          emoji="📈"
        />
      );
    case "net":
      return (
        <KpiCard
          key={key}
          label="Resultado financeiro"
          value={formatMoney(data.kpis.monthNet)}
          trend={data.trends.monthNet}
          format="money"
          emoji="💰"
        />
      );
    case "totalBirds":
      return (
        <KpiCard
          key={key}
          label="Total de aves"
          value={String(data.kpis.totalBirds)}
          emoji="🐥"
        />
      );
    case "mortality":
      return (
        <KpiCard
          key={key}
          label="Mortalidade"
          value={formatPercent(data.kpis.mortalityRate)}
          emoji="💀"
        />
      );
    case "vaccinated":
      return (
        <KpiCard
          key={key}
          label="Vacinação"
          value={formatPercent(data.kpis.vaccinatedRate)}
          emoji="💉"
        />
      );
    case "inTreatment":
      return (
        <KpiCard
          key={key}
          label="Em tratamento"
          value={String(data.kpis.inTreatment)}
          emoji="🏥"
        />
      );
    case "cureRate":
      return (
        <KpiCard
          key={key}
          label="Taxa de cura"
          value={formatPercent(data.kpis.cureRate)}
          emoji="✅"
        />
      );
    case "goodEgg":
      return (
        <KpiCard
          key={key}
          label="Ovos bons"
          value={formatPercent(data.kpis.goodEggRate)}
          emoji="✨"
        />
      );
    case "income":
      return (
        <KpiCard
          key={key}
          label="Entradas"
          value={formatMoney(data.kpis.monthIncome)}
          trend={data.trends.monthIncome}
          format="money"
          emoji="📥"
        />
      );
    case "expenses":
      return (
        <KpiCard
          key={key}
          label="Saídas"
          value={formatMoney(data.kpis.monthExpenses)}
          trend={data.trends.monthExpenses}
          format="money"
          emoji="📤"
        />
      );
    case "revenue":
      return (
        <KpiCard
          key={key}
          label="Receita vitrine"
          value={formatMoney(data.kpis.totalRevenueVitrine)}
          trend={data.trends.totalRevenueVitrine}
          format="money"
          emoji="🏪"
        />
      );
    case "ticket":
      return (
        <KpiCard
          key={key}
          label="Ticket médio"
          value={data.kpis.avgTicket > 0 ? formatMoney(data.kpis.avgTicket) : "—"}
          emoji="💵"
        />
      );
    case "daysToSale":
      return (
        <KpiCard
          key={key}
          label="Dias até venda"
          value={data.kpis.avgDaysToSale > 0 ? `${data.kpis.avgDaysToSale}d` : "—"}
          emoji="⏱️"
        />
      );
    case "costPerHatched":
      return (
        <KpiCard
          key={key}
          label="Custo / filhote"
          value={data.kpis.costPerHatched > 0 ? formatMoney(data.kpis.costPerHatched) : "—"}
          emoji="📦"
        />
      );
    case "soldVitrine":
      return (
        <KpiCard
          key={key}
          label="Aves vendidas"
          value={String(data.kpis.totalSoldVitrine)}
          trend={data.trends.totalSoldVitrine}
          format="number"
          emoji="🛒"
        />
      );
    default:
      return null;
  }
}

export function ReportsManager() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [focus, setFocus] = useState<ReportFocus>("GENERAL");
  const [preset, setPreset] = useState<ReportPreset>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [data, setData] = useState<ReportData | null>(null);
  const [estoque, setEstoque] = useState<EstoqueResumo | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("focus", focus);
    params.set("granularity", "DETAILED");
    params.set("preset", preset);
    if (preset === "custom") {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }

    try {
      const [reportRes, estoqueRes] = await Promise.all([
        fetch(`/api/reports/data?${params.toString()}`, { cache: "no-store" }),
        fetch(`/api/reports/estoque`, { cache: "no-store" })
      ]);

      if (!reportRes.ok) {
        let message = "Não foi possível gerar o relatório.";
        try {
          const body = (await reportRes.json()) as { error?: string };
          if (body?.error) message = `Não foi possível gerar o relatório: ${body.error}`;
        } catch {
          // body wasn't JSON
        }
        setError(message);
        setLoading(false);
        return;
      }

      const payload = (await reportRes.json()) as ReportData;
      setData(payload);

      if (estoqueRes.ok) {
        const estoquePayload = (await estoqueRes.json()) as EstoqueResumo;
        setEstoque(estoquePayload);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro de rede ao carregar o relatório.";
      setError(`Não foi possível gerar o relatório: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, preset, from, to]);

  const pdfUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("focus", focus);
    params.set("granularity", "DETAILED");
    params.set("preset", preset);
    if (preset === "custom") {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    return `/api/reports/pdf?${params.toString()}`;
  }, [focus, preset, from, to]);

  const cfg = focusConfigs[focus];

  return (
    <main className="space-y-6">
      <PageTitle
        title="Relatórios"
        description="Cada foco mostra apenas o tema escolhido. Tendência automática vs período anterior."
        icon="📊"
      />

      {error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Foco
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {focusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFocus(opt.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    focus === opt.value
                      ? "bg-[color:var(--brand-strong)] text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Período
              </label>
              <select
                className="mt-2 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
                value={preset}
                onChange={(e) => setPreset(e.target.value as ReportPreset)}
              >
                {presetOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {preset === "custom" ? (
              <>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">De</label>
                  <Input type="date" className="mt-2" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Até</label>
                  <Input type="date" className="mt-2" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">De</label>
                  <Input disabled className="mt-2" value={data?.period.from ?? ""} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Até</label>
                  <Input disabled className="mt-2" value={data?.period.to ?? ""} />
                </div>
              </>
            )}
          </div>

          {data?.comparisonPeriod ? (
            <p className="text-xs text-slate-500">
              Comparando com período anterior: {data.comparisonPeriod.label}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={loadData}>
              Atualizar
            </Button>
            <a href={pdfUrl}>
              <Button type="button" variant="outline">
                Exportar PDF
              </Button>
            </a>
          </div>
        </div>
      </Card>

      {loading ? <p className="text-sm text-zinc-500">Gerando relatório...</p> : null}

      {data ? (
        <>
          {cfg.show.insights && data.insights.length > 0 ? (
            <Card>
              <h3 className="text-base font-semibold text-zinc-900">💡 Insights do período</h3>
              <ul className="mt-3 grid gap-2">
                {data.insights.map((insight, i) => {
                  const severityClass =
                    insight.severity === "critical"
                      ? "border-rose-200 bg-rose-50 text-rose-900"
                      : insight.severity === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-sky-200 bg-sky-50 text-sky-900";
                  const icon =
                    insight.severity === "critical" ? "🚨" : insight.severity === "warning" ? "⚠️" : "ℹ️";
                  return (
                    <li key={i} className={`flex gap-2 rounded-xl border px-3 py-2 text-sm ${severityClass}`}>
                      <span className="shrink-0">{icon}</span>
                      <span>{insight.text}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}

          {/* KPIs primarios — variam por foco */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
            {cfg.primaryKpis.map((key) => renderKpi(key, data))}
          </section>

          {/* KPIs secundarios so em GENERAL */}
          {cfg.show.secondaryKpis ? (
            <section className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
              <KpiCard label="Receita vitrine" value={formatMoney(data.kpis.totalRevenueVitrine)} trend={data.trends.totalRevenueVitrine} format="money" emoji="🏪" />
              <KpiCard label="Aves vendidas" value={String(data.kpis.totalSoldVitrine)} trend={data.trends.totalSoldVitrine} format="number" emoji="🛒" />
              <KpiCard label="Mortalidade" value={formatPercent(data.kpis.mortalityRate)} emoji="💀" />
              <KpiCard label="Vacinação" value={formatPercent(data.kpis.vaccinatedRate)} emoji="💉" />
            </section>
          ) : null}

          {/* RANKINGS — sempre 1 linha visualmente, mas conteudo filtrado */}
          {(cfg.show.topReproducers && data.tables.topReproducers.length > 0) ||
          (cfg.show.bestHatching && data.tables.bestHatching.length > 0) ||
          (cfg.show.worstHatching && data.tables.worstHatching.length > 0) ||
          (cfg.show.bestPosture && data.tables.bestPosture.length > 0) ? (
            <section className="grid gap-4 lg:grid-cols-2">
              {cfg.show.topReproducers && data.tables.topReproducers.length > 0 ? (
                <Card>
                  <h3 className="text-base font-semibold text-zinc-900">🏆 Top reprodutores</h3>
                  <p className="mt-1 text-xs text-slate-500">Lotes pais que mais geraram filhotes no período</p>
                  <table className="mt-3 min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-zinc-500">
                        <th className="py-1.5 pr-3">Lote</th>
                        <th className="py-1.5 pr-3 text-right">Filhotes</th>
                        <th className="py-1.5 pr-3 text-right">Matrizes</th>
                        <th className="py-1.5 pr-3 text-right">Por matriz</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.tables.topReproducers.map((r, i) => (
                        <tr key={i} className="border-b border-zinc-100">
                          <td className="py-1.5 pr-3 font-medium text-zinc-900">{r.group}</td>
                          <td className="py-1.5 pr-3 text-right">{r.daughters}</td>
                          <td className="py-1.5 pr-3 text-right">{r.matrices}</td>
                          <td className="py-1.5 pr-3 text-right">{r.productivity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              ) : null}

              {cfg.show.bestHatching && data.tables.bestHatching.length > 0 ? (
                <Card>
                  <h3 className="text-base font-semibold text-zinc-900">🐣 Melhores eclosões</h3>
                  <p className="mt-1 text-xs text-slate-500">Chocadeiras com maior taxa no período</p>
                  <ul className="mt-3 grid gap-1.5 text-sm">
                    {data.tables.bestHatching.map((b, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="truncate text-zinc-700">{b.incubator} · {b.group}</span>
                        <span className="shrink-0 font-semibold text-emerald-700">
                          {formatPercent(b.hatchRate)} ({b.hatched}/{b.eggsSet})
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}

              {cfg.show.worstHatching && data.tables.worstHatching.length > 0 ? (
                <Card>
                  <h3 className="text-base font-semibold text-zinc-900">⚠️ Eclosões abaixo da média</h3>
                  <p className="mt-1 text-xs text-slate-500">Investigar temperatura/umidade</p>
                  <ul className="mt-3 grid gap-1.5 text-sm">
                    {data.tables.worstHatching.map((b, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="truncate text-zinc-700">{b.incubator} · {b.group}</span>
                        <span className="shrink-0 font-semibold text-rose-700">
                          {formatPercent(b.hatchRate)} ({b.hatched}/{b.eggsSet})
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}

              {cfg.show.bestPosture && data.tables.bestPosture.length > 0 ? (
                <Card>
                  <h3 className="text-base font-semibold text-zinc-900">🥚 Maiores posturas</h3>
                  <p className="mt-1 text-xs text-slate-500">Lotes que mais coletaram ovos</p>
                  <ul className="mt-3 grid gap-1.5 text-sm">
                    {data.tables.bestPosture.map((g, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="truncate text-zinc-700">{g.group}</span>
                        <span className="shrink-0 font-semibold text-amber-700">
                          {g.total} ovos · {formatPercent(g.goodRate)} bons
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </section>
          ) : null}

          {/* Plantel por grupo */}
          {cfg.show.flockGroupsTable ? (
            <Card>
              <h3 className="text-base font-semibold text-zinc-900">Plantel por grupo</h3>
              {data.tables.flockGroups.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">Sem grupos cadastrados.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-zinc-500">
                        <th className="py-2 pr-3">Grupo</th>
                        <th className="py-2 pr-3">Espécie</th>
                        <th className="py-2 pr-3 text-right">Total</th>
                        <th className="py-2 pr-3 text-right">Ativas</th>
                        <th className="py-2 pr-3 text-right">Doentes</th>
                        <th className="py-2 pr-3 text-right">Mortas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.tables.flockGroups.slice(0, 10).map((group) => (
                        <tr key={group.title} className="border-b border-zinc-100">
                          <td className="py-2 pr-3">{group.title}</td>
                          <td className="py-2 pr-3">{group.species}</td>
                          <td className="py-2 pr-3 text-right">{group.totalBirds}</td>
                          <td className="py-2 pr-3 text-right">{group.active}</td>
                          <td className="py-2 pr-3 text-right">{group.sick}</td>
                          <td className="py-2 pr-3 text-right">{group.dead}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ) : null}

          {/* Coleta de ovos */}
          {cfg.show.eggCollectionsTable && data.tables.eggCollectionsByGroup.length > 0 ? (
            <Card>
              <h3 className="text-base font-semibold text-zinc-900">Coleta de ovos por grupo</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-zinc-500">
                      <th className="py-2 pr-3">Grupo</th>
                      <th className="py-2 pr-3 text-right">Total</th>
                      <th className="py-2 pr-3 text-right">Bons</th>
                      <th className="py-2 pr-3 text-right">Trincados</th>
                      <th className="py-2 pr-3 text-right">% Bons</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tables.eggCollectionsByGroup.slice(0, 12).map((row, i) => (
                      <tr key={i} className="border-b border-zinc-100">
                        <td className="py-2 pr-3">{row.group}</td>
                        <td className="py-2 pr-3 text-right">{row.total}</td>
                        <td className="py-2 pr-3 text-right">{row.good}</td>
                        <td className="py-2 pr-3 text-right">{row.cracked}</td>
                        <td className="py-2 pr-3 text-right">{formatPercent(row.goodRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {/* Chocadeiras detalhadas */}
          {cfg.show.incubatorBatchesTable && data.tables.incubatorBatches.length > 0 ? (
            <Card>
              <h3 className="text-base font-semibold text-zinc-900">Chocadeiras e lotes</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-zinc-500">
                      <th className="py-2 pr-3">Chocadeira</th>
                      <th className="py-2 pr-3">Grupo</th>
                      <th className="py-2 pr-3 text-right">Ovos</th>
                      <th className="py-2 pr-3 text-right">Nascidos</th>
                      <th className="py-2 pr-3 text-right">Inférteis</th>
                      <th className="py-2 pr-3 text-right">Eclosão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tables.incubatorBatches.slice(0, 12).map((b, i) => (
                      <tr key={i} className="border-b border-zinc-100">
                        <td className="py-2 pr-3">{b.incubator}</td>
                        <td className="py-2 pr-3">{b.group}</td>
                        <td className="py-2 pr-3 text-right">{b.eggsSet}</td>
                        <td className="py-2 pr-3 text-right">{b.hatched}</td>
                        <td className="py-2 pr-3 text-right">{b.infertile}</td>
                        <td className="py-2 pr-3 text-right">{formatPercent(b.hatchRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {/* Quarentena */}
          {cfg.show.quarantineTable && data.tables.quarantineCases.length > 0 ? (
            <Card>
              <h3 className="text-base font-semibold text-zinc-900">🛡️ Quarentenas (ativas + iniciadas no período)</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-zinc-500">
                      <th className="py-2 pr-3">Anilha</th>
                      <th className="py-2 pr-3">Grupo</th>
                      <th className="py-2 pr-3">Enfermaria</th>
                      <th className="py-2 pr-3">Entrada</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3 text-right">Trat.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tables.quarantineCases.slice(0, 12).map((q, i) => (
                      <tr key={i} className="border-b border-zinc-100">
                        <td className="py-2 pr-3">{q.ringNumber}</td>
                        <td className="py-2 pr-3">{q.group}</td>
                        <td className="py-2 pr-3">{q.infirmary}</td>
                        <td className="py-2 pr-3">{new Date(q.entryDate).toLocaleDateString("pt-BR")}</td>
                        <td className="py-2 pr-3">{q.status}</td>
                        <td className="py-2 pr-3 text-right">{q.treatmentsCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {/* Diagnosticos */}
          {cfg.show.diagnosesTable && data.tables.topDiagnoses.length > 0 ? (
            <Card>
              <h3 className="text-base font-semibold text-zinc-900">🩺 Diagnósticos recorrentes</h3>
              <table className="mt-3 min-w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="py-2 pr-3">Diagnóstico</th>
                    <th className="py-2 pr-3 text-right">Ocorrências</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tables.topDiagnoses.map((d, i) => (
                    <tr key={i} className="border-b border-zinc-100">
                      <td className="py-2 pr-3">{d.diagnosis}</td>
                      <td className="py-2 pr-3 text-right">{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : null}

          {/* Estoque vitrine */}
          {cfg.show.vitrineEstoque && estoque ? (
            <Card>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-zinc-900">🏪 Estoque para venda (Vitrine)</h3>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="text-zinc-500">
                    Total: <strong className="text-zinc-900">{estoque.totalAnimals}</strong> ave(s)
                  </span>
                  <span className="text-zinc-500">
                    Valor: <strong className="text-zinc-900">{formatMoney(estoque.totalValue)}</strong>
                  </span>
                </div>
              </div>

              {estoque.groups.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">Nenhum animal disponível na Vitrine no momento.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-zinc-500">
                        <th className="py-2 pr-3">Card</th>
                        <th className="py-2 pr-3">Taxonomia</th>
                        <th className="py-2 pr-3 text-right">Lotes</th>
                        <th className="py-2 pr-3 text-right">Disponíveis</th>
                        <th className="py-2 pr-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estoque.groups.map((group) => {
                        const taxonomy = [group.species, group.breed, group.variety]
                          .filter(Boolean)
                          .join(" / ");
                        return (
                          <tr key={group.flockGroupId} className="border-b border-zinc-100">
                            <td className="py-2 pr-3 font-medium text-zinc-900">
                              {group.title}
                              {group.hasMissingTier ? (
                                <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-700">
                                  sem preço
                                </span>
                              ) : null}
                            </td>
                            <td className="py-2 pr-3 text-zinc-600">{taxonomy}</td>
                            <td className="py-2 pr-3 text-right">{group.listings}</td>
                            <td className="py-2 pr-3 text-right">{group.quantity}</td>
                            <td className="py-2 pr-3 text-right">{formatMoney(group.value)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ) : null}

          {/* Receita por grupo (vitrine) */}
          {cfg.show.revenueByGroup && data.tables.vitrineSales.byGroup.length > 0 ? (
            <Card>
              <h3 className="text-base font-semibold text-zinc-900">💰 Receita por grupo (vitrine)</h3>
              <table className="mt-3 min-w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="py-2 pr-3">Grupo</th>
                    <th className="py-2 pr-3 text-right">Vendidas</th>
                    <th className="py-2 pr-3 text-right">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tables.vitrineSales.byGroup.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-zinc-100">
                      <td className="py-2 pr-3">{row.group}</td>
                      <td className="py-2 pr-3 text-right">{row.sold}</td>
                      <td className="py-2 pr-3 text-right">{formatMoney(row.revenue)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td className="py-2 pr-3">Total</td>
                    <td className="py-2 pr-3 text-right">{data.tables.vitrineSales.totalSold}</td>
                    <td className="py-2 pr-3 text-right">{formatMoney(data.tables.vitrineSales.totalRevenue)}</td>
                  </tr>
                </tbody>
              </table>
            </Card>
          ) : null}

          {/* Novas aves no plantel */}
          {cfg.show.newBirds && data.tables.newBirds.length > 0 ? (
            <Card>
              <h3 className="text-base font-semibold text-zinc-900">🐥 Novas aves no plantel</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-zinc-500">
                      <th className="py-2 pr-3">Anilha</th>
                      <th className="py-2 pr-3">Grupo</th>
                      <th className="py-2 pr-3">Sexo</th>
                      <th className="py-2 pr-3">Aquisição</th>
                      <th className="py-2 pr-3">Origem</th>
                      <th className="py-2 pr-3 text-right">Custo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tables.newBirds.slice(0, 12).map((b, i) => (
                      <tr key={i} className="border-b border-zinc-100">
                        <td className="py-2 pr-3">{b.ringNumber}</td>
                        <td className="py-2 pr-3">{b.group}</td>
                        <td className="py-2 pr-3">
                          {b.sex === "FEMALE" ? "Fêmea" : b.sex === "MALE" ? "Macho" : "—"}
                        </td>
                        <td className="py-2 pr-3">{new Date(b.acquisitionDate).toLocaleDateString("pt-BR")}</td>
                        <td className="py-2 pr-3">{b.origin ?? "—"}</td>
                        <td className="py-2 pr-3 text-right">
                          {b.purchaseValue !== null ? formatMoney(b.purchaseValue) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
