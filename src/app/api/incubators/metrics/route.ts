import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { getIncubatorMetrics } from "@/lib/incubators/service";

export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: 'incubators' });
  if (!auth.ok) return auth.response;

  const data = await getIncubatorMetrics(auth.session.user.tenantId);
  return NextResponse.json(data);
}

