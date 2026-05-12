import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { eggPriceBatchSchema } from "@/lib/validators/eggs";
import { listEggPrices, saveEggPricesBatch } from "@/lib/eggs/egg-pricing";

// GET /api/eggs/prices
// Lista todos os FlockGroups produtores de ovo + preco unitario configurado
// (ou null se nao tem). Usado pela tabela de precos da Prateleira E pelo
// fluxo de venda (auto-preencher unitPrice).
export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: "eggs" });
  if (!auth.ok) return auth.response;

  const data = await listEggPrices(auth.session.user.tenantId);
  return NextResponse.json(data);
}

// PUT /api/eggs/prices
// Salva precos em batch. Body: { prices: [{ flockGroupId, unitPrice }] }
// unitPrice null/0 = deleta o registro. ownerOnly.
export async function PUT(request: NextRequest) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = eggPriceBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  try {
    const result = await saveEggPricesBatch(auth.session.user.tenantId, parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar preços.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
