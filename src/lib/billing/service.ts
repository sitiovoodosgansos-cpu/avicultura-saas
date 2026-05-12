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

function mapPlanCodeToLabel(planCode?: string | null) {
  if (!planCode) return "Starter";

  const monthlyPriceIds = [process.env.STRIPE_PRICE_ID_MONTHLY, process.env.STRIPE_PRICE_ID].filter(
    Boolean
  ) as string[];
  const yearlyPriceIds = [process.env.STRIPE_PRICE_ID_YEARLY].filter(Boolean) as string[];

  if (yearlyPriceIds.includes(planCode)) return "Starter anual";
  if (monthlyPriceIds.includes(planCode)) return "Starter mensal";

  const normalized = planCode.toLowerCase();
  // Codigos novos do Asaas
  if (normalized === "starter_asaas_97") return "Starter R$97/mês";
  if (normalized.includes("year") || normalized.includes("anual")) return "Starter anual";
  if (normalized.includes("month") || normalized.includes("mensal")) return "Starter mensal";
  if (normalized === "starter") return "Starter";

  // Fallback for unknown/new Stripe prices: keep friendly label.
  if (normalized.startsWith("price_")) return "Starter";
  return planCode;
}

// Codigo do plano Asaas atual. Se um dia mudarmos preco/criar plano novo,
// codigos antigos ficam grandfathered no DB do mesmo jeito que o Stripe.
export const ASAAS_PLAN_CODE_STARTER_97 = "starter_asaas_97";
export const ASAAS_PLAN_VALUE_STARTER_97 = 97;

export async function getTenantBilling(tenantId: string) {
  const [tenant, subscription, farm, payments] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        status: true,
        trialStartsAt: true,
        trialEndsAt: true,
        logoUrl: true
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
    subscription: subscription
      ? {
          ...subscription,
          planLabel: mapPlanCodeToLabel(subscription.planCode)
        }
      : null,
    farmName: tenant.name || farm?.name || "Criatório",
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

// === Asaas ===
//
// Diferente do Stripe, o status da subscription do Asaas eh manejado pela
// soma de eventos de Payment (PAYMENT_CONFIRMED → ACTIVE, PAYMENT_OVERDUE
// → PAST_DUE etc), porque a propria subscription Asaas nao reflete o estado
// real da cobranca atual.

export async function upsertAsaasSubscription(input: {
  tenantId: string;
  customerId: string;
  subscriptionId: string;
  status: SubscriptionStatus;
  planCode?: string;
  nextDueDate?: string | null; // YYYY-MM-DD
}) {
  const existing = await prisma.subscription.findFirst({
    where: { providerSubId: input.subscriptionId, provider: "asaas" }
  });

  const currentPeriodEnd = input.nextDueDate
    ? new Date(`${input.nextDueDate}T12:00:00`)
    : undefined;

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        providerCustomerId: input.customerId,
        status: input.status,
        currentPeriodEnd,
        planCode: input.planCode ?? existing.planCode
      }
    });
  } else {
    await prisma.subscription.create({
      data: {
        tenantId: input.tenantId,
        provider: "asaas",
        providerCustomerId: input.customerId,
        providerSubId: input.subscriptionId,
        status: input.status,
        planCode: input.planCode ?? ASAAS_PLAN_CODE_STARTER_97,
        currentPeriodEnd
      }
    });
  }

  // Reflete no Tenant pra que getTenantBilling().isAccessAllowed funcione.
  const tenantStatus: TenantStatus =
    input.status === "ACTIVE"
      ? "ACTIVE"
      : input.status === "PAST_DUE"
        ? "PAST_DUE"
        : input.status === "CANCELED"
          ? "CANCELED"
          : "SUSPENDED";

  await prisma.tenant.update({
    where: { id: input.tenantId },
    data: { status: tenantStatus }
  });
}

// Procura a subscription Asaas mais recente do tenant. Retorna null se nunca
// teve. Usado no checkout pra reusar customer + decidir se cria sub nova
// ou retoma existente.
export async function findLatestAsaasSubscription(tenantId: string) {
  return prisma.subscription.findFirst({
    where: { tenantId, provider: "asaas" },
    orderBy: { createdAt: "desc" }
  });
}

// Subscription Stripe ATIVA (legado). Se retornar truthy, NAO oferece Asaas
// — o cliente Stripe legado fica congelado em R$37/mes.
//
// "Ativa de verdade" exige providerCustomerId nao-null: trial criado no
// signup tem status=TRIALING e provider=stripe por padrao, mas sem
// providerCustomerId (so vira nao-null quando o usuario faz checkout no
// Stripe). Sem o filtro de customerId, trials novos eram bloqueados de
// assinar Asaas.
export async function findActiveStripeSubscription(tenantId: string) {
  return prisma.subscription.findFirst({
    where: {
      tenantId,
      provider: "stripe",
      providerCustomerId: { not: null },
      status: { in: ["ACTIVE", "PAST_DUE"] }
    },
    orderBy: { createdAt: "desc" }
  });
}
