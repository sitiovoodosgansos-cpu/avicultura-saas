import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { wipeTenantData } from "@/lib/tenant/backup-restore";

const wipeSchema = z.object({
  confirm: z.literal("APAGAR TUDO")
});

// POST /api/profile/wipe
// Confirmacao via body { confirm: "APAGAR TUDO" }. So OWNER.
export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  if (auth.session.user.kind !== "owner") {
    return NextResponse.json(
      { error: "Apenas o dono do criatorio pode apagar todos os dados." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = wipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Confirmacao invalida. Digite exatamente 'APAGAR TUDO' (sem aspas, maiusculas)."
      },
      { status: 400 }
    );
  }

  try {
    const counts = await wipeTenantData(auth.session.user.tenantId, auth.session.user.id);
    return NextResponse.json({ ok: true, counts });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao apagar os dados." },
      { status: 500 }
    );
  }
}
