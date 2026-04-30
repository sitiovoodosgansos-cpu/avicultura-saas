import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { externalTraySchema } from "@/lib/validators/eggs";
import { addExternalTray, listTrays } from "@/lib/eggs/tray-service";

export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: "eggs" });
  if (!auth.ok) return auth.response;

  const trays = await listTrays(auth.session.user.tenantId);
  return NextResponse.json({ trays });
}

export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401({ employeePermission: "eggs" });
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = externalTraySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const created = await addExternalTray(
    auth.session.user.tenantId,
    auth.session.user.id,
    parsed.data
  );
  return NextResponse.json(created, { status: 201 });
}
