"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { CatalogsTab } from "@/components/health/catalogs-tab";
import { HealthManager } from "@/components/health/health-manager";
import { VaccinationsTab } from "@/components/health/vaccinations-tab";

type Tab = "manage" | "vaccinations" | "catalogs";

type Mortality = {
  total: number;
  fromBirds: number;
  fromVitrineLots: number;
};

type MetricsResponse = {
  inTreatment?: number;
  cureRate?: number;
  mortality?: Mortality;
};

const TABS: Array<{ key: Tab; label: string; emoji: string }> = [
  { key: "manage", label: "Casos & Quarentena", emoji: "🏥" },
  { key: "vaccinations", label: "Vacinação", emoji: "💉" },
  { key: "catalogs", label: "Catálogos", emoji: "📚" }
];

export function HealthTabs() {
  const [active, setActive] = useState<Tab>("manage");
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/health/metrics", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as MetricsResponse;
        if (!cancelled) setMetrics(data);
      } catch {
        // ignore
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid gap-4">
      <PageTitle
        title="Sanidade"
        description="Cuidado dos doentes, controle de óbitos, quarentena, medicamentos e vacinação. Catálogos personalizados por sítio."
        icon="💊"
      />

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-1 sm:gap-4">
          <div className="rounded-xl bg-[color:var(--surface-soft)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Em tratamento
            </p>
            <p className="text-2xl font-semibold leading-none text-slate-900">
              {metrics?.inTreatment ?? "—"}
            </p>
          </div>
          <div className="rounded-xl bg-[color:var(--surface-soft)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Mortalidade (30d)
            </p>
            <p className="text-2xl font-semibold leading-none text-slate-900">
              {metrics?.mortality?.total ?? "—"}
            </p>
            {metrics?.mortality && metrics.mortality.fromVitrineLots > 0 ? (
              <p className="mt-0.5 text-[9px] font-medium text-slate-500">
                {metrics.mortality.fromBirds} no plantel · {metrics.mortality.fromVitrineLots}{" "}
                lotes
              </p>
            ) : null}
          </div>
          <div className="rounded-xl bg-[color:var(--surface-soft)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Taxa de cura
            </p>
            <p className="text-2xl font-semibold leading-none text-slate-900">
              {metrics?.cureRate !== undefined ? `${metrics.cureRate.toFixed(1)}%` : "—"}
            </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={
                "rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm " +
                (isActive
                  ? "bg-[linear-gradient(135deg,var(--brand),var(--brand-strong))] text-white shadow"
                  : "border border-[color:var(--line)] bg-white text-slate-700 hover:bg-[color:var(--surface-soft)]")
              }
            >
              {tab.emoji} {tab.label}
            </button>
          );
        })}
      </div>

      {active === "manage" ? <HealthManager /> : null}
      {active === "vaccinations" ? <VaccinationsTab /> : null}
      {active === "catalogs" ? <CatalogsTab /> : null}
    </div>
  );
}
