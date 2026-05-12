import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { avulsasInsertSchema } from "@/lib/validators/vitrine";
import { createAvulsasBatch } from "@/lib/vitrine/service";

// POST /api/vitrine/avulsas
// Insere N aves "avulsas" (que ja existiam antes do usuario comecar a usar
// o sistema) em uma so transacao. Body:
//   { flockGroupId, ageInMonths, females, males, unknownSex }
// Total minimo 1, max 500. Mesma idade pra todas as aves da leva — pra duas
// idades, o usuario faz duas chamadas.
//
// Permissao: ownerOnly. Cria registros financeiros nao, custo nao se aplica
// (sao aves do plantel proprio, nao compradas).
export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = avulsasInsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  try {
    const result = await createAvulsasBatch(
      auth.session.user.tenantId,
      auth.session.user.id ?? null,
      parsed.data
    );
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao inserir aves.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
