import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { eggCollectionSchema } from "@/lib/validators/eggs";
import { deleteEggCollection, updateEggCollection } from "@/lib/eggs/service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: 'eggs' });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = eggCollectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const updated = await updateEggCollection(
    auth.session.user.tenantId,
    auth.session.user.id,
    id,
    parsed.data
  );

  if (!updated) {
    return NextResponse.json({ error: "Registro não encontrado." }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: 'eggs' });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await deleteEggCollection(auth.session.user.tenantId, auth.session.user.id, id);
  if (result === false) {
    return NextResponse.json({ error: "Registro não encontrado." }, { status: 404 });
  }
  if (typeof result === "object" && result.ok === false) {
    return NextResponse.json({ error: result.message }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}

