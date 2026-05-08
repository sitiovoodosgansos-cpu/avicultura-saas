import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { listDeathsWithHistory } from "@/lib/health/deaths";

export async function GET(request: NextRequest) {
  const auth = await getApiSessionOr401({ employeePermission: "health" });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  const from = fromStr ? new Date(`${fromStr}T00:00:00`) : undefined;
  const to = toStr ? new Date(`${toStr}T23:59:59`) : undefined;

  const data = await listDeathsWithHistory(auth.session.user.tenantId, { from, to });
  return NextResponse.json(data);
}
