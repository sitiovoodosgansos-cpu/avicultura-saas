import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { listLeadHistory } from "@/lib/crm/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: "crm" });
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const history = await listLeadHistory(auth.session.user.tenantId, id);
  if (!history) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  return NextResponse.json({ history });
}
