import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { getHealthMetrics } from "@/lib/health/service";

export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: 'health' });
  if (!auth.ok) return auth.response;

  const data = await getHealthMetrics(auth.session.user.tenantId);
  return NextResponse.json(data);
}

