import { redirect } from "next/navigation";
import { VitrineManager } from "@/components/vitrine/vitrine-manager";
import { getCurrentEmployeeSession } from "@/lib/employees/auth";

export default async function EmployeeVitrinePage() {
  const session = await getCurrentEmployeeSession();
  if (!session) redirect("/equipe/login");
  if (!session.employee.allowVitrine) redirect("/equipe/sem-acesso");

  return <VitrineManager />;
}
