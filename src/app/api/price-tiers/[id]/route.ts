import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { deletePriceTier } from "@/lib/vitrine/price-tiers";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const removed = await deletePriceTier(auth.session.user.tenantId, id);
  if (!removed) {
    return NextResponse.json({ error: "Preço não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
