import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { flockGroupSchema } from "@/lib/validators/plantel";
import { deleteFlockGroup, updateFlockGroup } from "@/lib/plantel/service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = flockGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const updated = await updateFlockGroup(auth.session.user.tenantId, id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Grupo não encontrado." }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const deleted = await deleteFlockGroup(auth.session.user.tenantId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Grupo não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

