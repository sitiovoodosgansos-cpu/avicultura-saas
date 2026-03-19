"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", emoji: "🏠" },
  { href: "/plantel", label: "Plantel", emoji: "🦚" },
  { href: "/coleta-ovos", label: "Coleta", emoji: "🥚" },
  { href: "/chocadeiras", label: "Chocadeiras", emoji: "🐣" },
  { href: "/sanidade", label: "Sanidade", emoji: "💊" },
  { href: "/financeiro", label: "Financeiro", emoji: "💰" },
  { href: "/relatorios", label: "Relatorios", emoji: "📊" },
  { href: "/perfil", label: "Perfil", emoji: "⚙️" }
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-72 shrink-0 p-4 md:block">
        <div className="sticky top-4 rounded-[30px] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,249,255,0.94))] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--brand),var(--brand-strong))] text-2xl shadow-[0_12px_30px_rgba(15,157,138,0.22)]">
                🪿
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Gestao Avicola
                </p>
                <h2 className="text-lg font-semibold text-slate-900">Sitio em foco</h2>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-[color:var(--surface-soft)] p-3 text-sm text-[color:var(--ink-soft)]">
              Menu rapido com icones para acompanhar o sitio sem se perder.
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map(({ href, label, emoji }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition duration-200",
                    active
                      ? "bg-[linear-gradient(135deg,var(--brand),var(--brand-strong))] text-white shadow-[0_12px_28px_rgba(15,157,138,0.22)]"
                      : "text-slate-700 hover:bg-[color:var(--surface-soft)]"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-2xl text-lg",
                      active ? "bg-white/18" : "bg-white shadow-sm"
                    )}
                  >
                    {emoji}
                  </span>
                  <div>{label}</div>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <nav className="fixed bottom-3 left-3 right-3 z-50 grid grid-cols-4 rounded-[26px] border border-[color:var(--line)] bg-white/95 p-2 shadow-[0_20px_45px_rgba(15,23,42,0.15)] backdrop-blur md:hidden">
        {navItems.map(({ href, label, emoji }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center rounded-2xl py-2 text-[11px] font-semibold",
                active ? "bg-[color:var(--surface-soft)] text-[color:var(--brand-strong)]" : "text-slate-500"
              )}
            >
              <span className="text-base">{emoji}</span>
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
