import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { getCrmMetrics } from "@/lib/crm/service";

export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: "crm" });
  if (!auth.ok) return auth.response;
  const metrics = await getCrmMetrics(auth.session.user.tenantId);
  return NextResponse.json(metrics);
}
