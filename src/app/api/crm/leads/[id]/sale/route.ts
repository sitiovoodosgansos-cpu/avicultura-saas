import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { leadSaleSchema } from "@/lib/validators/crm";
import { recordSaleFromLead } from "@/lib/crm/sale-bridge";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: "crm" });
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json();
  const parsed = leadSaleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }
  const result = await recordSaleFromLead(
    auth.session.user.tenantId,
    auth.session.user.id,
    id,
    parsed.data
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result, { status: 201 });
}
