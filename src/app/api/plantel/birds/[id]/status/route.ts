import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { birdStatusSchema } from "@/lib/validators/plantel";
import { changeBirdStatus } from "@/lib/plantel/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: 'plantel' });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = birdStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const updated = await changeBirdStatus(
    auth.session.user.tenantId,
    auth.session.user.id,
    id,
    parsed.data.status,
    parsed.data.reason
  );

  if (!updated) {
    return NextResponse.json({ error: "Ave não encontrada." }, { status: 404 });
  }

  return NextResponse.json(updated);
}


