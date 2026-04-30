import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { trayTransferSchema } from "@/lib/validators/eggs";
import { transferTrayToIncubator } from "@/lib/eggs/tray-service";

export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401({ employeePermission: "eggs" });
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = trayTransferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const result = await transferTrayToIncubator(auth.session.user.tenantId, auth.session.user.id, parsed.data);
  if (!result.ok) {
    if (result.reason === "TRAY_NOT_FOUND") {
      return NextResponse.json({ error: "Bandeja não encontrada." }, { status: 404 });
    }
    if (result.reason === "INCUBATOR_NOT_FOUND") {
      return NextResponse.json({ error: "Chocadeira não encontrada." }, { status: 404 });
    }
    if (result.reason === "NO_FLOCK_GROUP") {
      return NextResponse.json(
        { error: "Bandeja externa precisa ser vinculada a um grupo do plantel para ir à chocadeira." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: result.message ?? "Não foi possível transferir." }, { status: 400 });
  }
  return NextResponse.json(result.batch, { status: 201 });
}
