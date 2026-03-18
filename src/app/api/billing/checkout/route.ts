import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { getStripe } from "@/lib/billing/stripe";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const auth = await getApiSessionOr401({ allowBlocked: true });
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
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!appUrl || !priceId) {
    return NextResponse.json(
      { error: "ConfiguraÃ§Ã£o de cobranÃ§a incompleta (APP_URL/PRICE_ID)." },
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
    metadata: { tenantId }
  });

  await prisma.subscription.updateMany({
    where: { tenantId },
    data: { providerCustomerId: customerId }
  });

  return NextResponse.json({ url: session.url });
}


