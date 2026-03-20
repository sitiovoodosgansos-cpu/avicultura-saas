import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { getStripe } from "@/lib/billing/stripe";

export async function POST() {
  const auth = await getApiSessionOr401({ allowBlocked: true, ownerOnly: true });
  if (!auth.ok) return auth.response;

  const tenantId = auth.session.user.tenantId;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "APP_URL não configurada." }, { status: 500 });
  }

  const subscription = await prisma.subscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "desc" }
  });

  if (!subscription?.providerCustomerId) {
    return NextResponse.json(
      { error: "Conta de cobrança ainda não criada. Inicie uma assinatura primeiro." },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: subscription.providerCustomerId,
    return_url: `${appUrl}/perfil`
  });

  return NextResponse.json({ url: portal.url });
}



