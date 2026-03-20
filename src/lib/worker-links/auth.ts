import { NextResponse } from "next/server";
import { getWorkerLinkByToken } from "@/lib/worker-links/service";

export async function getWorkerLinkOr401(
  token: string,
  module: "plantel" | "eggs" | "incubators" | "health"
) {
  const link = await getWorkerLinkByToken(token);

  if (!link) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Link de funcionário inválido ou inativo." }, { status: 401 })
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
      response: NextResponse.json({ error: "Este link não possui acesso a este módulo." }, { status: 403 })
    };
  }

  return {
    ok: true as const,
    link
  };
}
