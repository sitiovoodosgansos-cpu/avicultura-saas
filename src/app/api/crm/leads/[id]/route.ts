import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { leadUpdateSchema } from "@/lib/validators/crm";
import { deleteLead, getLead, updateLead } from "@/lib/crm/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: "crm" });
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const lead = await getLead(auth.session.user.tenantId, id);
  if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: "crm" });
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json();
  const parsed = leadUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }
  const updated = await updateLead(
    auth.session.user.tenantId,
    auth.session.user.id,
    id,
    parsed.data
  );
  if (!updated) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: "crm" });
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const ok = await deleteLead(auth.session.user.tenantId, id);
  if (!ok) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
