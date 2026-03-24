import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { getStripe } from "@/lib/billing/stripe";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    const auth = await getApiSessionOr401({ allowBlocked: true, ownerOnly: true });
    if (!auth.ok) return auth.response;
    const ip = getClientIp(request);
    const limited = rateLimit({
      key: `billing-checkout:${auth.session.user.tenantId}:${ip}`,
      limit: 15,
      windowMs: 15 * 60 * 1000
    });
    if (!limited.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas de checkout. Tente novamente em alguns minutos." },
        { status: 429 }
      );
    }

    const tenantId = auth.session.user.tenantId;
    const userEmail = auth.session.user.email;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
    const payload = (await request.json().catch(() => ({}))) as { billingCycle?: "monthly" | "yearly" };
    const billingCycle = payload.billingCycle === "yearly" ? "yearly" : "monthly";
    const priceId =
      billingCycle === "yearly"
        ? process.env.STRIPE_PRICE_ID_YEARLY
        : process.env.STRIPE_PRICE_ID_MONTHLY ?? process.env.STRIPE_PRICE_ID;

    if (!appUrl || !priceId) {
      return NextResponse.json(
        {
          error:
            billingCycle === "yearly"
              ? "Configuração incompleta: defina STRIPE_PRICE_ID_YEARLY."
              : "Configuração incompleta: defina STRIPE_PRICE_ID_MONTHLY (ou STRIPE_PRICE_ID)."
        },
        { status: 500 }
      );
    }

    const subscription = await prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" }
    });

    const stripe = getStripe();
    let customerId = subscription?.providerCustomerId ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail ?? undefined,
        metadata: { tenantId }
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/perfil?billing=success`,
      cancel_url: `${appUrl}/perfil?billing=cancel`,
      metadata: { tenantId, billingCycle }
    });

    await prisma.subscription.updateMany({
      where: { tenantId },
      data: { providerCustomerId: customerId }
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno ao iniciar checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



