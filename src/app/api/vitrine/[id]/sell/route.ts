import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { saleSchema } from "@/lib/validators/vitrine";
import { sellListing } from "@/lib/vitrine/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: "vitrine" });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = saleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  try {
    const result = await sellListing(auth.session.user.tenantId, id, parsed.data);
    if (!result) {
      return NextResponse.json({ error: "Anúncio não encontrado." }, { status: 404 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao registrar venda.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
