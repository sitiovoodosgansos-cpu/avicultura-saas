"use client";

import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ReportType = "GENERAL" | "FLOCK" | "EGG" | "INCUBATOR" | "HEALTH" | "FINANCIAL";
type ReportPreset = "7d" | "30d" | "365d" | "custom";

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
  const [estoque, setEstoque] = useState<EstoqueResumo | null>(null);

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
          // body wasn't JSON; keep the generic message
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
        icon="📊"
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

          {estoque ? (
            <Card>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-zinc-900">
                  🛍️ Estoque para venda (Vitrine)
                </h3>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="text-zinc-500">
                    Total:{" "}
                    <strong className="text-zinc-900">{estoque.totalAnimals}</strong> ave(s)
                  </span>
                  <span className="text-zinc-500">
                    Valor:{" "}
                    <strong className="text-zinc-900">{formatMoney(estoque.totalValue)}</strong>
                  </span>
                </div>
              </div>

              {estoque.groups.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">
                  Nenhum animal disponível na Vitrine no momento.
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-zinc-500">
                        <th className="py-2 pr-3">Card</th>
                        <th className="py-2 pr-3">Taxonomia</th>
                        <th className="py-2 pr-3">Lotes</th>
                        <th className="py-2 pr-3">Disponíveis</th>
                        <th className="py-2 pr-3">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estoque.groups.map((group) => {
                        const taxonomy = [group.species, group.breed, group.variety]
                          .filter(Boolean)
                          .join(" / ");
                        return (
                          <tr
                            key={group.flockGroupId}
                            className="border-b border-zinc-100"
                          >
                            <td className="py-2 pr-3 font-medium text-zinc-900">
                              {group.title}
                              {group.hasMissingTier ? (
                                <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-700">
                                  sem preço
                                </span>
                              ) : null}
                            </td>
                            <td className="py-2 pr-3 text-zinc-600">{taxonomy}</td>
                            <td className="py-2 pr-3">{group.listings}</td>
                            <td className="py-2 pr-3">{group.quantity}</td>
                            <td className="py-2 pr-3">{formatMoney(group.value)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ) : null}

          <Card>
            <h3 className="text-base font-semibold text-zinc-900">Conclusão automática</h3>
            <p className="mt-3 text-sm text-zinc-700">{data.conclusion}</p>
          </Card>
        </>
      ) : null}
    </main>
  );
}
