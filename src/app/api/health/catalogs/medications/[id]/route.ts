import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { deleteMedication, updateMedication } from "@/lib/health/catalogs";
import { medicationSchema } from "@/lib/validators/health-catalogs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json();
  const parsed = medicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }
  const updated = await updateMedication(auth.session.user.tenantId, id, parsed.data);
  if (!updated) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const ok = await deleteMedication(auth.session.user.tenantId, id);
  if (!ok) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
