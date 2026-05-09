import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { getEstoqueResumo } from "@/lib/vitrine/estoque";

export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: "relatorios" });
  if (!auth.ok) return auth.response;

  const data = await getEstoqueResumo(auth.session.user.tenantId);
  return NextResponse.json(data);
}
