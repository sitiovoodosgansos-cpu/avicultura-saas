import { redirect } from "next/navigation";
import {
  Bird,
  Egg,
  Wallet,
  CalendarDays,
  TrendingUp,
  Heart,
  Sparkles,
  EggFried,
  PiggyBank,
  Users,
  Stethoscope,
  Filter,
  Award,
  Receipt
} from "lucide-react";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LineChartCard } from "@/components/dashboard/line-chart-card";
import { StackedBarsCard } from "@/components/dashboard/stacked-bars-card";
import { DonutCard } from "@/components/dashboard/donut-card";
import { BarCard } from "@/components/dashboard/bar-card";
import { HeatmapCard } from "@/components/dashboard/heatmap-card";
import { GaugeCard } from "@/components/dashboard/gauge-card";
import { StackedResultsCard } from "@/components/dashboard/stacked-results-card";
import { FunnelCard } from "@/components/dashboard/funnel-card";
import { StackedHorizontalCard } from "@/components/dashboard/stacked-horizontal-card";
import { getCurrentSession } from "@/lib/auth/session";
import { getTenantBilling } from "@/lib/billing/service";
import { getDashboardDataSafe } from "@/lib/dashboard/queries";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export default async function DashboardPage() {
  const session = await getCurrentSession();
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <main>
        <PageTitle
          title="Dashboard"
          description="Resumo consolidado do plantel, ovos, sanidade, chocadeiras e finanças."
          icon="🏠"
        />
        <Card>
          <p className="text-sm text-red-600">Sessão inválida. Faça login novamente.</p>
        </Card>
      </main>
    );
  }

  const billing = await getTenantBilling(tenantId);
  if (!billing?.isAccessAllowed) {
    redirect("/perfil?billing=required");
  }

  let data;
  try {
    data = await getDashboardDataSafe(tenantId);
  } catch (err) {
    console.error("[dashboard] getDashboardDataSafe threw:", err);
    throw err;
  }

  const chartEggs = data.charts.eggCollection.map((row) => ({ label: row.label, value: row.total }));
  const chartAviaryGrowth = data.charts.aviaryGrowth.map((row) => ({
    label: row.label,
    value: row.arrivals
  }));
  const chartIncubator = data.charts.incubatorPerformance.map((row) => ({ label: row.label, value: row.hatchRate }));
  const chartHealthOpen = data.charts.healthEvolution.map((row) => ({ label: row.label, value: row.openCases }));
  const chartHatchByMonth = data.charts.hatchByMonth.map((row) => ({ label: row.label, value: row.born }));
  const chartSalesByMonth = data.charts.salesByMonth.map((row) => ({ label: row.label, value: row.total }));

  return (
    <main className="space-y-6">
      <PageTitle
        title="Dashboard"
        description="Resumo consolidado do plantel, ovos, sanidade, chocadeiras e finanças."
        icon="🏠"
      />

      <Card>
        <p className="text-sm">DEBUG: dashboard renderizando OK ate aqui. data.kpis.totalBirds = {data.kpis.totalBirds}</p>
      </Card>

      {false && (<>
      {data.warning ? (
        <Card>
          <p className="text-sm text-amber-700">{data.warning}</p>
        </Card>
      ) : null}

      <section className="mobile-kpi-grid grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Aves totais"
          value={String(data.kpis.totalBirds)}
          icon={<Bird className="h-5 w-5" />}
          palette="emerald"
          hint={`Ativas: ${data.kpis.activeBirds} | Doentes: ${data.kpis.sickBirds} | Mortas: ${data.kpis.deadBirds}`}
        />
        <KpiCard
          title="Grupos de aves"
          value={String(data.kpis.flockGroups)}
          icon={<Users className="h-5 w-5" />}
          palette="indigo"
          hint={`Chocas: ${data.kpis.broodyBirds}`}
        />
        <KpiCard
          title="Ovos coletados hoje"
          value={String(data.kpis.eggsToday)}
          icon={<Egg className="h-5 w-5" />}
          palette="amber"
          hint={`Bons: ${data.kpis.goodEggsToday} | Trincados: ${data.kpis.crackedEggsToday} | Taxa bons: ${formatPercent(data.kpis.goodEggRateToday)}`}
        />
        <KpiCard
          title="Financeiro do mês"
          value={formatCurrency(data.kpis.monthNet)}
          icon={<Wallet className="h-5 w-5" />}
          palette="emerald"
          hint={`Entradas: ${formatCurrency(data.kpis.monthIncome)} | Saídas: ${formatCurrency(data.kpis.monthExpenses)}`}
        />
      </section>

      <section className="mobile-kpi-grid grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Lotes ativos"
          value={String(data.kpis.activeBatches)}
          icon={<EggFried className="h-5 w-5" />}
          palette="orange"
          hint={`Taxa eclosão: ${formatPercent(data.kpis.hatchRate)} | Infertilidade: ${formatPercent(data.kpis.infertilityRate)}`}
        />
        <KpiCard
          title="Aves em enfermaria"
          value={String(data.kpis.birdsInInfirmary)}
          icon={<Stethoscope className="h-5 w-5" />}
          palette="pink"
          hint={`Taxa recuperação: ${formatPercent(data.kpis.recoveryRate)}`}
        />
        <KpiCard
          title="Resumo 7 dias"
          value={`${data.periodSummary.days7.eggs} ovos`}
          icon={<CalendarDays className="h-5 w-5" />}
          palette="sky"
          hint={`Resultado: ${formatCurrency(data.periodSummary.days7.net)} | Casos: ${data.periodSummary.days7.healthCases}`}
        />
        <KpiCard
          title="Resumo 30 / 365 dias"
          value={`${data.periodSummary.days30.eggs} / ${data.periodSummary.days365.eggs} ovos`}
          icon={<TrendingUp className="h-5 w-5" />}
          palette="violet"
          hint={`Resultado 30d: ${formatCurrency(data.periodSummary.days30.net)} | 365d: ${formatCurrency(data.periodSummary.days365.net)}`}
        />
      </section>
      </>)}

      {/* === DEBUG BISECT: false esconde tudo abaixo (charts novos) === */}
      {false && (<>
      <section>
        <HeatmapCard
          title="Postura nos últimos 60 dias"
          subtitle="Quanto mais escuro, mais ovos coletados naquele dia"
          data={data.charts.postureHeatmap}
          palette="amber"
          icon={<Egg className="h-5 w-5" />}
          days={60}
          emptyMessage="Registre coletas no Coleta pra construir esse calendário."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DonutCard
          title="Composição do plantel"
          subtitle="Como suas aves estão distribuídas"
          palette="emerald"
          icon={<Bird className="h-5 w-5" />}
          centerLabel="Total no plantel"
          centerValue={String(
            data.charts.plantelComposition.reduce((s: number, d: { value: number }) => s + d.value, 0)
          )}
          centerHint="aves vivas"
          data={[
            { ...data.charts.plantelComposition[0], palette: "emerald" as const },
            { ...data.charts.plantelComposition[1], palette: "indigo" as const },
            { ...data.charts.plantelComposition[2], palette: "amber" as const }
          ].filter((d) => d && typeof d.value === "number")}
          emptyMessage="Cadastre matrizes e reprodutores no Plantel pra ver a composição."
        />
        <BarCard
          title="Aves por raça"
          subtitle="Top 8 grupos por quantidade"
          data={data.charts.topGroups}
          palette="indigo"
          icon={<Users className="h-5 w-5" />}
          layout="horizontal"
          emptyMessage="Adicione grupos no Plantel pra ver o ranking de raças."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DonutCard
          title="Receita vs Despesa do mês"
          subtitle="Comparativo financeiro mensal"
          palette="emerald"
          icon={<Wallet className="h-5 w-5" />}
          centerLabel="Resultado"
          centerValue={formatCurrency(data.kpis.monthNet)}
          centerHint={data.kpis.monthNet >= 0 ? "no positivo este mês" : "no negativo este mês"}
          data={[
            { label: "Receita", value: data.kpis.monthIncome, palette: "emerald" as const },
            { label: "Despesa", value: data.kpis.monthExpenses, palette: "rose" as const }
          ]}
          formatter={(v) => formatCurrency(v)}
          emptyMessage="Registre entradas e saídas pra ver o saldo do mês."
        />
        <LineChartCard
          title="Evolução da coleta de ovos"
          subtitle="Produção diária nos últimos 30 dias"
          data={chartEggs}
          palette="amber"
          icon={<Egg className="h-5 w-5" />}
          emptyMessage="Registre sua primeira coleta pra ver a curva nascer."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <GaugeCard
          title="Taxa de eclosão atual"
          subtitle="Últimos 90 dias vs 90 dias anteriores"
          value={data.charts.hatchGauge.current}
          previousValue={data.charts.hatchGauge.previous}
          palette="orange"
          icon={<EggFried className="h-5 w-5" />}
          hint="Quantos % dos ovos incubados eclodiram"
          emptyMessage="Finalize lotes na chocadeira pra acompanhar a taxa."
        />
        <StackedResultsCard
          title="Resultado dos lotes"
          subtitle="Eclodidos / Inférteis / Perdidos por mês"
          data={data.charts.batchResultsByMonth}
          icon={<EggFried className="h-5 w-5" />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <LineChartCard
          title="Evolução do criatório"
          subtitle="Novas aves por mês (últimos 12 meses)"
          data={chartAviaryGrowth}
          palette="emerald"
          icon={<Bird className="h-5 w-5" />}
          emptyMessage="As novas aves do plantel vão aparecer aqui mês a mês."
        />
        <LineChartCard
          title="Desempenho das chocadeiras"
          subtitle="Taxa de eclosão no período"
          data={chartIncubator}
          palette="orange"
          icon={<EggFried className="h-5 w-5" />}
          emptyMessage="Finalize um lote na chocadeira pra acompanhar a eclosão."
          formatter={(v) => `${v.toFixed(1)}%`}
        />
      </section>

      <section>
        <FunnelCard
          title="Jornada das aves"
          subtitle="Do ovo eclodido até a venda"
          stages={data.charts.funnelStages}
          palette="indigo"
          icon={<Filter className="h-5 w-5" />}
          emptyMessage="Quando houver eclosões e vendas, o funil vai mostrar a conversão."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <BarCard
          title="Receita por raça"
          subtitle="Top grupos por valor vendido na vitrine"
          data={data.charts.revenueByGroup}
          palette="violet"
          icon={<Award className="h-5 w-5" />}
          layout="horizontal"
          formatter={(v) => formatCurrency(v)}
          emptyMessage="As vendas da vitrine vão revelar quem rende mais."
        />
        <StackedHorizontalCard
          title="Despesas do mês por categoria"
          subtitle="Onde o dinheiro está saindo"
          segments={data.charts.expensesByCategory}
          palette="rose"
          icon={<Receipt className="h-5 w-5" />}
          formatter={(v) => formatCurrency(v)}
          emptyMessage="Ainda não há despesas registradas neste mês."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <LineChartCard
          title="Filhotes nascidos"
          subtitle="Eclosão por mês (últimos 12 meses)"
          data={chartHatchByMonth}
          palette="orange"
          icon={<Sparkles className="h-5 w-5" />}
          emptyMessage="Os filhotes que eclodirem vão aparecer aqui."
        />
        <LineChartCard
          title="Vendas por mês"
          subtitle="Receita registrada como entrada (últimos 12 meses)"
          data={chartSalesByMonth}
          palette="indigo"
          icon={<PiggyBank className="h-5 w-5" />}
          emptyMessage="Suas vendas vão construir esta curva ao longo dos meses."
          formatter={(v) => formatCurrency(v)}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <StackedBarsCard
          title="Evolução financeira"
          subtitle="Entradas e saídas dos últimos 12 meses"
          data={data.charts.financialEvolution}
          icon={<Wallet className="h-5 w-5" />}
        />
        <LineChartCard
          title="Evolução da sanidade"
          subtitle="Casos abertos por mês"
          data={chartHealthOpen}
          palette="pink"
          icon={<Heart className="h-5 w-5" />}
          emptyMessage="Casos da enfermaria vão aparecer aqui — torço pra continuar zerado."
        />
      </section>

      </>)}
      {/* === fim debug bisect === */}

      <section>
        <Card>
          <h3 className="text-base font-semibold tracking-tight text-slate-900">Resumo operacional</h3>
          <p className="mt-1 text-xs text-slate-500">Visão rápida para tomada de decisão.</p>
          <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
            <p>Últimos 7 dias: <span className="font-semibold tabular-nums">{data.periodSummary.days7.eggs}</span> ovos coletados.</p>
            <p>Últimos 30 dias: <span className="font-semibold tabular-nums">{data.periodSummary.days30.healthCases}</span> casos de sanidade registrados.</p>
            <p>Últimos 365 dias: resultado financeiro de <span className="font-semibold tabular-nums">{formatCurrency(data.periodSummary.days365.net)}</span>.</p>
          </div>
        </Card>
      </section>
    </main>
  );
}
