"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", emoji: "\u{1F3E0}" },
  { href: "/plantel", label: "Plantel", emoji: "\u{1F99A}" },
  { href: "/coleta-ovos", label: "Coleta", emoji: "\u{1F95A}" },
  { href: "/chocadeiras", label: "Chocadeiras", emoji: "\u{1F423}" },
  { href: "/sanidade", label: "Sanidade", emoji: "\u{1F48A}" },
  { href: "/financeiro", label: "Financeiro", emoji: "\u{1F4B0}" },
  { href: "/relatorios", label: "Relatorios", emoji: "\u{1F4CA}" },
  { href: "/perfil", label: "Perfil", emoji: "\u{2699}\u{FE0F}" }
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-72 shrink-0 p-4 md:block">
        <div className="sticky top-4 rounded-[30px] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,249,255,0.94))] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="mb-8">
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

