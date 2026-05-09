import { redirect } from "next/navigation";
import { CrmManager } from "@/components/crm/crm-manager";
import { getCurrentEmployeeSession } from "@/lib/employees/auth";

export default async function EmployeeCrmPage() {
  const session = await getCurrentEmployeeSession();
  if (!session) redirect("/equipe/login");
  if (!session.employee.allowCrm) redirect("/equipe/sem-acesso");

  return <CrmManager />;
}
