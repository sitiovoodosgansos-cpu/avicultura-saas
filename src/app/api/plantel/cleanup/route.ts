import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { cleanupOrphanGroups } from "@/lib/plantel/service";

export async function POST() {
  const auth = await getApiSessionOr401({ employeePermission: 'plantel' });
  if (!auth.ok) return auth.response;

  try {
    const deleted = await cleanupOrphanGroups(auth.session.user.tenantId);
    return NextResponse.json({ deleted });
  } catch {
    return NextResponse.json({ error: "Falha ao limpar dados orfaos." }, { status: 500 });
  }
}
