import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { listingUpdateSchema } from "@/lib/validators/vitrine";
import { removeListing, updateListing } from "@/lib/vitrine/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = listingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  try {
    const updated = await updateListing(auth.session.user.tenantId, id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "Anúncio não encontrado." }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const removed = await removeListing(auth.session.user.tenantId, id);
  if (!removed) {
    return NextResponse.json({ error: "Anúncio não encontrado." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
