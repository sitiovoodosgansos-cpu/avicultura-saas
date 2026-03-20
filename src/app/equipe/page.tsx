import { redirect } from "next/navigation";
import { getCurrentEmployeeSession, getEmployeeRedirectPath } from "@/lib/employees/auth";

export default async function EquipeRootPage() {
  const session = await getCurrentEmployeeSession();
  if (!session) {
    redirect("/equipe/login");
  }

  redirect(getEmployeeRedirectPath(session.employee));
}
