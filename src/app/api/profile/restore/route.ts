import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { isValidBackupShape, restoreTenantBackup } from "@/lib/tenant/backup-restore";

// POST /api/profile/restore
// Body: JSON do backup. So OWNER. tenantId do backup tem que casar com o
// tenant atual (sem cross-tenant restore).
export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  if (auth.session.user.kind !== "owner") {
    return NextResponse.json(
      { error: "Apenas o dono do criatorio pode restaurar backups." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Arquivo de backup invalido — nao eh um JSON valido." },
      { status: 400 }
    );
  }

  if (!isValidBackupShape(body)) {
    return NextResponse.json(
      { error: "Arquivo nao parece ser um backup do Ornabird (estrutura incompativel)." },
      { status: 400 }
    );
  }

  try {
    const counts = await restoreTenantBackup(
      auth.session.user.tenantId,
      auth.session.user.id,
      body
    );
    return NextResponse.json({ ok: true, counts });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao restaurar o backup." },
      { status: 500 }
    );
  }
}
