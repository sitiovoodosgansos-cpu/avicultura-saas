import { redirect } from "next/navigation";
import { FinanceManager } from "@/components/finance/finance-manager";
import { getCurrentEmployeeSession } from "@/lib/employees/auth";

export default async function EmployeeFinanceiroPage() {
  const session = await getCurrentEmployeeSession();
  if (!session) redirect("/equipe/login");
  if (!session.employee.allowFinanceiro) redirect("/equipe/sem-acesso");

  return <FinanceManager />;
}
