// Cliente HTTP fino pra API Asaas v3.
//
// Asaas nao tem SDK Node oficial. A API REST eh simples e bem documentada
// (https://docs.asaas.com), entao mantemos um wrapper minimo aqui.
//
// Env vars necessarias:
//   ASAAS_API_KEY      — chave de API (formato $aact_xxx pra sandbox,
//                        $aact_prod_xxx pra producao)
//   ASAAS_BASE_URL     — https://sandbox.asaas.com/api OU https://api.asaas.com
//   ASAAS_WEBHOOK_TOKEN — token aleatorio configurado no dashboard Asaas
//                        em Configuracoes → Integracao → Webhooks. O Asaas
//                        manda esse token no header asaas-access-token de
//                        cada call de webhook pra a gente conferir.

const DEFAULT_BASE = "https://sandbox.asaas.com/api";

function baseUrl(): string {
  return (process.env.ASAAS_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
}

function apiKey(): string {
  const key = process.env.ASAAS_API_KEY;
  if (!key) {
    throw new Error(
      "ASAAS_API_KEY nao configurado. Adicione a env var no Vercel pra ativar billing Asaas."
    );
  }
  return key;
}

type AsaasError = {
  errors?: Array<{ code?: string; description?: string }>;
};

async function request<T>(
  path: string,
  init?: { method?: string; json?: unknown; query?: Record<string, string | number | undefined> }
): Promise<T> {
  const method = init?.method ?? "GET";
  const url = new URL(`${baseUrl()}${path}`);
  if (init?.query) {
    for (const [k, v] of Object.entries(init.query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      access_token: apiKey(),
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: init?.json ? JSON.stringify(init.json) : undefined,
    cache: "no-store"
  });

  const text = await res.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    // resposta nao-json (raro), deixa null
  }

  if (!res.ok) {
    const err = payload as AsaasError | null;
    const desc =
      err?.errors?.[0]?.description ||
      `Asaas ${res.status} ${res.statusText}`;
    throw new Error(desc);
  }

  return payload as T;
}

// === Tipos minimos das respostas Asaas que usamos ===

export type AsaasCustomer = {
  id: string;
  name: string;
  email: string | null;
  externalReference: string | null;
};

export type AsaasSubscription = {
  id: string;
  customer: string;
  value: number;
  nextDueDate: string; // YYYY-MM-DD
  cycle: "MONTHLY" | "YEARLY" | "WEEKLY" | "BIWEEKLY";
  billingType: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";
  status: "ACTIVE" | "INACTIVE" | "EXPIRED";
  description: string | null;
  externalReference: string | null;
};

export type AsaasPayment = {
  id: string;
  customer: string;
  subscription: string | null;
  value: number;
  netValue: number;
  billingType: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";
  status:
    | "PENDING"
    | "RECEIVED"
    | "CONFIRMED"
    | "OVERDUE"
    | "REFUNDED"
    | "RECEIVED_IN_CASH"
    | "REFUND_REQUESTED"
    | "CHARGEBACK_REQUESTED"
    | "CHARGEBACK_DISPUTE"
    | "AWAITING_CHARGEBACK_REVERSAL"
    | "DUNNING_REQUESTED"
    | "DUNNING_RECEIVED"
    | "AWAITING_RISK_ANALYSIS";
  dueDate: string;
  paymentDate: string | null;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
};

// === Operacoes ===

export const asaasClient = {
  async createCustomer(input: {
    name: string;
    email?: string;
    cpfCnpj?: string;
    mobilePhone?: string;
    tenantId: string;
  }): Promise<AsaasCustomer> {
    return request<AsaasCustomer>("/v3/customers", {
      method: "POST",
      json: {
        name: input.name,
        email: input.email,
        cpfCnpj: input.cpfCnpj,
        mobilePhone: input.mobilePhone,
        externalReference: input.tenantId,
        notificationDisabled: false
      }
    });
  },

  // Procura customer existente pelo externalReference (= tenantId nosso)
  // Se ja temos customer no DB pelo Subscription.providerCustomerId, esse
  // helper eh uma seguranca extra/recovery.
  async findCustomerByExternalRef(tenantId: string): Promise<AsaasCustomer | null> {
    const res = await request<{ data: AsaasCustomer[] }>("/v3/customers", {
      query: { externalReference: tenantId, limit: 1 }
    });
    return res.data?.[0] ?? null;
  },

  async createSubscription(input: {
    customerId: string;
    value: number;
    nextDueDate: string; // YYYY-MM-DD
    cycle?: "MONTHLY" | "YEARLY";
    description: string;
    externalReference: string; // tenantId
  }): Promise<AsaasSubscription> {
    return request<AsaasSubscription>("/v3/subscriptions", {
      method: "POST",
      json: {
        customer: input.customerId,
        billingType: "UNDEFINED", // cliente escolhe PIX/Boleto/Cartao em cada cobranca
        value: input.value,
        nextDueDate: input.nextDueDate,
        cycle: input.cycle ?? "MONTHLY",
        description: input.description,
        externalReference: input.externalReference
      }
    });
  },

  async getSubscription(id: string): Promise<AsaasSubscription> {
    return request<AsaasSubscription>(`/v3/subscriptions/${id}`);
  },

  async cancelSubscription(id: string): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(`/v3/subscriptions/${id}`, {
      method: "DELETE"
    });
  },

  // Lista as cobrancas (Payments) de uma assinatura — pra mostrar
  // proxima fatura + URL pro user pagar.
  async listSubscriptionPayments(subscriptionId: string): Promise<AsaasPayment[]> {
    const res = await request<{ data: AsaasPayment[] }>(
      `/v3/subscriptions/${subscriptionId}/payments`,
      { query: { limit: 10 } }
    );
    return res.data ?? [];
  },

  // Pega a proxima cobranca pendente (PENDING ou OVERDUE) de uma assinatura.
  // Util pro UI mostrar o link "Pagar agora".
  async getNextPendingPayment(subscriptionId: string): Promise<AsaasPayment | null> {
    const payments = await this.listSubscriptionPayments(subscriptionId);
    const pending = payments.find(
      (p) => p.status === "PENDING" || p.status === "OVERDUE"
    );
    return pending ?? null;
  }
};

// === Helpers de mapeamento de status Asaas → SubscriptionStatus do nosso schema ===

import type { SubscriptionStatus } from "@prisma/client";

export function mapAsaasPaymentStatus(status: AsaasPayment["status"]): SubscriptionStatus {
  if (status === "RECEIVED" || status === "CONFIRMED" || status === "RECEIVED_IN_CASH") {
    return "ACTIVE";
  }
  if (status === "OVERDUE") return "PAST_DUE";
  if (status === "REFUNDED" || status === "CHARGEBACK_REQUESTED") return "CANCELED";
  return "INCOMPLETE";
}

export function mapAsaasSubscriptionStatus(status: AsaasSubscription["status"]): SubscriptionStatus {
  if (status === "ACTIVE") return "ACTIVE";
  if (status === "EXPIRED" || status === "INACTIVE") return "CANCELED";
  return "INCOMPLETE";
}
