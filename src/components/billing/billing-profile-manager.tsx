"use client";

import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    planCode: string;
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
    TRIALING: "Trial",
    ACTIVE: "Ativa",
    PAST_DUE: "Em atraso",
    CANCELED: "Cancelada",
    INCOMPLETE: "Pendente",
    TRIAL: "Trial",
    SUSPENDED: "Suspensa"
  };
  return map[status] ?? status;
}

export function BillingProfileManager() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
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

  async function startCheckout() {
    setProcessing(true);
    setError(null);

    const res = await fetch("/api/billing/checkout", { method: "POST" });
    const payload = (await res.json()) as { url?: string; error?: string };

    if (!res.ok || !payload.url) {
      setError(payload.error ?? "Não foi possível iniciar a assinatura.");
      setProcessing(false);
      return;
    }

    window.location.href = payload.url;
  }

  async function openPortal() {
    setProcessing(true);
    setError(null);

    const res = await fetch("/api/billing/portal", { method: "POST" });
    const payload = (await res.json()) as { url?: string; error?: string };

    if (!res.ok || !payload.url) {
      setError(payload.error ?? "Não foi possível abrir o portal de cobrança.");
      setProcessing(false);
      return;
    }

    window.location.href = payload.url;
  }

  const trialLabel = useMemo(() => {
    if (!data) return "-";
    if (data.isTrialActive) {
      return `${data.trialDaysLeft} dia(s) restantes`;
    }
    return "Trial encerrado";
  }, [data]);

  return (
    <main className="space-y-6">
      <PageTitle
        title="Perfil / Assinatura"
        description="Gerencie sua conta, trial de 7 dias, assinatura e cobrança."
      />

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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-zinc-500">Sítio</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900">{data?.farmName ?? "-"}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Plano atual</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900">{data?.subscription?.planCode ?? "starter"}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Status da assinatura</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900">{labelStatus(data?.subscription?.status ?? data?.tenant.status)}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Trial grátis</p>
          <p className="mt-2 text-xl font-semibold text-zinc-900">{trialLabel}</p>
        </Card>
      </section>

      <Card>
        <h3 className="text-base font-semibold text-zinc-900">Ações de cobrança</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Use os botões abaixo para iniciar a assinatura mensal ou gerenciar método de pagamento, troca de plano e cancelamento.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" disabled={processing} onClick={startCheckout}>
            {processing ? "Processando..." : "Iniciar/renovar assinatura"}
          </Button>
          <Button type="button" variant="outline" disabled={processing || !data?.subscription?.providerCustomerId} onClick={openPortal}>
            Abrir portal de cobrança
          </Button>
          <Button type="button" variant="outline" onClick={loadData}>
            Atualizar status
          </Button>
        </div>
      </Card>

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

