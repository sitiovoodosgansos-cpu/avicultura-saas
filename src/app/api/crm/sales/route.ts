import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { listClosedSales } from "@/lib/crm/service";

export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: "crm" });
  if (!auth.ok) return auth.response;
  const sales = await listClosedSales(auth.session.user.tenantId);
  return NextResponse.json({ sales });
}
