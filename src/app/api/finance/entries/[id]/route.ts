import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { financialEntrySchema } from "@/lib/validators/finance";
import { deleteEntry, updateEntry } from "@/lib/finance/service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = financialEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const updated = await updateEntry(auth.session.user.tenantId, auth.session.user.id, id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
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
  const deleted = await deleteEntry(auth.session.user.tenantId, auth.session.user.id, id);
  if (!deleted) {
    return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
