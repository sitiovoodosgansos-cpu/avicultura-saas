import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { deathSchema } from "@/lib/validators/vitrine";
import { recordListingDeath } from "@/lib/vitrine/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = deathSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  try {
    const result = await recordListingDeath(auth.session.user.tenantId, id, parsed.data);
    if (!result) {
      return NextResponse.json({ error: "Anúncio não encontrado." }, { status: 404 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao registrar óbito.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
