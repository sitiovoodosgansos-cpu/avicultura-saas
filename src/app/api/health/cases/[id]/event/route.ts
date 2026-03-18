import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { caseEventSchema } from "@/lib/validators/health";
import { applyCaseEvent } from "@/lib/health/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = caseEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const result = await applyCaseEvent(auth.session.user.tenantId, auth.session.user.id, id, parsed.data);
  if (result.kind === "not_found") {
    return NextResponse.json({ error: "Caso não encontrado." }, { status: 404 });
  }
  if (result.kind === "invalid") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json(result.caseItem);
}
