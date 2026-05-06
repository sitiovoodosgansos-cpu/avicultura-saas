import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { CHART_PALETTE, type PaletteKey } from "./_chart-foundation";

type KpiCardProps = {
  title: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  palette?: PaletteKey;
};

export function KpiCard({ title, value, hint, icon, palette = "amber" }: KpiCardProps) {
  const c = CHART_PALETTE[palette];
  return (
    <Card className="h-full transition-shadow hover:shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col items-center gap-2 text-center sm:items-start sm:gap-3 sm:text-left">
        <div
          className="flex size-10 items-center justify-center rounded-xl text-white shadow-sm sm:size-11"
          style={{ background: `linear-gradient(135deg, ${c.from} 0%, ${c.to} 100%)` }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:text-xs">
            {title}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 sm:mt-2 sm:text-3xl">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500 sm:mt-2 sm:text-xs">
              {hint}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
