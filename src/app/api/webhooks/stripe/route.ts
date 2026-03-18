import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import { getStripe } from "@/lib/billing/stripe";
import { upsertStripeSubscription } from "@/lib/billing/service";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

async function resolveTenantIdFromEvent(event: Stripe.Event): Promise<string | null> {
  const object = event.data.object as unknown as Record<string, unknown>;

  const metadataTenantId =
    typeof object.metadata === "object" &&
    object.metadata &&
    "tenantId" in object.metadata
      ? String((object.metadata as Record<string, unknown>).tenantId || "")
      : "";
  if (metadataTenantId) return metadataTenantId;

  const subscriptionId =
    typeof object.id === "string" && event.type.startsWith("customer.subscription")
      ? object.id
      : typeof object.subscription === "string"
        ? object.subscription
        : null;

  if (subscriptionId) {
    const sub = await prisma.subscription.findFirst({
      where: { providerSubId: subscriptionId },
      select: { tenantId: true }
    });
    if (sub?.tenantId) return sub.tenantId;
  }

  const customerId = typeof object.customer === "string" ? object.customer : null;
  if (customerId) {
    const sub = await prisma.subscription.findFirst({
      where: { providerCustomerId: customerId },
      select: { tenantId: true }
    });
    if (sub?.tenantId) return sub.tenantId;
  }

  return null;
}

function readUnixField(input: unknown, key: string): number | null {
  if (!input || typeof input !== "object") return null;
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit({ key: `stripe-webhook:${ip}`, limit: 300, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 400 });
  }

  const stripe = getStripe();
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  const tenantId = await resolveTenantIdFromEvent(event);
  if (!tenantId) {
    return NextResponse.json({ received: true });
  }

  const existing = await prisma.paymentEvent.findUnique({
    where: { providerEventId: event.id }
  });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const paymentLog = await prisma.paymentEvent.create({
    data: {
      tenantId,
      providerEventId: event.id,
      type: event.type,
      payload: JSON.parse(payload) as Prisma.JsonObject
    }
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subscriptionResp = await stripe.subscriptions.retrieve(
            String(session.subscription)
          );
          const subscription = subscriptionResp as unknown;
          await upsertStripeSubscription({
            tenantId,
            customerId: session.customer ? String(session.customer) : null,
            subscriptionId: String((subscription as Record<string, unknown>).id),
            status: String((subscription as Record<string, unknown>).status) as Stripe.Subscription.Status,
            priceId:
              ((subscription as Record<string, unknown>).items as { data?: Array<{ price?: { id?: string } }> } | undefined)
                ?.data?.[0]?.price?.id ?? null,
            currentPeriodEnd: readUnixField(subscription, "current_period_end"),
            trialEnd: readUnixField(subscription, "trial_end")
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertStripeSubscription({
          tenantId,
          customerId: subscription.customer ? String(subscription.customer) : null,
          subscriptionId: subscription.id,
          status: subscription.status,
          priceId: subscription.items.data[0]?.price?.id ?? null,
          currentPeriodEnd: readUnixField(subscription, "current_period_end"),
          trialEnd: readUnixField(subscription, "trial_end")
        });
        break;
      }
      default:
        break;
    }

    await prisma.paymentEvent.update({
      where: { id: paymentLog.id },
      data: { processedAt: new Date() }
    });
  } catch {
    return NextResponse.json({ error: "Falha ao processar webhook." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
