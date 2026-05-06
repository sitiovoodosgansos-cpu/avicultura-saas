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
  Stethoscope
} from "lucide-react";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LineChartCard } from "@/components/dashboard/line-chart-card";
import { StackedBarsCard } from "@/components/dashboard/stacked-bars-card";
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

  const data = await getDashboardDataSafe(tenantId);

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

      <section className="grid gap-4 xl:grid-cols-2">
        <LineChartCard
          title="Evolução da coleta de ovos"
          subtitle="Produção diária nos últimos 30 dias"
          data={chartEggs}
          palette="amber"
          icon={<Egg className="h-5 w-5" />}
          emptyMessage="Registre sua primeira coleta pra ver a curva nascer."
        />
        <LineChartCard
          title="Evolução do criatório"
          subtitle="Novas aves por mês (últimos 12 meses)"
          data={chartAviaryGrowth}
          palette="emerald"
          icon={<Bird className="h-5 w-5" />}
          emptyMessage="As novas aves do plantel vão aparecer aqui mês a mês."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <LineChartCard
          title="Desempenho das chocadeiras"
          subtitle="Taxa de eclosão no período"
          data={chartIncubator}
          palette="orange"
          icon={<EggFried className="h-5 w-5" />}
          emptyMessage="Finalize um lote na chocadeira pra acompanhar a eclosão."
          formatter={(v) => `${v.toFixed(1)}%`}
        />
        <StackedBarsCard
          title="Evolução financeira"
          subtitle="Entradas e saídas dos últimos 12 meses"
          data={data.charts.financialEvolution}
          icon={<Wallet className="h-5 w-5" />}
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
        <LineChartCard
          title="Evolução da sanidade"
          subtitle="Casos abertos por mês"
          data={chartHealthOpen}
          palette="pink"
          icon={<Heart className="h-5 w-5" />}
          emptyMessage="Casos da enfermaria vão aparecer aqui — torço pra continuar zerado."
        />
        <Card>
          <h3 className="text-base font-semibold tracking-tight text-slate-900">Resumo operacional</h3>
          <p className="mt-1 text-xs text-slate-500">Visão rápida para tomada de decisão.</p>
          <div className="mt-4 grid gap-3 text-sm text-slate-700">
            <p>Últimos 7 dias: <span className="font-semibold tabular-nums">{data.periodSummary.days7.eggs}</span> ovos coletados.</p>
            <p>Últimos 30 dias: <span className="font-semibold tabular-nums">{data.periodSummary.days30.healthCases}</span> casos de sanidade registrados.</p>
            <p>Últimos 365 dias: resultado financeiro de <span className="font-semibold tabular-nums">{formatCurrency(data.periodSummary.days365.net)}</span>.</p>
          </div>
        </Card>
      </section>
    </main>
  );
}
