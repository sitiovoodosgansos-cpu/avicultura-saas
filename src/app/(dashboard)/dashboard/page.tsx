import { redirect } from "next/navigation";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { getCurrentSession } from "@/lib/auth/session";
import { getTenantBilling } from "@/lib/billing/service";

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

  return <DashboardContent tenantId={tenantId} />;
}
