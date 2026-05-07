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

const Emoji = ({ char, className = "" }: { char: string; className?: string }) => (
  <span className={`text-lg leading-none ${className}`} aria-hidden>
    {char}
  </span>
);

// Corpo compartilhado do Dashboard. Renderiza os cards a partir do tenantId.
// Reutilizado pelo titular (`/dashboard`) e pelo funcionario (`/equipe/dashboard`)
// pra que ambos vejam exatamente os mesmos numeros, sem duplicar 250 linhas.
export async function DashboardContent({ tenantId }: { tenantId: string }) {
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
  void chartIncubator;

  return (
    <main className="space-y-6">
      <PageTitle
        title="Dashboard"
        description="Resumo consolidado do plantel, ovos, sanidade, chocadeiras e finanças."
        icon="🏠"
      />

      {data.warning ? (
        <Card>
          <p className="text-sm text-amber-700">{data.warning}</p>
        </Card>
      ) : null}

      <section className="mobile-kpi-grid grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Aves totais"
          value={String(data.kpis.totalBirds)}
          icon={<Emoji char="🐔" />}
          palette="emerald"
          hint={`Ativas: ${data.kpis.activeBirds} | Doentes: ${data.kpis.sickBirds} | Mortas: ${data.kpis.deadBirds}`}
        />
        <KpiCard
          title="Grupos de aves"
          value={String(data.kpis.flockGroups)}
          icon={<Emoji char="🦚" />}
          palette="indigo"
          hint={`Chocas: ${data.kpis.broodyBirds}`}
        />
        <KpiCard
          title="Ovos coletados hoje"
          value={String(data.kpis.eggsToday)}
          icon={<Emoji char="🥚" />}
          palette="amber"
          hint={`Bons: ${data.kpis.goodEggsToday} | Trincados: ${data.kpis.crackedEggsToday} | Taxa bons: ${formatPercent(data.kpis.goodEggRateToday)}`}
        />
        <KpiCard
          title="Financeiro do mês"
          value={formatCurrency(data.kpis.monthNet)}
          icon={<Emoji char="💰" />}
          palette="emerald"
          hint={`Entradas: ${formatCurrency(data.kpis.monthIncome)} | Saídas: ${formatCurrency(data.kpis.monthExpenses)}`}
        />
      </section>

      <section className="mobile-kpi-grid grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
        <KpiCard
          title="Lotes ativos"
          value={String(data.kpis.activeBatches)}
          icon={<Emoji char="🐣" />}
          palette="orange"
          hint={`Taxa eclosão: ${formatPercent(data.kpis.hatchRate)} | Infertilidade: ${formatPercent(data.kpis.infertilityRate)}`}
        />
        <KpiCard
          title="Aves em enfermaria"
          value={String(data.kpis.birdsInInfirmary)}
          icon={<Emoji char="💊" />}
          palette="pink"
          hint={`Taxa recuperação: ${formatPercent(data.kpis.recoveryRate)}`}
        />
        <KpiCard
          title="Vendas 7 dias"
          value={`${data.periodSummary.days7.sales} vendas`}
          icon={<Emoji char="📅" />}
          palette="sky"
          hint={`${data.periodSummary.days7.itemsSold} itens vendidos | Receita: ${formatCurrency(data.periodSummary.days7.revenue)}`}
        />
        <KpiCard
          title="Vendas 30 / 365 dias"
          value={`${data.periodSummary.days30.sales} / ${data.periodSummary.days365.sales} vendas`}
          icon={<Emoji char="📈" />}
          palette="violet"
          hint={`Itens 30d: ${data.periodSummary.days30.itemsSold} | Receita 365d: ${formatCurrency(data.periodSummary.days365.revenue)}`}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DonutCard
          title="Composição do plantel"
          subtitle="Como suas aves estão distribuídas"
          palette="emerald"
          icon={<Emoji char="🐔" />}
          centerLabel="Total no plantel"
          centerValue={String(
            data.charts.plantelComposition.reduce((s: number, d: { value: number }) => s + d.value, 0)
          )}
          centerHint="aves vivas"
          data={data.charts.plantelComposition.map((d, i) => ({
            ...d,
            palette: (["emerald", "indigo", "amber", "pink"] as const)[i % 4]
          }))}
          emptyMessage="Cadastre aves no Plantel pra ver a composição."
        />
        <HeatmapCard
          title="Postura nos últimos 60 dias"
          subtitle="Quanto mais escuro, mais ovos coletados naquele dia"
          data={data.charts.postureHeatmap}
          palette="amber"
          icon={<Emoji char="🥚" />}
          days={60}
          emptyMessage="Registre coletas no Coleta pra construir esse calendário."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <BarCard
          title="Aves por raça"
          subtitle="Top 8 grupos por quantidade"
          data={data.charts.topGroups}
          palette="indigo"
          icon={<Emoji char="🦚" />}
          layout="horizontal"
          emptyMessage="Adicione grupos no Plantel pra ver o ranking de raças."
        />
        <DonutCard
          title="Receita vs Despesa do mês"
          subtitle="Comparativo financeiro mensal"
          palette="emerald"
          icon={<Emoji char="💰" />}
          centerLabel="Resultado"
          centerValue={formatCurrency(data.kpis.monthNet)}
          centerHint={data.kpis.monthNet >= 0 ? "no positivo este mês" : "no negativo este mês"}
          data={[
            { label: "Receita", value: data.kpis.monthIncome, palette: "emerald" as const },
            { label: "Despesa", value: data.kpis.monthExpenses, palette: "rose" as const }
          ]}
          format="currency"
          emptyMessage="Registre entradas e saídas pra ver o saldo do mês."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <LineChartCard
          title="Evolução da coleta de ovos"
          subtitle="Produção diária nos últimos 30 dias"
          data={chartEggs}
          palette="amber"
          icon={<Emoji char="🥚" />}
          emptyMessage="Registre sua primeira coleta pra ver a curva nascer."
        />
        <LineChartCard
          title="Evolução do criatório"
          subtitle="Novas aves por mês (últimos 12 meses)"
          data={chartAviaryGrowth}
          palette="emerald"
          icon={<Emoji char="🐔" />}
          emptyMessage="As novas aves do plantel vão aparecer aqui mês a mês."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <GaugeCard
          title="Taxa de eclosão atual"
          subtitle="Últimos 90 dias vs 90 dias anteriores"
          value={data.charts.hatchGauge.current}
          previousValue={data.charts.hatchGauge.previous}
          palette="orange"
          icon={<Emoji char="🐣" />}
          hint="Quantos % dos ovos incubados eclodiram"
          emptyMessage="Finalize lotes na chocadeira pra acompanhar a taxa."
        />
        <StackedResultsCard
          title="Resultado dos lotes"
          subtitle="Eclodidos / Inférteis / Perdidos por mês"
          data={data.charts.batchResultsByMonth}
          icon={<Emoji char="🐣" />}
        />
      </section>

      <section>
        <FunnelCard
          title="Jornada das aves"
          subtitle="Do ovo eclodido até a venda"
          stages={data.charts.funnelStages}
          palette="indigo"
          icon={<Emoji char="🔻" />}
          emptyMessage="Quando houver eclosões e vendas, o funil vai mostrar a conversão."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <BarCard
          title="Receita por raça"
          subtitle="Top grupos por valor vendido na vitrine"
          data={data.charts.revenueByGroup}
          palette="violet"
          icon={<Emoji char="🏆" />}
          layout="horizontal"
          format="currency"
          emptyMessage="As vendas da vitrine vão revelar quem rende mais."
        />
        <StackedHorizontalCard
          title="Despesas do mês por categoria"
          subtitle="Onde o dinheiro está saindo"
          segments={data.charts.expensesByCategory}
          palette="rose"
          icon={<Emoji char="🧾" />}
          format="currency"
          emptyMessage="Ainda não há despesas registradas neste mês."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <LineChartCard
          title="Filhotes nascidos"
          subtitle="Eclosão por mês (últimos 12 meses)"
          data={chartHatchByMonth}
          palette="orange"
          icon={<Emoji char="✨" />}
          emptyMessage="Os filhotes que eclodirem vão aparecer aqui."
        />
        <LineChartCard
          title="Vendas por mês"
          subtitle="Receita registrada como entrada (últimos 12 meses)"
          data={chartSalesByMonth}
          palette="indigo"
          icon={<Emoji char="🛍️" />}
          emptyMessage="Suas vendas vão construir esta curva ao longo dos meses."
          format="currency"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <StackedBarsCard
          title="Evolução financeira"
          subtitle="Entradas e saídas dos últimos 12 meses"
          data={data.charts.financialEvolution}
          icon={<Emoji char="💰" />}
        />
        <LineChartCard
          title="Evolução da sanidade"
          subtitle="Casos abertos por mês"
          data={chartHealthOpen}
          palette="pink"
          icon={<Emoji char="💗" />}
          emptyMessage="Casos da enfermaria vão aparecer aqui — torço pra continuar zerado."
        />
      </section>

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
