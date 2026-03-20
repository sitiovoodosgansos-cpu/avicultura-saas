import { NextRequest, NextResponse } from "next/server";
import { getWorkerLinkOr401 } from "@/lib/worker-links/auth";
import { caseEventSchema } from "@/lib/validators/health";
import { applyCaseEvent } from "@/lib/health/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  const { token, id } = await params;
  const auth = await getWorkerLinkOr401(token, "health");
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = caseEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const result = await applyCaseEvent(auth.link.tenantId, null, id, parsed.data);
  if (result.kind === "not_found") {
    return NextResponse.json({ error: "Caso não encontrado." }, { status: 404 });
  }
  if (result.kind === "invalid") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json(result.caseItem);
}
