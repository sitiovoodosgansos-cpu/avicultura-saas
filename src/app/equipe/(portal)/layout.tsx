import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentEmployeeSession } from "@/lib/employees/auth";
import { EmployeeNav } from "@/components/layout/employee-nav";

export default async function EmployeePortalLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentEmployeeSession();
  if (!session) {
    redirect("/equipe/login");
  }

  return (
    <div className="min-h-screen md:flex">
      <EmployeeNav
        permissions={{
          allowPlantel: session.employee.allowPlantel,
          allowEggs: session.employee.allowEggs,
          allowIncubators: session.employee.allowIncubators,
          allowHealth: session.employee.allowHealth
        }}
      />
      <div className="flex-1 pb-24 md:pb-0">
        <header className="sticky top-0 z-40 px-4 py-3 md:px-8">
          <div className="flex items-center justify-between gap-4 rounded-[26px] border border-[color:var(--line)] bg-white/90 px-4 py-3 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Equipe ativa</p>
              <h1 className="text-sm font-semibold text-slate-800">{session.employee.name}</h1>
              <p className="text-xs text-[color:var(--ink-soft)]">{session.tenant.name} - acesso controlado pelo titular</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-2xl bg-[color:var(--surface-soft)] px-3 py-2 text-sm text-[color:var(--brand-strong)] md:block">
                {"\u{1F9FE}"} Lancamentos com seguranca
              </div>
              <Link
                href="/equipe/auth/logout"
                className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[color:var(--surface-soft)]"
              >
                Sair
              </Link>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}
