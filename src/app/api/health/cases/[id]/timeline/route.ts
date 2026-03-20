import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { listCaseTimeline } from "@/lib/health/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: 'health' });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const timeline = await listCaseTimeline(auth.session.user.tenantId, id);
  if (!timeline) {
    return NextResponse.json({ error: "Caso não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ timeline });
}

