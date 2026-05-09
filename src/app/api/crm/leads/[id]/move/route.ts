import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { leadMoveSchema } from "@/lib/validators/crm";
import { moveLead } from "@/lib/crm/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: "crm" });
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json();
  const parsed = leadMoveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }
  const lead = await moveLead(
    auth.session.user.tenantId,
    auth.session.user.id,
    id,
    parsed.data
  );
  if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  return NextResponse.json(lead);
}
