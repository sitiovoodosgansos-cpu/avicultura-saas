import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { createQuarantineTemplate, listHealthContext } from "@/lib/health/service";
import { quarantineTemplateSchema } from "@/lib/validators/health";

export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: "health" });
  if (!auth.ok) return auth.response;

  const data = await listHealthContext(auth.session.user.tenantId);
  return NextResponse.json({ templates: data.quarantineTemplates });
}

export async function POST(request: Request) {
  const auth = await getApiSessionOr401({ employeePermission: "health" });
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = quarantineTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  try {
    const created = await createQuarantineTemplate(auth.session.user.tenantId, auth.session.user.id, parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Esse item já foi cadastrado." }, { status: 400 });
  }
}

