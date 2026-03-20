import { NextRequest, NextResponse } from "next/server";
import { getWorkerLinkOr401 } from "@/lib/worker-links/auth";
import { caseSchema } from "@/lib/validators/health";
import { createInfirmaryCase } from "@/lib/health/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const auth = await getWorkerLinkOr401(token, "health");
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = caseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const created = await createInfirmaryCase(auth.link.tenantId, null, parsed.data);
  if (!created) {
    return NextResponse.json({ error: "Ave ou enfermaria não encontrada." }, { status: 404 });
  }

  return NextResponse.json(created, { status: 201 });
}
