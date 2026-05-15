import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { archiveBird } from "@/lib/plantel/service";

// POST /api/plantel/birds/[id]/archive
// Arquiva (soft) uma ave morta. Tira ela da listagem do Plantel sem
// apagar do banco (preserva historico).
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: "plantel" });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await archiveBird(auth.session.user.tenantId, auth.session.user.id, id);

  if (result === null) {
    return NextResponse.json({ error: "Ave nao encontrada." }, { status: 404 });
  }
  if (typeof result === "object" && "ok" in result && result.ok === false) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
