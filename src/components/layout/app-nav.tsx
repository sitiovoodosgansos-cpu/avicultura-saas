"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bird,
  Egg,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  Settings,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plantel", label: "Plantel", icon: Bird },
  { href: "/coleta-ovos", label: "Coleta", icon: Egg },
  { href: "/chocadeiras", label: "Chocadeiras", icon: FlaskConical },
  { href: "/sanidade", label: "Sanidade", icon: HeartPulse },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/perfil", label: "Perfil", icon: Settings }
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white p-4 md:block">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Gestão de Aves</p>
          <h2 className="text-lg font-semibold text-zinc-900">Painel Principal</h2>
        </div>
        <nav className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-[#0f766e] text-white"
                    : "text-zinc-700 hover:bg-zinc-100"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-4 border-t border-zinc-200 bg-white p-2 md:hidden">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center rounded-md py-1 text-[11px]",
                active ? "text-[#0f766e]" : "text-zinc-500"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

