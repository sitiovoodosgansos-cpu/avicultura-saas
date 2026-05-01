import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { getMortalityCount } from "@/lib/health/mortality";
import { getHealthMetrics } from "@/lib/health/service";

export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: "health" });
  if (!auth.ok) return auth.response;

  const tenantId = auth.session.user.tenantId;

  const now = new Date();
  const last30 = new Date(now);
  last30.setDate(last30.getDate() - 30);

  const [data, mortality] = await Promise.all([
    getHealthMetrics(tenantId),
    getMortalityCount(tenantId, { from: last30, to: now })
  ]);

  return NextResponse.json({ ...data, mortality });
}

