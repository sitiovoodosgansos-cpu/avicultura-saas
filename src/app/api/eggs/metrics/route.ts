import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { getEggMetrics } from "@/lib/eggs/service";

export async function GET() {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const data = await getEggMetrics(auth.session.user.tenantId);
  return NextResponse.json(data);
}
