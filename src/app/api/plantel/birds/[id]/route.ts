import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { birdSchema } from "@/lib/validators/plantel";
import { deleteBird, updateBird } from "@/lib/plantel/service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = birdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  try {
    const updated = await updateBird(
      auth.session.user.tenantId,
      auth.session.user.id,
      id,
      parsed.data
    );

    if (!updated) {
      return NextResponse.json({ error: "Ave não encontrada." }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Falha ao atualizar ave. Verifique se a anilha já existe." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const deleted = await deleteBird(auth.session.user.tenantId, auth.session.user.id, id);
  if (!deleted) {
    return NextResponse.json({ error: "Ave não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
