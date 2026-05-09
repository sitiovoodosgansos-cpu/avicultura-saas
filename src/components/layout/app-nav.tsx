"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Bird,
  Egg,
  Home,
  KanbanSquare,
  Package,
  Pill,
  Settings,
  ShoppingBag,
  Sparkles,
  Wallet,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

// Lucide em vez de emoji — emojis renderizam diferente em cada OS
// (Windows usa Segoe UI Emoji, macOS Apple Color Emoji, Android Noto)
// e davam impressao de "esta tudo diferente" quando o usuario abria
// em outro computador.
// Relatorios saiu do menu — agora vive como botao destacado dentro
// do Perfil (BillingProfileManager).
const navItems: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/plantel", label: "Plantel", icon: Bird },
  { href: "/coleta-ovos", label: "Coleta", icon: Egg },
  { href: "/prateleira", label: "Prateleira", icon: Package },
  { href: "/chocadeiras", label: "Chocadeiras", icon: Sparkles },
  { href: "/vitrine", label: "Vitrine", icon: ShoppingBag },
  { href: "/sanidade", label: "Sanidade", icon: Pill },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/crm", label: "CRM", icon: KanbanSquare },
  { href: "/perfil", label: "Perfil", icon: Settings }
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
            {navItems.map(({ href, label, icon: Icon }) => {
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
                      "flex size-10 items-center justify-center rounded-2xl",
                      active ? "bg-white/18 text-white" : "bg-white text-[color:var(--brand-strong)] shadow-sm"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>{label}</div>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <nav className="mobile-bottom-nav fixed left-2 right-2 z-50 grid grid-cols-5 gap-0.5 rounded-2xl border border-[color:var(--line)] bg-white/95 p-1 shadow-[0_20px_45px_rgba(15,23,42,0.15)] backdrop-blur md:hidden">
        {navItems.map(({ href, label, icon: Icon }) => {
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
                  "mb-0.5 flex size-6 items-center justify-center rounded-md",
                  active ? "bg-white text-[color:var(--brand-strong)]" : "bg-slate-100/80 text-slate-600"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

