import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { getTenantBilling } from "@/lib/billing/service";
import { BillingAccessGate } from "@/components/billing/billing-access-gate";
import { AppNav } from "@/components/layout/app-nav";

export default async function AuthenticatedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const billing = await getTenantBilling(session.user.tenantId);
  if (!billing) {
    redirect("/login");
  }

  const isBlocked = !billing.isAccessAllowed;
  const lockReason: "trial_expired" | "subscription_expired" =
    !billing.isTrialActive && !billing.subscription ? "trial_expired" : "subscription_expired";

  return (
    <div className="min-h-screen md:flex">
      <AppNav />
      <div className="mobile-page-with-nav flex-1 md:pb-0">
        <header className="px-4 py-3 md:px-8">
          <div className="flex items-center justify-between gap-4 rounded-[26px] border border-[color:var(--line)] bg-white/90 px-4 py-3 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Conta ativa</p>
              <h1 className="text-sm font-semibold text-slate-800">{session.user.name}</h1>
              <p className="text-xs text-[color:var(--ink-soft)]">Ornabird - Gestao de Criatorios Ornamentais.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-2xl bg-[color:var(--surface-soft)] px-3 py-2 text-sm text-[color:var(--brand-strong)] md:block">
                Gestao em tempo real
              </div>
              <Link
                href="/api/auth/signout"
                className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[color:var(--surface-soft)]"
              >
                Sair
              </Link>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl p-4 md:p-8">
          {isBlocked ? (
            <BillingAccessGate
              farmName={billing.farmName}
              reason={lockReason}
              trialEndsAt={lockReason === "trial_expired" ? billing.tenant.trialEndsAt.toISOString() : undefined}
            />
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
