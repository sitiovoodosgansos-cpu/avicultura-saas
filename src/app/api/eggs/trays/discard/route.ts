import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { trayDiscardSchema } from "@/lib/validators/eggs";
import { discardFromEntry } from "@/lib/eggs/tray-service";

export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401({ employeePermission: "eggs" });
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = trayDiscardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const result = await discardFromEntry(auth.session.user.tenantId, auth.session.user.id, parsed.data);
  if (!result.ok) {
    if (result.reason === "NOT_FOUND") {
      return NextResponse.json({ error: "Entrada não encontrada." }, { status: 404 });
    }
    return NextResponse.json(
      { error: `Quantidade inválida. Disponíveis: ${result.available}.` },
      { status: 400 }
    );
  }
  return NextResponse.json(result.entry);
}
