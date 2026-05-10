import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  asaasClient,
  mapAsaasPaymentStatus,
  mapAsaasSubscriptionStatus,
  type AsaasPayment
} from "@/lib/billing/asaas";
import { upsertAsaasSubscription } from "@/lib/billing/service";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

// Eventos Asaas que processamos. Os outros (PAYMENT_CREATED, etc) so logam.
const HANDLED_EVENTS = new Set([
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_OVERDUE",
  "PAYMENT_REFUNDED",
  "PAYMENT_CHARGEBACK_REQUESTED",
  "SUBSCRIPTION_INACTIVATED",
  "SUBSCRIPTION_DELETED",
  "SUBSCRIPTION_UPDATED"
]);

type AsaasWebhookPayload = {
  id?: string; // event id (algumas versoes do webhook nao mandam)
  event: string;
  payment?: AsaasPayment;
  subscription?: {
    id: string;
    customer: string;
    status: "ACTIVE" | "INACTIVE" | "EXPIRED";
    nextDueDate?: string;
    externalReference?: string | null;
  };
};

// Resolve tenantId do payload. Tenta por subscription/payment vinculados
// no DB local; se nao achar, busca pelo externalReference que setamos
// quando criamos a Subscription Asaas.
async function resolveTenantId(payload: AsaasWebhookPayload): Promise<string | null> {
  // Sub direto no payload (eventos SUBSCRIPTION_*)
  if (payload.subscription?.externalReference) {
    return payload.subscription.externalReference;
  }
  if (payload.subscription?.id) {
    const sub = await prisma.subscription.findFirst({
      where: { providerSubId: payload.subscription.id, provider: "asaas" },
      select: { tenantId: true }
    });
    if (sub?.tenantId) return sub.tenantId;
  }
  // Pagamento → vai pela subscription FK do payment
  if (payload.payment?.subscription) {
    const sub = await prisma.subscription.findFirst({
      where: { providerSubId: payload.payment.subscription, provider: "asaas" },
      select: { tenantId: true }
    });
    if (sub?.tenantId) return sub.tenantId;
  }
  // Customer fallback
  if (payload.payment?.customer) {
    const sub = await prisma.subscription.findFirst({
      where: { providerCustomerId: payload.payment.customer, provider: "asaas" },
      select: { tenantId: true }
    });
    if (sub?.tenantId) return sub.tenantId;
  }
  return null;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const guard = rateLimit({ key: `asaas-webhook:${ip}`, limit: 600, windowMs: 15 * 60 * 1000 });
  if (!guard.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Asaas manda o token configurado no dashboard no header asaas-access-token
  const token = request.headers.get("asaas-access-token");
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected) {
    // Se a env var nao foi configurada, recusa (nao roda em prod sem token)
    return NextResponse.json({ error: "Webhook nao configurado." }, { status: 400 });
  }
  if (token !== expected) {
    return NextResponse.json({ error: "Token invalido." }, { status: 401 });
  }

  let payload: AsaasWebhookPayload;
  try {
    payload = (await request.json()) as AsaasWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  if (!payload.event) {
    return NextResponse.json({ error: "event ausente." }, { status: 400 });
  }

  const tenantId = await resolveTenantId(payload);
  if (!tenantId) {
    // Sem tenant resolvido — nao temos subscription correspondente.
    // Pode ser webhook teste do dashboard — responde 200 pra Asaas nao
    // ficar tentando de novo.
    return NextResponse.json({ received: true, tenantResolved: false });
  }

  // Idempotencia: se nao tiver event id, gera um determinístico baseado
  // no payload pra dedupe minimo. Asaas geralmente manda mas as versoes
  // antigas nem sempre.
  const eventId =
    payload.id ||
    `${payload.event}:${payload.payment?.id ?? payload.subscription?.id ?? Date.now()}`;

  const existingLog = await prisma.paymentEvent.findUnique({
    where: { providerEventId: eventId }
  });
  if (existingLog) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const log = await prisma.paymentEvent.create({
    data: {
      tenantId,
      providerEventId: eventId,
      type: payload.event,
      payload: payload as unknown as Prisma.JsonObject
    }
  });

  if (!HANDLED_EVENTS.has(payload.event)) {
    // Evento conhecido mas nao tratado (PAYMENT_CREATED etc) — apenas loga
    await prisma.paymentEvent.update({
      where: { id: log.id },
      data: { processedAt: new Date() }
    });
    return NextResponse.json({ received: true, handled: false });
  }

  try {
    // Eventos de PAYMENT — atualizam subscription baseada no status do payment
    if (payload.event.startsWith("PAYMENT_") && payload.payment) {
      const subscriptionId = payload.payment.subscription;
      if (!subscriptionId) {
        // Pagamento avulso (nao vinculado a subscription) — ignora
        await prisma.paymentEvent.update({
          where: { id: log.id },
          data: { processedAt: new Date() }
        });
        return NextResponse.json({ received: true, handled: false, reason: "no-subscription" });
      }
      const status = mapAsaasPaymentStatus(payload.payment.status);
      // Pega proxima nextDueDate da assinatura — pra atualizar currentPeriodEnd
      let nextDueDate: string | null = null;
      try {
        const sub = await asaasClient.getSubscription(subscriptionId);
        nextDueDate = sub.nextDueDate;
      } catch {
        // Se a chamada falhar, nao quebra — só nao atualiza o currentPeriodEnd
      }
      await upsertAsaasSubscription({
        tenantId,
        customerId: payload.payment.customer,
        subscriptionId,
        status,
        nextDueDate
      });
    }

    // Eventos de SUBSCRIPTION direta
    if (payload.event.startsWith("SUBSCRIPTION_") && payload.subscription) {
      const status = mapAsaasSubscriptionStatus(payload.subscription.status);
      await upsertAsaasSubscription({
        tenantId,
        customerId: payload.subscription.customer,
        subscriptionId: payload.subscription.id,
        status,
        nextDueDate: payload.subscription.nextDueDate ?? null
      });
    }

    await prisma.paymentEvent.update({
      where: { id: log.id },
      data: { processedAt: new Date() }
    });
    return NextResponse.json({ received: true, handled: true });
  } catch (err) {
    console.error("[asaas.webhook] failed processing", payload.event, err);
    return NextResponse.json({ error: "Falha ao processar." }, { status: 500 });
  }
}
