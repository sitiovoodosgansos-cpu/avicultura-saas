import { redirect } from "next/navigation";
import { ReportsManager } from "@/components/reports/reports-manager";
import { getCurrentEmployeeSession } from "@/lib/employees/auth";

export default async function EmployeeRelatoriosPage() {
  const session = await getCurrentEmployeeSession();
  if (!session) redirect("/equipe/login");
  if (!session.employee.allowRelatorios) redirect("/equipe/sem-acesso");

  return <ReportsManager />;
}
