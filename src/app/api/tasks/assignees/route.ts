import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { listAssignees } from "@/lib/tasks/service";

// Endpoint leve pra hidratar o dropdown de "Atribuir a" no modal de
// tarefas. Diferente de GET /api/employees (ownerOnly), aqui qualquer
// usuario autenticado do tenant pode ler — retorna apenas { id, name }
// dos funcionarios ATIVOS, sem dados sensiveis.
export async function GET() {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const assignees = await listAssignees(auth.session.user.tenantId);
  return NextResponse.json({ assignees });
}
