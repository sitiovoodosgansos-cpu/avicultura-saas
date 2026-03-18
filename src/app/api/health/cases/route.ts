import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { caseSchema } from "@/lib/validators/health";
import { createInfirmaryCase, listHealthContext } from "@/lib/health/service";

export async function GET() {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const data = await listHealthContext(auth.session.user.tenantId);
  return NextResponse.json({ cases: data.cases, birds: data.birds, infirmaries: data.infirmaries });
}

export async function POST(request: Request) {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = caseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const created = await createInfirmaryCase(auth.session.user.tenantId, auth.session.user.id, parsed.data);
  if (!created) {
    return NextResponse.json({ error: "Ave ou enfermaria inválida." }, { status: 404 });
  }

  return NextResponse.json(created, { status: 201 });
}
