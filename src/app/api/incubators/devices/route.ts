import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { incubatorSchema } from "@/lib/validators/incubators";
import { createIncubator, listIncubatorContext } from "@/lib/incubators/service";

export async function GET() {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const data = await listIncubatorContext(auth.session.user.tenantId);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = incubatorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  try {
    const created = await createIncubator(auth.session.user.tenantId, auth.session.user.id, parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Falha ao criar chocadeira." }, { status: 400 });
  }
}
