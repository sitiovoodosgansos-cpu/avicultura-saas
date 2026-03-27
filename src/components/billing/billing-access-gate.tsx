"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { openUrlWithNativeFallback } from "@/lib/mobile/open-url";

type BillingAccessGateProps = {
  farmName: string;
  reason: "trial_expired" | "subscription_expired";
  trialEndsAt?: string;
};

async function parsePayload<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function BillingAccessGate({ farmName, reason, trialEndsAt }: BillingAccessGateProps) {
  const [loadingCycle, setLoadingCycle] = useState<null | "monthly" | "yearly">(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(billingCycle: "monthly" | "yearly") {
    setLoadingCycle(billingCycle);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingCycle })
      });
      const payload = await parsePayload<{ url?: string; error?: string }>(res);
      if (!res.ok || !payload?.url) {
        setError(payload?.error ?? "Nao foi possivel abrir o checkout.");
        return;
      }
      await openUrlWithNativeFallback(payload.url);
    } catch {
      setError("Nao foi possivel iniciar a assinatura agora.");
    } finally {
      setLoadingCycle(null);
    }
  }

  async function refreshStatus() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/status", { cache: "no-store" });
      const payload = await parsePayload<{ isAccessAllowed?: boolean; error?: string }>(res);
      if (!res.ok) {
        setError(payload?.error ?? "Nao foi possivel atualizar o status.");
        return;
      }
      if (payload?.isAccessAllowed) {
        window.location.reload();
        return;
      }
      setError("Assinatura ainda nao liberada. Conclua o pagamento e tente novamente.");
    } catch {
      setError("Nao foi possivel atualizar o status.");
    } finally {
      setRefreshing(false);
    }
  }

  const reasonTitle =
    reason === "trial_expired"
      ? "Seu periodo de teste terminou"
      : "Sua assinatura esta vencida";

  return (
    <div className="mx-auto max-w-2xl py-4 sm:py-8">
      <Card className="border border-red-200 bg-white">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">Acesso bloqueado</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">{reasonTitle}</h2>
        <p className="mt-2 text-sm text-slate-600">
          O acesso ao criatorio <span className="font-semibold text-slate-800">{farmName}</span> foi bloqueado
          automaticamente ate regularizar a assinatura.
        </p>
        {trialEndsAt ? (
          <p className="mt-2 text-sm text-slate-500">
            Trial encerrado em {new Date(trialEndsAt).toLocaleDateString("pt-BR")}.
          </p>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button type="button" disabled={loadingCycle !== null} onClick={() => startCheckout("monthly")}>
            {loadingCycle === "monthly" ? "Abrindo..." : "Assinar Starter mensal"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loadingCycle !== null}
            onClick={() => startCheckout("yearly")}
          >
            {loadingCycle === "yearly" ? "Abrindo..." : "Assinar Starter anual"}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={refreshing} onClick={refreshStatus}>
            {refreshing ? "Atualizando..." : "Ja paguei, atualizar status"}
          </Button>
          <Link
            href="/api/auth/signout"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-[color:var(--line)] px-3 text-xs font-semibold text-slate-700 transition hover:bg-[color:var(--surface-soft)] sm:h-11 sm:rounded-2xl sm:px-4 sm:text-sm"
          >
            Sair da conta
          </Link>
        </div>
      </Card>
    </div>
  );
}

export function EmployeeBillingBlockedCard({ farmName }: { farmName: string }) {
  return (
    <div className="mx-auto max-w-2xl py-4 sm:py-8">
      <Card className="border border-red-200 bg-white">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">Acesso bloqueado</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Assinatura do criatorio vencida</h2>
        <p className="mt-2 text-sm text-slate-600">
          O titular da conta precisa renovar a assinatura do criatorio{" "}
          <span className="font-semibold text-slate-800">{farmName}</span> para liberar os lancamentos da equipe.
        </p>
        <div className="mt-4">
          <Link
            href="/equipe/auth/logout"
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-[color:var(--line)] px-4 text-sm font-semibold text-slate-700 transition hover:bg-[color:var(--surface-soft)]"
          >
            Sair
          </Link>
        </div>
      </Card>
    </div>
  );
}

