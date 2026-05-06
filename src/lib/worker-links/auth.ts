import { NextResponse } from "next/server";
import { getTenantBilling } from "@/lib/billing/service";
import { getWorkerLinkByToken } from "@/lib/worker-links/service";

type WorkerModule =
  | "plantel"
  | "eggs"
  | "incubators"
  | "health"
  | "dashboard"
  | "prateleira"
  | "vitrine"
  | "financeiro"
  | "relatorios";

export async function getWorkerLinkOr401(token: string, module: WorkerModule) {
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

  const moduleAllowedMap: Record<WorkerModule, boolean> = {
    plantel: link.allowPlantel,
    eggs: link.allowEggs,
    incubators: link.allowIncubators,
    health: link.allowHealth,
    dashboard: link.allowDashboard,
    prateleira: link.allowPrateleira,
    vitrine: link.allowVitrine,
    financeiro: link.allowFinanceiro,
    relatorios: link.allowRelatorios
  };

  if (!moduleAllowedMap[module]) {
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
