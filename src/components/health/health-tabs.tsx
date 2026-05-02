"use client";

import { useState } from "react";
import { PageTitle } from "@/components/layout/page-title";
import { CatalogsTab } from "@/components/health/catalogs-tab";
import { HealthManager } from "@/components/health/health-manager";
import { VaccinationsTab } from "@/components/health/vaccinations-tab";

type Tab = "manage" | "vaccinations" | "catalogs";

const TABS: Array<{ key: Tab; label: string; emoji: string }> = [
  { key: "manage", label: "Casos & Quarentena", emoji: "🏥" },
  { key: "vaccinations", label: "Vacinação", emoji: "💉" },
  { key: "catalogs", label: "Catálogos", emoji: "📚" }
];

export function HealthTabs() {
  const [active, setActive] = useState<Tab>("manage");

  return (
    <div className="grid gap-4">
      <PageTitle
        title="Sanidade"
        description="Cuidado dos doentes, controle de óbitos, quarentena, medicamentos e vacinação. Catálogos personalizados por sítio."
        icon="💊"
      />

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
