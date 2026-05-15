import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { createDeathReason, listDeathReasons } from "@/lib/health/catalogs";
import { deathReasonSchema } from "@/lib/validators/health-catalogs";

// Endpoints plantel-scoped pra DeathReason — diferente de
// /api/health/catalogs/death-reasons que exige permission 'health'
// (apenas owners criavam). Aqui qualquer membro com acesso ao plantel
// pode listar e criar causas, pra alimentar o dropdown ao marcar uma
// ave como morta no card do plantel.
export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: "plantel" });
  if (!auth.ok) return auth.response;
  const items = await listDeathReasons(auth.session.user.tenantId);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401({ employeePermission: "plantel" });
  if (!auth.ok) return auth.response;
  const body = await request.json();
  const parsed = deathReasonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
      { status: 400 }
    );
  }
  try {
    const created = await createDeathReason(auth.session.user.tenantId, parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao salvar." },
      { status: 400 }
    );
  }
}
