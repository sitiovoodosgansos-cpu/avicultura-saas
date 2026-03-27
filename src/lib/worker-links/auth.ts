import { NextResponse } from "next/server";
import { getTenantBilling } from "@/lib/billing/service";
import { getWorkerLinkByToken } from "@/lib/worker-links/service";

export async function getWorkerLinkOr401(
  token: string,
  module: "plantel" | "eggs" | "incubators" | "health"
) {
  const link = await getWorkerLinkByToken(token);

  if (!link) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Link de funcionario invalido ou inativo." }, { status: 401 })
    };
  }

  const billing = await getTenantBilling(link.tenantId);
  if (!billing?.isAccessAllowed) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Acesso bloqueado. O titular precisa regularizar a assinatura." },
        { status: 402 }
      )
    };
  }

  const allowed =
    (module === "plantel" && link.allowPlantel) ||
    (module === "eggs" && link.allowEggs) ||
    (module === "incubators" && link.allowIncubators) ||
    (module === "health" && link.allowHealth);

  if (!allowed) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Este link nao possui acesso a este modulo." }, { status: 403 })
    };
  }

  return {
    ok: true as const,
    link
  };
}
