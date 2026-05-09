import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { bulkSaleSchema } from "@/lib/validators/vitrine";
import { sellListingsBulk } from "@/lib/vitrine/service";

export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = bulkSaleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  try {
    const result = await sellListingsBulk(auth.session.user.tenantId, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao registrar venda.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
