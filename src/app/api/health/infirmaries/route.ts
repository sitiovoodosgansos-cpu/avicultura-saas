import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { infirmarySchema } from "@/lib/validators/health";
import { createInfirmary, listHealthContext } from "@/lib/health/service";

export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: 'health' });
  if (!auth.ok) return auth.response;

  const data = await listHealthContext(auth.session.user.tenantId);
  return NextResponse.json({ infirmaries: data.infirmaries, birds: data.birds, cases: data.cases });
}

export async function POST(request: Request) {
  const auth = await getApiSessionOr401({ employeePermission: 'health' });
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = infirmarySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const created = await createInfirmary(auth.session.user.tenantId, auth.session.user.id, parsed.data);
  return NextResponse.json(created, { status: 201 });
}

