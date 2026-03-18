import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getTenantBilling } from "@/lib/billing/service";

export async function getApiSessionOr401(options?: { allowBlocked?: boolean }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenantId) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Não autenticado." }, { status: 401 })
    };
  }

  if (!options?.allowBlocked) {
    const billing = await getTenantBilling(session.user.tenantId);
    if (!billing?.isAccessAllowed) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: "Acesso bloqueado. Regularize sua assinatura na página Perfil." },
          { status: 402 }
        )
      };
    }
  }

  return {
    ok: true as const,
    session
  };
}
