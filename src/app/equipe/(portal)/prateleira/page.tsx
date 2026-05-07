import { redirect } from "next/navigation";
import { PrateleiraManager } from "@/components/eggs/prateleira-manager";
import { getCurrentEmployeeSession } from "@/lib/employees/auth";

export default async function EmployeePrateleiraPage() {
  const session = await getCurrentEmployeeSession();
  if (!session) redirect("/equipe/login");
  if (!session.employee.allowPrateleira) redirect("/equipe/sem-acesso");

  return <PrateleiraManager />;
}
