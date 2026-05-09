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
  ShoppingBag,
  Sparkles,
  Wallet,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

// Lucide em vez de emoji — emojis variam visualmente entre OS (Windows
// usa Segoe UI Emoji, macOS Apple Color Emoji, Android Noto). Os mesmos
// icones do nav do titular pra que fique tudo consistente.
// Relatorios saiu do menu titular pra Perfil — funcionario com permissao
// continua acessando via /equipe/relatorios mas o item ficou removido
// do menu (consistencia visual com o titular).
const baseItems: ReadonlyArray<{
  href: string;
  label: string;
  icon: LucideIcon;
  key:
    | "allowDashboard"
    | "allowPlantel"
    | "allowEggs"
    | "allowPrateleira"
    | "allowIncubators"
    | "allowVitrine"
    | "allowHealth"
    | "allowFinanceiro"
    | "allowCrm";
}> = [
  { href: "/equipe/dashboard", label: "Dashboard", icon: Home, key: "allowDashboard" },
  { href: "/equipe/plantel", label: "Plantel", icon: Bird, key: "allowPlantel" },
  { href: "/equipe/coleta-ovos", label: "Coleta", icon: Egg, key: "allowEggs" },
  { href: "/equipe/prateleira", label: "Prateleira", icon: Package, key: "allowPrateleira" },
  { href: "/equipe/chocadeiras", label: "Chocadeiras", icon: Sparkles, key: "allowIncubators" },
  { href: "/equipe/vitrine", label: "Vitrine", icon: ShoppingBag, key: "allowVitrine" },
  { href: "/equipe/sanidade", label: "Sanidade", icon: Pill, key: "allowHealth" },
  { href: "/equipe/financeiro", label: "Financeiro", icon: Wallet, key: "allowFinanceiro" },
  { href: "/equipe/crm", label: "CRM", icon: KanbanSquare, key: "allowCrm" }
];

type Permissions = {
  allowDashboard: boolean;
  allowPlantel: boolean;
  allowEggs: boolean;
  allowPrateleira: boolean;
  allowIncubators: boolean;
  allowVitrine: boolean;
  allowHealth: boolean;
  allowFinanceiro: boolean;
  allowRelatorios: boolean;
  allowCrm: boolean;
};

export function EmployeeNav({ permissions }: { permissions: Permissions }) {
  const pathname = usePathname();
  const items = baseItems.filter((item) => permissions[item.key]);

  return (
    <>
      <aside className="hidden w-72 shrink-0 p-4 md:block">
        <div className="sticky top-4 rounded-[30px] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,249,255,0.94))] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <Image
                src="/ornabird-favicon.png"
                alt="Ornabird Equipe"
                width={48}
                height={48}
                className="size-12 object-contain"
                priority
              />
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">Ornabird Equipe</p>
                <h2 className="text-lg font-semibold text-slate-900">Acesso do funcionario</h2>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-[color:var(--surface-soft)] p-3 text-sm text-[color:var(--ink-soft)]">
              Aqui a equipe lanca dados do sitio com acesso apenas aos modulos liberados.
            </div>
          </div>

          <nav className="space-y-2">
            {items.map(({ href, label, icon: Icon }) => {
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

      {/* Mobile bottom nav: scroll horizontal porque agora pode ter ate 9 modulos */}
      <nav className="mobile-bottom-nav fixed left-3 right-3 z-50 flex gap-1 overflow-x-auto rounded-[22px] border border-[color:var(--line)] bg-white/95 p-1.5 shadow-[0_20px_45px_rgba(15,23,42,0.15)] backdrop-blur md:hidden">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-[4rem] min-w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-xl px-2 py-1.5 text-[11px] font-semibold leading-tight",
                active ? "bg-[color:var(--surface-soft)] text-[color:var(--brand-strong)]" : "text-slate-500"
              )}
            >
              <span
                className={cn(
                  "mb-0.5 flex size-7 items-center justify-center rounded-lg",
                  active ? "bg-white text-[color:var(--brand-strong)]" : "bg-slate-100/80 text-slate-600"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
