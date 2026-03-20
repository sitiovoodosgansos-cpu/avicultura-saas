import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { incubatorSchema } from "@/lib/validators/incubators";
import { deleteIncubator, updateIncubator } from "@/lib/incubators/service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: 'incubators' });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = incubatorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const updated = await updateIncubator(auth.session.user.tenantId, auth.session.user.id, id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Chocadeira não encontrada." }, { status: 404 });
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
  const deleted = await deleteIncubator(auth.session.user.tenantId, auth.session.user.id, id);
  if (!deleted) {
    return NextResponse.json({ error: "Chocadeira não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

