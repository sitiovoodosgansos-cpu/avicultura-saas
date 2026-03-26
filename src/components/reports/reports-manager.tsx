"use client";

import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ReportType = "GENERAL" | "FLOCK" | "EGG" | "INCUBATOR" | "HEALTH" | "FINANCIAL";
type ReportPreset = "7d" | "30d" | "365d" | "custom";

type ReportData = {
  reportType: ReportType;
  period: { from: string; to: string; label: string };
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
  };
  conclusion: string;
};

const reportTypeOptions: Array<{ value: ReportType; label: string }> = [
  { value: "GENERAL", label: "Relatório geral" },
  { value: "FLOCK", label: "Relatório do plantel" },
  { value: "EGG", label: "Relatório de postura" },
  { value: "INCUBATOR", label: "Relatório das chocadeiras" },
  { value: "HEALTH", label: "Relatório de sanidade" },
  { value: "FINANCIAL", label: "Relatório financeiro" }
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export function ReportsManager() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<ReportType>("GENERAL");
  const [preset, setPreset] = useState<ReportPreset>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [data, setData] = useState<ReportData | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("type", type);
    params.set("preset", preset);
    if (preset === "custom") {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }

    const res = await fetch(`/api/reports/data?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) {
      setError("Não foi possível gerar o relatório.");
      setLoading(false);
      return;
    }

    const payload = (await res.json()) as ReportData;
    setData(payload);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, preset, from, to]);

  const pdfUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("type", type);
    params.set("preset", preset);
    if (preset === "custom") {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    return `/api/reports/pdf?${params.toString()}`;
  }, [type, preset, from, to]);

  return (
    <main className="space-y-6">
      <PageTitle
        title="Relatórios"
        description="Consolidação do progresso do sítio com exportação em PDF profissional."
        icon="\u{1F4CA}"
      />

      {error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : null}

      <Card>
        <h3 className="text-base font-semibold text-zinc-900">Filtros do relatório</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={type} onChange={(e) => setType(e.target.value as ReportType)}>
            {reportTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={preset} onChange={(e) => setPreset(e.target.value as ReportPreset)}>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="365d">Últimos 365 dias</option>
            <option value="custom">Intervalo personalizado</option>
          </select>

          {preset === "custom" ? (
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          ) : (
            <Input disabled value={data?.period.from ?? ""} />
          )}
          {preset === "custom" ? (
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          ) : (
            <Input disabled value={data?.period.to ?? ""} />
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button type="button" onClick={loadData}>Atualizar relatório</Button>
          <a href={pdfUrl}>
            <Button type="button" variant="outline">Exportar PDF</Button>
          </a>
        </div>
      </Card>

      {loading ? <p className="text-sm text-zinc-500">Gerando relatório...</p> : null}

      {data ? (
        <>
          <section className="mobile-kpi-grid grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
            <Card>
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">🐥 Total de aves</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">{data.kpis.totalBirds}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">🥚 Ovos no periodo</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">{data.kpis.eggsTotal}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">🐣 Taxa de eclosao</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatPercent(data.kpis.hatchRate)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">💰 Resultado financeiro</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatMoney(data.kpis.monthNet)}</p>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="text-base font-semibold text-zinc-900">Indicadores principais</h3>
              <div className="mt-3 space-y-1 text-sm text-zinc-700">
                <p>Aves ativas: {data.kpis.activeBirds}</p>
                <p>Aves doentes: {data.kpis.sickBirds}</p>
                <p>Aves mortas: {data.kpis.deadBirds}</p>
                <p>Taxa de ovos bons: {formatPercent(data.kpis.goodEggRate)}</p>
                <p>Lotes ativos: {data.kpis.activeBatches}</p>
                <p>Aves em tratamento: {data.kpis.inTreatment}</p>
                <p>Taxa de cura: {formatPercent(data.kpis.cureRate)}</p>
              </div>
            </Card>

            <Card>
              <h3 className="text-base font-semibold text-zinc-900">Resumo financeiro</h3>
              <div className="mt-3 space-y-1 text-sm text-zinc-700">
                <p>Entradas: {formatMoney(data.kpis.monthIncome)}</p>
                <p>Saídas: {formatMoney(data.kpis.monthExpenses)}</p>
                <p>Líquido: {formatMoney(data.kpis.monthNet)}</p>
                <p>Evolução mensal registrada: {data.charts.financeByMonth.length} mês(es)</p>
              </div>
            </Card>
          </section>

          <Card>
            <h3 className="text-base font-semibold text-zinc-900">Tabela resumida do plantel</h3>
            {data.tables.flockGroups.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Sem grupos cadastrados.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-zinc-500">
                      <th className="py-2 pr-3">Grupo</th>
                      <th className="py-2 pr-3">Espécie</th>
                      <th className="py-2 pr-3">Total</th>
                      <th className="py-2 pr-3">Ativas</th>
                      <th className="py-2 pr-3">Doentes</th>
                      <th className="py-2 pr-3">Mortas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tables.flockGroups.slice(0, 10).map((group) => (
                      <tr key={group.title} className="border-b border-zinc-100">
                        <td className="py-2 pr-3">{group.title}</td>
                        <td className="py-2 pr-3">{group.species}</td>
                        <td className="py-2 pr-3">{group.totalBirds}</td>
                        <td className="py-2 pr-3">{group.active}</td>
                        <td className="py-2 pr-3">{group.sick}</td>
                        <td className="py-2 pr-3">{group.dead}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-zinc-900">Conclusão automática</h3>
            <p className="mt-3 text-sm text-zinc-700">{data.conclusion}</p>
          </Card>
        </>
      ) : null}
    </main>
  );
}
