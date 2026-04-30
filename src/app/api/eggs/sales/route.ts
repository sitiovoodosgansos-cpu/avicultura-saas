import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { eggSaleSchema } from "@/lib/validators/eggs";
import { createEggSale } from "@/lib/eggs/tray-service";

export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401({ employeePermission: "eggs" });
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = eggSaleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const result = await createEggSale(auth.session.user.tenantId, auth.session.user.id, parsed.data);
  if (!result.ok) {
    if (result.reason === "TRAY_NOT_FOUND") {
      return NextResponse.json({ error: "Bandeja inválida." }, { status: 404 });
    }
    if (result.reason === "EMPTY") {
      return NextResponse.json({ error: "Adicione ao menos um item." }, { status: 400 });
    }
    return NextResponse.json({ error: result.message ?? "Falha ao registrar venda." }, { status: 400 });
  }
  return NextResponse.json(result.sale, { status: 201 });
}
