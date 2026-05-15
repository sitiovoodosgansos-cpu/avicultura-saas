import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { listRevenueSales } from "@/lib/plantel/service";

// GET /api/plantel/groups/[id]/revenue
// Retorna lista detalhada de vendas atribuiveis a esse FlockGroup
// (ovos, vitrine, lancamentos manuais) + total agregado.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: "plantel" });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await listRevenueSales(auth.session.user.tenantId, id);
  if (!result) {
    return NextResponse.json({ error: "Grupo nao encontrado." }, { status: 404 });
  }
  return NextResponse.json(result);
}
