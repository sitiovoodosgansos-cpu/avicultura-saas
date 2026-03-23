import { redirect } from "next/navigation";
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

  return (
    <main className="space-y-6">
      <PageTitle
        title="Dashboard"
        description="Resumo consolidado do plantel, ovos, sanidade, chocadeiras e finanças."
      />

      {data.warning ? (
        <Card>
          <p className="text-sm text-amber-700">{data.warning}</p>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Aves totais"
          value={String(data.kpis.totalBirds)}
          emoji="🐥"
          hint={`Ativas: ${data.kpis.activeBirds} | Doentes: ${data.kpis.sickBirds} | Mortas: ${data.kpis.deadBirds}`}
        />
        <KpiCard
          title="Grupos de aves"
          value={String(data.kpis.flockGroups)}
          emoji="🦚"
          hint={`Chocas: ${data.kpis.broodyBirds}`}
        />
        <KpiCard
          title="Ovos coletados hoje"
          value={String(data.kpis.eggsToday)}
          emoji="🧺"
          hint={`Bons: ${data.kpis.goodEggsToday} | Trincados: ${data.kpis.crackedEggsToday} | Taxa bons: ${formatPercent(data.kpis.goodEggRateToday)}`}
        />
        <KpiCard
          title="Financeiro do mês"
          value={formatCurrency(data.kpis.monthNet)}
          emoji="💰"
          hint={`Entradas: ${formatCurrency(data.kpis.monthIncome)} | Saídas: ${formatCurrency(data.kpis.monthExpenses)}`}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Lotes ativos"
          value={String(data.kpis.activeBatches)}
          emoji="🐣"
          hint={`Taxa eclosão: ${formatPercent(data.kpis.hatchRate)} | Infertilidade: ${formatPercent(data.kpis.infertilityRate)}`}
        />
        <KpiCard
          title="Aves em enfermaria"
          value={String(data.kpis.birdsInInfirmary)}
          emoji="🏥"
          hint={`Taxa recuperação: ${formatPercent(data.kpis.recoveryRate)}`}
        />
        <KpiCard
          title="Resumo 7 dias"
          value={`${data.periodSummary.days7.eggs} ovos`}
          emoji="📅"
          hint={`Resultado: ${formatCurrency(data.periodSummary.days7.net)} | Casos: ${data.periodSummary.days7.healthCases}`}
        />
        <KpiCard
          title="Resumo 30 / 365 dias"
          value={`${data.periodSummary.days30.eggs} / ${data.periodSummary.days365.eggs} ovos`}
          emoji="📈"
          hint={`Resultado 30d: ${formatCurrency(data.periodSummary.days30.net)} | 365d: ${formatCurrency(data.periodSummary.days365.net)}`}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <LineChartCard
          title="Evolução da coleta de ovos"
          subtitle="Produção diária nos últimos 30 dias"
          data={chartEggs}
        />
        <LineChartCard
          title="Evolução do criatório"
          subtitle="Novas aves por mês (últimos 12 meses)"
          data={chartAviaryGrowth}
          color="#0f766e"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <LineChartCard
          title="Desempenho das chocadeiras"
          subtitle="Taxa de eclosão no período"
          data={chartIncubator}
          color="#7c3aed"
        />
        <StackedBarsCard
          title="Evolução financeira"
          subtitle="Entradas e saídas dos últimos 12 meses"
          data={data.charts.financialEvolution}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <LineChartCard
          title="Evolução da sanidade"
          subtitle="Casos abertos por mês"
          data={chartHealthOpen}
          color="#dc2626"
        />
        <Card>
          <h3 className="text-base font-semibold text-zinc-900">Resumo operacional</h3>
          <p className="mt-1 text-sm text-zinc-500">Visão rápida para tomada de decisão.</p>
          <div className="mt-4 grid gap-3 text-sm text-zinc-700">
            <p>Últimos 7 dias: {data.periodSummary.days7.eggs} ovos coletados.</p>
            <p>Últimos 30 dias: {data.periodSummary.days30.healthCases} casos de sanidade registrados.</p>
            <p>Últimos 365 dias: resultado financeiro de {formatCurrency(data.periodSummary.days365.net)}.</p>
          </div>
        </Card>
      </section>
    </main>
  );
}
