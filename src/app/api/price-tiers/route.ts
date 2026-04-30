import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { priceTierSchema } from "@/lib/validators/vitrine";
import { listPriceTiers, upsertPriceTier } from "@/lib/vitrine/price-tiers";

export async function GET() {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const data = await listPriceTiers(auth.session.user.tenantId);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = priceTierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  try {
    const saved = await upsertPriceTier(auth.session.user.tenantId, parsed.data);
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar preço.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
