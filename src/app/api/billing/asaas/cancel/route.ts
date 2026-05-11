import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { asaasClient } from "@/lib/billing/asaas";
import { findLatestAsaasSubscription, upsertAsaasSubscription } from "@/lib/billing/service";

// Cancela a assinatura Asaas mais recente do tenant.
// O usuario continua tendo acesso ate o currentPeriodEnd (Asaas honra
// o ciclo ja pago — nao gera proxima cobranca).
export async function POST() {
  try {
    const auth = await getApiSessionOr401({ allowBlocked: true, ownerOnly: true });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.user.tenantId;
    const sub = await findLatestAsaasSubscription(tenantId);

    if (!sub || !sub.providerSubId) {
      return NextResponse.json(
        { error: "Nenhuma assinatura Asaas ativa pra cancelar." },
        { status: 404 }
      );
    }
    if (sub.status === "CANCELED") {
      return NextResponse.json({ ok: true, alreadyCanceled: true });
    }

    await asaasClient.cancelSubscription(sub.providerSubId);

    await upsertAsaasSubscription({
      tenantId,
      customerId: sub.providerCustomerId ?? "",
      subscriptionId: sub.providerSubId,
      status: "CANCELED",
      planCode: sub.planCode,
      nextDueDate: null
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[asaas.cancel] failed", err);
    const message = err instanceof Error ? err.message : "Erro ao cancelar assinatura.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
