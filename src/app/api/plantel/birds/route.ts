import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { birdSchema } from "@/lib/validators/plantel";
import { createBird } from "@/lib/plantel/service";

export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401({ employeePermission: 'plantel' });
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = birdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  try {
    const created = await createBird(auth.session.user.tenantId, auth.session.user.id, parsed.data);
    if (!created) {
      return NextResponse.json({ error: "Grupo não encontrado." }, { status: 404 });
    }

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Falha ao salvar ave. Verifique se a anilha já existe." },
      { status: 400 }
    );
  }
}

