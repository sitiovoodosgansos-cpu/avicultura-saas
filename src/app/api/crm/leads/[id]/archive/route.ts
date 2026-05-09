import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { leadArchiveSchema } from "@/lib/validators/crm";
import { archiveLead, restoreLead } from "@/lib/crm/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: "crm" });
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = leadArchiveSchema.safeParse(body);
  const reason = parsed.success ? parsed.data.reason : "manual";
  const lead = await archiveLead(
    auth.session.user.tenantId,
    auth.session.user.id,
    id,
    reason
  );
  if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  return NextResponse.json(lead);
}

// PATCH = restore (volta pro Kanban ativo)
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: "crm" });
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const lead = await restoreLead(
    auth.session.user.tenantId,
    auth.session.user.id,
    id
  );
  if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  return NextResponse.json(lead);
}
