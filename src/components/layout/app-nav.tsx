"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", emoji: "🏠" },
  { href: "/plantel", label: "Plantel", emoji: "🦚" },
  { href: "/coleta-ovos", label: "Coleta", emoji: "🥚" },
  { href: "/prateleira", label: "Prateleira", emoji: "🪺" },
  { href: "/chocadeiras", label: "Chocadeiras", emoji: "🐣" },
  { href: "/vitrine", label: "Vitrine", emoji: "🛍️" },
  { href: "/sanidade", label: "Sanidade", emoji: "💊" },
  { href: "/financeiro", label: "Financeiro", emoji: "💰" },
  { href: "/relatorios", label: "Relatorios", emoji: "📊" },
  { href: "/perfil", label: "Perfil", emoji: "⚙️" }
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-64 shrink-0 p-3 md:block">
        <div className="sticky top-3 max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-[24px] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,249,255,0.94))] p-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="mb-3">
            <div className="flex items-center gap-2.5">
              <Image
                src="/ornabird-favicon.png"
                alt="Ornabird"
                width={40}
                height={40}
                className="size-9 object-contain"
                priority
              />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400">Ornabird</p>
                <h2 className="truncate text-[11px] font-semibold leading-tight text-slate-900">
                  Gestao de Criatorios
                </h2>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map(({ href, label, emoji }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm font-semibold transition duration-200",
                    active
                      ? "bg-[linear-gradient(135deg,var(--brand),var(--brand-strong))] text-white shadow-[0_8px_20px_rgba(15,157,138,0.18)]"
                      : "text-slate-700 hover:bg-[color:var(--surface-soft)]"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-xl text-base",
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

      <nav className="mobile-bottom-nav fixed left-3 right-3 z-50 grid grid-cols-4 rounded-[22px] border border-[color:var(--line)] bg-white/95 p-1.5 shadow-[0_20px_45px_rgba(15,23,42,0.15)] backdrop-blur md:hidden">
        {navItems.map(({ href, label, emoji }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-[4rem] flex-col items-center justify-center rounded-xl px-1 py-1.5 text-[11px] font-semibold leading-tight",
                active ? "bg-[color:var(--surface-soft)] text-[color:var(--brand-strong)]" : "text-slate-500"
              )}
            >
              <span className={cn("mb-0.5 flex size-7 items-center justify-center rounded-lg text-base", active ? "bg-white" : "bg-slate-100/80")}>
                {emoji}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

