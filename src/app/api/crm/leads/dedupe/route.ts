import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { leadDedupeSchema } from "@/lib/validators/crm";
import { findActiveByPhone } from "@/lib/crm/service";

export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401({ employeePermission: "crm" });
  if (!auth.ok) return auth.response;
  const body = await request.json();
  const parsed = leadDedupeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ existing: null });
  }
  const existing = await findActiveByPhone(auth.session.user.tenantId, parsed.data.phone);
  return NextResponse.json({ existing });
}
