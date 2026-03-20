import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { listBirdHistory } from "@/lib/plantel/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: 'plantel' });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const history = await listBirdHistory(auth.session.user.tenantId, id);
  if (!history) {
    return NextResponse.json({ error: "Ave não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ history });
}


