import { SubscriptionStatus, TenantStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type StripeSubStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

function mapStripeStatus(status: StripeSubStatus): SubscriptionStatus {
  if (status === "trialing") return "TRIALING";
  if (status === "active") return "ACTIVE";
  if (status === "past_due" || status === "unpaid") return "PAST_DUE";
  if (status === "canceled") return "CANCELED";
  return "INCOMPLETE";
}

function mapTenantStatus(status: StripeSubStatus): TenantStatus {
  if (status === "active") return "ACTIVE";
  if (status === "trialing") return "TRIAL";
  if (status === "past_due" || status === "unpaid") return "PAST_DUE";
  if (status === "canceled") return "CANCELED";
  return "SUSPENDED";
}

export async function getTenantBilling(tenantId: string) {
  const [tenant, subscription, farm, payments] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        status: true,
        trialStartsAt: true,
        trialEndsAt: true
      }
    }),
    prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.farm.findFirst({
      where: { tenantId },
      select: { name: true }
    }),
    prisma.paymentEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        createdAt: true,
        processedAt: true
      }
    })
  ]);

  if (!tenant) return null;

  const now = new Date();
  const trialDaysLeft = Math.max(
    0,
    Math.ceil((tenant.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  const isSubscriptionActive =
    subscription?.status === "ACTIVE" &&
    (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > now);

  const isSubscriptionTrialing =
    subscription?.status === "TRIALING" &&
    ((subscription.trialEndsAt && subscription.trialEndsAt > now) || tenant.trialEndsAt > now);

  const hasActiveSubscription = Boolean(isSubscriptionActive || isSubscriptionTrialing);
  const isTrialActive = tenant.trialEndsAt > now;
  const isAccessAllowed = Boolean(hasActiveSubscription || isTrialActive);
  const accessReason: "trial_expired" | "subscription_expired" | null = isAccessAllowed
    ? null
    : !subscription || subscription.status === "TRIALING" || subscription.status === "INCOMPLETE"
      ? "trial_expired"
      : "subscription_expired";

  return {
    tenant,
    subscription,
    farmName: farm?.name ?? tenant.name,
    payments,
    trialDaysLeft,
    isTrialActive,
    isAccessAllowed,
    accessReason
  };
}

export async function upsertStripeSubscription(input: {
  tenantId: string;
  customerId?: string | null;
  subscriptionId: string;
  status: StripeSubStatus;
  priceId?: string | null;
  currentPeriodEnd?: number | null;
  trialEnd?: number | null;
}) {
  const mappedSubStatus = mapStripeStatus(input.status);
  const mappedTenantStatus = mapTenantStatus(input.status);

  const existing = await prisma.subscription.findFirst({
    where: { providerSubId: input.subscriptionId }
  });

  const currentPeriodEnd = input.currentPeriodEnd
    ? new Date(input.currentPeriodEnd * 1000)
    : undefined;
  const trialEndsAt = input.trialEnd ? new Date(input.trialEnd * 1000) : undefined;

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        providerCustomerId: input.customerId ?? existing.providerCustomerId,
        status: mappedSubStatus,
        currentPeriodEnd,
        trialEndsAt,
        planCode: input.priceId ?? existing.planCode
      }
    });
  } else {
    await prisma.subscription.create({
      data: {
        tenantId: input.tenantId,
        provider: "stripe",
        providerCustomerId: input.customerId ?? undefined,
        providerSubId: input.subscriptionId,
        status: mappedSubStatus,
        planCode: input.priceId ?? "starter",
        trialEndsAt,
        currentPeriodEnd
      }
    });
  }

  await prisma.tenant.update({
    where: { id: input.tenantId },
    data: {
      status: mappedTenantStatus,
      trialEndsAt: trialEndsAt ?? undefined
    }
  });
}
