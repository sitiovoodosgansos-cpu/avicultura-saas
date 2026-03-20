import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { batchSchema } from "@/lib/validators/incubators";
import { deleteBatch, updateBatch } from "@/lib/incubators/service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: 'incubators' });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const updated = await updateBatch(auth.session.user.tenantId, auth.session.user.id, id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Lote não encontrado." }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: 'incubators' });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const deleted = await deleteBatch(auth.session.user.tenantId, auth.session.user.id, id);
  if (!deleted) {
    return NextResponse.json({ error: "Lote não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

