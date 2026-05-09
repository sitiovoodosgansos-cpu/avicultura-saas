"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Volta pra emojis — o usuario preferiu o visual mais expressivo.
// Trade-off conhecido: emojis variam entre SO (Segoe UI no Windows,
// Apple Color Emoji no macOS, Noto Color no Android), mas o estilo
// vale a pena e a maioria dos usuarios fica num SO so.
// Relatorios saiu do menu — agora vive como atalho destacado dentro
// do Perfil (BillingProfileManager).
const navItems = [
  { href: "/dashboard", label: "Dashboard", emoji: "🏠" },
  { href: "/plantel", label: "Plantel", emoji: "🦚" },
  { href: "/coleta-ovos", label: "Coleta", emoji: "🥚" },
  { href: "/prateleira", label: "Prateleira", emoji: "🪺" },
  { href: "/chocadeiras", label: "Chocadeiras", emoji: "🐣" },
  { href: "/vitrine", label: "Vitrine", emoji: "🏪" },
  { href: "/sanidade", label: "Sanidade", emoji: "💊" },
  { href: "/financeiro", label: "Financeiro", emoji: "💰" },
  { href: "/crm", label: "CRM", emoji: "📋" },
  { href: "/perfil", label: "Perfil", emoji: "⚙️" }
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-72 shrink-0 p-4 md:block">
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[30px] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,249,255,0.94))] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <Image
                src="/ornabird-favicon.png"
                alt="Ornabird"
                width={48}
                height={48}
                className="size-12 object-contain"
                priority
              />
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">Ornabird</p>
                <h2 className="text-sm font-semibold leading-tight text-slate-900">
                  Gestao de Criatorios Ornamentais
                </h2>
              </div>
            </div>
          </div>

          <nav className="space-y-0.5">
            {navItems.map(({ href, label, emoji }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl px-3 py-1.5 text-sm font-semibold transition duration-200",
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

      <nav className="mobile-bottom-nav fixed left-2 right-2 z-50 grid grid-cols-5 gap-0.5 rounded-2xl border border-[color:var(--line)] bg-white/95 p-1 shadow-[0_20px_45px_rgba(15,23,42,0.15)] backdrop-blur md:hidden">
        {navItems.map(({ href, label, emoji }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-[2.75rem] flex-col items-center justify-center rounded-lg px-0.5 py-1 text-[10px] font-semibold leading-tight",
                active ? "bg-[color:var(--surface-soft)] text-[color:var(--brand-strong)]" : "text-slate-500"
              )}
            >
              <span
                className={cn(
                  "mb-0.5 flex size-6 items-center justify-center rounded-md text-[13px]",
                  active ? "bg-white" : "bg-slate-100/80"
                )}
              >
                {emoji}
              </span>
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

