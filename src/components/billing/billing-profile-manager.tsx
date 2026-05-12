"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmployeesManager } from "@/components/employees/employees-manager";
import { TenantProfileEditor } from "@/components/profile/tenant-profile-editor";
import { completeOpenInTab, openUrlWithNativeFallback, preOpenBlankTab } from "@/lib/mobile/open-url";

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
  // Importante: o pre-open da aba precisa rolar SINCRONO dentro do click handler,
  // antes do await fetch — senao o popup blocker bloqueia. Se o fetch der erro,
  // a gente fecha a aba pre-aberta.
  async function startAsaasCheckout() {
    const pendingTab = preOpenBlankTab();
    setProcessingCycle("asaas");
    setError(null);
    try {
      const res = await fetch("/api/billing/asaas/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}) // CPF/CNPJ vem do perfil do tenant
      });
      const payload = await parseApiPayload<{
        ok?: boolean;
        paymentUrl?: string | null;
        message?: string;
        error?: string;
      }>(res);
      if (!res.ok || !payload?.ok) {
        if (pendingTab && !pendingTab.closed) pendingTab.close();
        setError(payload?.error ?? "Nao foi possivel iniciar assinatura Asaas.");
        return;
      }
      if (payload.paymentUrl) {
        await completeOpenInTab(pendingTab, payload.paymentUrl);
      } else {
        if (pendingTab && !pendingTab.closed) pendingTab.close();
        setError(
          "Assinatura criada, mas a Asaas ainda nao gerou a fatura. Aguarde 1 minuto e clique em 'Atualizar status'."
        );
        await loadData();
      }
    } catch {
      if (pendingTab && !pendingTab.closed) pendingTab.close();
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

      {/* Identidade do criatorio (CPF/CNPJ, endereco, logo) — fica ANTES do plano
          pra usuario completar os dados antes de iniciar a assinatura, ja que o
          Asaas exige CPF/CNPJ pra emitir cobranca. */}
      <TenantProfileEditor />

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

        // Estado C: Sem assinatura (ou Stripe CANCELED) — pricing card polido
        return (
          <div className="overflow-hidden rounded-3xl border border-emerald-200/70 bg-white shadow-sm">
            {/* Faixa superior com gradient + selo */}
            <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 px-6 py-8 text-white sm:px-8">
              <div className="absolute inset-0 opacity-20" aria-hidden>
                <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white blur-3xl" />
                <div className="absolute -bottom-12 -left-12 h-56 w-56 rounded-full bg-white blur-3xl" />
              </div>
              <div className="relative flex flex-col gap-1">
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white ring-1 ring-white/30 backdrop-blur">
                  ✨ Plano único — sem fidelidade
                </span>
                <h3 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                  Starter
                </h3>
                <p className="text-sm text-emerald-50">
                  Tudo o que você precisa pra gerenciar seu criatório em um só lugar.
                </p>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-sm font-medium text-emerald-100">R$</span>
                  <span className="text-5xl font-extrabold leading-none tracking-tight tabular-nums sm:text-6xl">
                    97
                  </span>
                  <span className="text-base font-medium text-emerald-100">/ mês</span>
                </div>
              </div>
            </div>

            {/* Conteudo branco */}
            <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-7">
              {/* Features em grid */}
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {[
                  { icon: "🐔", label: "Plantel, ovos, chocadeiras e prateleira" },
                  { icon: "📋", label: "CRM com kanban e funil de vendas" },
                  { icon: "🏬", label: "Vitrine pública pra divulgar suas aves" },
                  { icon: "💰", label: "Financeiro e relatórios completos" },
                  { icon: "🩺", label: "Sanidade e histórico de saúde" },
                  { icon: "👥", label: "Funcionários com permissões granulares" }
                ].map((f) => (
                  <div key={f.label} className="flex items-start gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] text-emerald-700">
                      ✓
                    </div>
                    <div className="text-sm text-zinc-700">
                      <span className="mr-1">{f.icon}</span>
                      {f.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Linha separadora */}
              <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

              {/* Métodos de pagamento como chips */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-zinc-500">Aceita</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  ⚡ PIX
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700 ring-1 ring-amber-200">
                  🧾 Boleto
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 ring-1 ring-blue-200">
                  💳 Cartão
                </span>
              </div>

              {/* CTA */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  disabled={processingCycle !== null}
                  onClick={startAsaasCheckout}
                  className="flex-1 bg-emerald-600 py-6 text-base font-semibold shadow-sm shadow-emerald-600/30 hover:bg-emerald-700 sm:py-3"
                >
                  {processingCycle === "asaas" ? "Abrindo Asaas..." : "Assinar agora — R$97/mês"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadData}
                  className="sm:w-auto"
                >
                  Atualizar
                </Button>
              </div>

              {/* Footer info */}
              <div className="flex items-start gap-2 rounded-2xl bg-zinc-50 px-3 py-2.5 text-[11px] text-zinc-600">
                <span aria-hidden>🔒</span>
                <p>
                  Pagamento processado pela <strong>Asaas</strong> em uma nova aba. PIX libera o
                  acesso em segundos. Cancele a qualquer momento direto aqui pelo painel.
                </p>
              </div>
            </div>
          </div>
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

