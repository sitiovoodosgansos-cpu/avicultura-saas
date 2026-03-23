import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { createQuarantineCase, listHealthContext } from "@/lib/health/service";
import { quarantineCaseSchema } from "@/lib/validators/health";

export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: "health" });
  if (!auth.ok) return auth.response;

  const data = await listHealthContext(auth.session.user.tenantId);
  return NextResponse.json({ quarantineCases: data.quarantineCases });
}

export async function POST(request: Request) {
  const auth = await getApiSessionOr401({ employeePermission: "health" });
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = quarantineCaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const created = await createQuarantineCase(auth.session.user.tenantId, auth.session.user.id, parsed.data);
  if (!created) {
    return NextResponse.json({ error: "Ave ou enfermaria inválida." }, { status: 404 });
  }

  return NextResponse.json(created, { status: 201 });
}

