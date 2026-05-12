"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmployeesManager } from "@/components/employees/employees-manager";
import { TenantProfileEditor } from "@/components/profile/tenant-profile-editor";
import { openUrlWithNativeFallback } from "@/lib/mobile/open-url";

type BillingStatus = {
  tenant: {
    id: string;
    name: string;
    status: string;
    trialStartsAt: string;
    trialEndsAt: string;
  };
  subscription: {
    id: string;
    provider: string; // "stripe" | "asaas"
    providerSubId: string | null;
    planCode: string;
    planLabel?: string;
    status: string;
    providerCustomerId: string | null;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
  } | null;
  farmName: string;
  payments: Array<{
    id: string;
    type: string;
    createdAt: string;
    processedAt: string | null;
  }>;
  trialDaysLeft: number;
  isTrialActive: boolean;
  isAccessAllowed: boolean;
};

function labelStatus(status?: string | null) {
  if (!status) return "Sem assinatura";
  const map: Record<string, string> = {
    TRIALING: "Teste",
    ACTIVE: "Ativa",
    PAST_DUE: "Em atraso",
    CANCELED: "Cancelada",
    INCOMPLETE: "Pendente",
    TRIAL: "Teste",
    SUSPENDED: "Suspensa"
  };
  return map[status] ?? status;
}

export function BillingProfileManager() {
  const [loading, setLoading] = useState(true);
  const [processingCycle, setProcessingCycle] = useState<
    null | "monthly" | "yearly" | "portal" | "asaas" | "cancel"
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BillingStatus | null>(null);

  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const billingMessage = params.get("billing");

  async function loadData() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/billing/status", { cache: "no-store" });
    if (!res.ok) {
      setError("Não foi possível carregar os dados de assinatura.");
      setLoading(false);
      return;
    }

    const payload = (await res.json()) as BillingStatus;
    setData(payload);
    setLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function parseApiPayload<T>(res: Response): Promise<T | null> {
    try {
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  async function openPortal() {
    setProcessingCycle("portal");
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const payload = await parseApiPayload<{ url?: string; error?: string }>(res);

      if (!res.ok || !payload?.url) {
        setError(payload?.error ?? "Nao foi possivel abrir o portal de cobranca.");
        return;
      }

      await openUrlWithNativeFallback(payload.url);
    } catch {
      setError("Nao foi possivel abrir o portal de cobranca. Verifique a conexao e tente novamente.");
    } finally {
      setProcessingCycle(null);
    }
  }

  // === Asaas: assina ou abre cobranca pendente ===
  async function startAsaasCheckout() {
    setProcessingCycle("asaas");
    setError(null);
    try {
      const res = await fetch("/api/billing/asaas/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}) // CPF/CNPJ podem ser preenchidos no Asaas
      });
      const payload = await parseApiPayload<{
        ok?: boolean;
        paymentUrl?: string | null;
        message?: string;
        error?: string;
      }>(res);
      if (!res.ok || !payload?.ok) {
        setError(payload?.error ?? "Nao foi possivel iniciar assinatura Asaas.");
        return;
      }
      if (payload.paymentUrl) {
        await openUrlWithNativeFallback(payload.paymentUrl);
      } else {
        setError(
          "Assinatura criada, mas a Asaas ainda nao gerou a fatura. Aguarde 1 minuto e clique em 'Atualizar status'."
        );
        await loadData();
      }
    } catch {
      setError("Nao foi possivel iniciar assinatura. Verifique a conexao e tente novamente.");
    } finally {
      setProcessingCycle(null);
    }
  }

  async function cancelAsaasSubscription() {
    if (
      !window.confirm(
        "Cancelar a assinatura? Você continua tendo acesso até o final do período já pago. Sem novas cobranças."
      )
    ) {
      return;
    }
    setProcessingCycle("cancel");
    setError(null);
    try {
      const res = await fetch("/api/billing/asaas/cancel", { method: "POST" });
      const payload = await parseApiPayload<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || !payload?.ok) {
        setError(payload?.error ?? "Falha ao cancelar.");
        return;
      }
      await loadData();
    } catch {
      setError("Falha ao cancelar. Verifique a conexao e tente novamente.");
    } finally {
      setProcessingCycle(null);
    }
  }

  const trialLabel = useMemo(() => {
    if (!data) return "-";
    if (data.isTrialActive) {
      return `${data.trialDaysLeft} dia(s) restantes`;
    }
    return "Período de teste encerrado";
  }, [data]);

  return (
    <main className="space-y-6">
      <PageTitle
        title="Perfil / Assinatura"
        description="Gerencie sua conta, trial de 7 dias, assinatura e cobrança."
        icon="👤"
      />

      {/* Atalhos rapidos do criatorio (substitui o menu de Relatorios). */}
      <Card className="bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Atalhos rápidos</p>
            <h3 className="text-sm font-semibold text-slate-900">Ferramentas do criatório</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/relatorios"
              className="inline-flex items-center gap-2 rounded-2xl border border-indigo-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
            >
              <BarChart3 className="h-4 w-4" />
              📊 Relatórios
            </Link>
          </div>
        </div>
      </Card>

      {billingMessage === "success" ? (
        <Card>
          <p className="text-sm text-emerald-700">Assinatura iniciada com sucesso. Aguarde alguns segundos e atualize a página.</p>
        </Card>
      ) : null}
      {billingMessage === "cancel" ? (
        <Card>
          <p className="text-sm text-amber-700">Pagamento cancelado. Você pode tentar novamente quando quiser.</p>
        </Card>
      ) : null}
      {billingMessage === "required" ? (
        <Card>
          <p className="text-sm text-red-700">
            Seu trial/assinatura expirou. Para continuar usando o sistema, regularize sua assinatura.
          </p>
        </Card>
      ) : null}
      {error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : null}

      <section className="mobile-kpi-grid grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-zinc-500">🏡 Sitio</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900">{data?.farmName ?? "-"}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">📦 Plano atual</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900">
            {data?.subscription?.planLabel ?? data?.subscription?.planCode ?? "Starter"}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">💳 Status da assinatura</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900">{labelStatus(data?.subscription?.status ?? data?.tenant.status)}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">⏳ Teste grátis</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900">{trialLabel}</p>
        </Card>
      </section>

      {(() => {
        const sub = data?.subscription ?? null;
        const isStripeLegacyActive =
          sub?.provider === "stripe" &&
          sub.providerCustomerId !== null &&
          (sub.status === "ACTIVE" || sub.status === "PAST_DUE");
        const isAsaasActive =
          sub?.provider === "asaas" &&
          (sub.status === "ACTIVE" || sub.status === "PAST_DUE" || sub.status === "INCOMPLETE");

        // Estado A: Cliente Stripe legado (grandfathered em R$37/mês)
        if (isStripeLegacyActive) {
          return (
            <Card className="border-amber-200 bg-amber-50">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    Plano legado — preço congelado
                  </span>
                  <h3 className="mt-2 text-base font-semibold text-zinc-900">Starter Stripe — R$37/mês</h3>
                  <p className="mt-1 text-sm text-zinc-700">
                    Você assinou antes da mudança de preço, então mantém o valor antigo. Para gerenciar pagamento,
                    troca de cartão ou cancelar, abra o portal Stripe abaixo.
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">
                    Se cancelar, futuras assinaturas serão pelo novo plano R$97/mês com PIX, Boleto e Cartão (Asaas).
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={processingCycle !== null || !sub?.providerCustomerId}
                  onClick={openPortal}
                >
                  {processingCycle === "portal" ? "Abrindo..." : "Abrir portal Stripe"}
                </Button>
                <Button type="button" variant="outline" onClick={loadData}>
                  Atualizar status
                </Button>
              </div>
            </Card>
          );
        }

        // Estado B: Asaas ativo (ou em atraso/incompleto — mostra link de pagamento)
        if (isAsaasActive) {
          const periodEnd = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
          const isPastDueOrIncomplete = sub?.status === "PAST_DUE" || sub?.status === "INCOMPLETE";
          return (
            <Card>
              <div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    sub?.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-800"
                      : sub?.status === "PAST_DUE"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {labelStatus(sub?.status)}
                </span>
                <h3 className="mt-2 text-base font-semibold text-zinc-900">
                  Starter — R$97/mês (PIX, Boleto ou Cartão)
                </h3>
                {periodEnd ? (
                  <p className="mt-1 text-sm text-zinc-700">
                    Próxima cobrança em <strong>{periodEnd.toLocaleDateString("pt-BR")}</strong>
                  </p>
                ) : null}
                {isPastDueOrIncomplete ? (
                  <p className="mt-2 text-sm text-red-700">
                    Cobrança em aberto. Clique em &quot;Abrir fatura&quot; abaixo para finalizar o pagamento e
                    manter seu acesso.
                  </p>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={processingCycle !== null}
                  onClick={startAsaasCheckout}
                >
                  {processingCycle === "asaas"
                    ? "Abrindo..."
                    : isPastDueOrIncomplete
                      ? "Abrir fatura"
                      : "Ver fatura atual"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={processingCycle !== null}
                  onClick={cancelAsaasSubscription}
                  className="text-red-700 hover:bg-red-50"
                >
                  {processingCycle === "cancel" ? "Cancelando..." : "Cancelar assinatura"}
                </Button>
                <Button type="button" variant="outline" onClick={loadData}>
                  Atualizar status
                </Button>
              </div>
            </Card>
          );
        }

        // Estado C: Sem assinatura (ou Stripe CANCELED) — CTA Asaas R$97
        return (
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  Plano único
                </span>
                <h3 className="mt-2 text-lg font-semibold text-zinc-900">
                  Starter — R$97/mês
                </h3>
                <p className="mt-1 text-sm text-zinc-700">
                  Pague com <strong>PIX</strong>, <strong>Boleto</strong> ou <strong>Cartão</strong>. Cancele a
                  qualquer momento direto aqui pelo painel.
                </p>
                <ul className="mt-3 space-y-1 text-sm text-zinc-700">
                  <li>✅ Sem fidelidade</li>
                  <li>✅ Cobrança recorrente automática</li>
                  <li>✅ Acesso completo a todos os módulos</li>
                </ul>
              </div>
              <div className="flex flex-col gap-2 md:min-w-[220px]">
                <Button
                  type="button"
                  disabled={processingCycle !== null}
                  onClick={startAsaasCheckout}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {processingCycle === "asaas" ? "Iniciando..." : "Assinar — R$97/mês"}
                </Button>
                <Button type="button" variant="outline" onClick={loadData}>
                  Atualizar status
                </Button>
              </div>
            </div>
            <p className="mt-4 text-xs text-zinc-600">
              Após clicar em assinar, você será redirecionado para a tela do Asaas onde escolhe a forma de
              pagamento. PIX é instantâneo; o acesso libera assim que o pagamento for confirmado.
            </p>
          </Card>
        );
      })()}

      <Card>
        <h3 className="text-base font-semibold text-zinc-900">Histórico de pagamentos (eventos)</h3>
        {loading ? <p className="mt-3 text-sm text-zinc-500">Carregando...</p> : null}
        {!loading && (data?.payments.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Sem eventos registrados ainda.</p>
        ) : null}

        {!loading && (data?.payments.length ?? 0) > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Evento</th>
                  <th className="py-2 pr-3">Processado</th>
                </tr>
              </thead>
              <tbody>
                {data?.payments.map((event) => (
                  <tr key={event.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-3">{new Date(event.createdAt).toLocaleString("pt-BR")}</td>
                    <td className="py-2 pr-3">{event.type}</td>
                    <td className="py-2 pr-3">{event.processedAt ? "Sim" : "Pendente"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <TenantProfileEditor />

      <EmployeesManager />

      <Card>
        <h3 className="text-base font-semibold text-zinc-900">Dados da conta</h3>
        <p className="mt-2 text-sm text-zinc-700">Nome do tenant: {data?.tenant.name ?? "-"}</p>
        <p className="mt-1 text-sm text-zinc-700">Início do trial: {data?.tenant.trialStartsAt ? new Date(data.tenant.trialStartsAt).toLocaleDateString("pt-BR") : "-"}</p>
        <p className="mt-1 text-sm text-zinc-700">Fim do trial: {data?.tenant.trialEndsAt ? new Date(data.tenant.trialEndsAt).toLocaleDateString("pt-BR") : "-"}</p>
        <p className="mt-1 text-sm text-zinc-700">Acesso liberado: {data?.isAccessAllowed ? "Sim" : "Não"}</p>
      </Card>
    </main>
  );
}

