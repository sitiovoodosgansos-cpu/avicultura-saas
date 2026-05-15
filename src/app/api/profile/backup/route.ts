import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { exportTenantBackup } from "@/lib/tenant/backup-restore";

// GET /api/profile/backup
// So o OWNER (User) pode baixar backup — funcionarios nao tem acesso.
export async function GET() {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  if (auth.session.user.kind !== "owner") {
    return NextResponse.json(
      { error: "Apenas o dono do criatorio pode exportar/restaurar backups." },
      { status: 403 }
    );
  }

  const backup = await exportTenantBackup(auth.session.user.tenantId);
  const filename = `ornabird-backup-${backup.tenantId.slice(0, 8)}-${backup.exportedAt.replace(/[:.]/g, "-")}.json`;

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
