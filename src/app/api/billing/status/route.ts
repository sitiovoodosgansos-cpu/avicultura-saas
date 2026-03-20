import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { getTenantBilling } from "@/lib/billing/service";

export async function GET() {
  const auth = await getApiSessionOr401({ allowBlocked: true, ownerOnly: true });
  if (!auth.ok) return auth.response;

  const billing = await getTenantBilling(auth.session.user.tenantId);
  if (!billing) {
    return NextResponse.json({ error: "Tenant não encontrado." }, { status: 404 });
  }

  return NextResponse.json(billing);
}



