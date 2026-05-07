import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { getCurrentEmployeeSession } from "@/lib/employees/auth";

export default async function EmployeeDashboardPage() {
  const session = await getCurrentEmployeeSession();
  if (!session) redirect("/equipe/login");
  if (!session.employee.allowDashboard) redirect("/equipe/sem-acesso");

  return <DashboardContent tenantId={session.tenant.id} />;
}
