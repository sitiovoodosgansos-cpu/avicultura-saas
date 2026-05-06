"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { ReactNode } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  CHART_PALETTE,
  ChartCardShell,
  ChartGradients,
  EmptyChart,
  type PaletteKey
} from "./_chart-foundation";

type GaugeCardProps = {
  title: string;
  subtitle: string;
  /** valor 0-100 (ja em %) */
  value: number;
  /** valor anterior pra delta opcional */
  previousValue?: number;
  palette: PaletteKey;
  icon: ReactNode;
  hint?: string;
  emptyMessage?: string;
};

export function GaugeCard({
  title,
  subtitle,
  value,
  previousValue,
  palette,
  icon,
  hint,
  emptyMessage = "Sem dados pra calcular ainda."
}: GaugeCardProps) {
  const c = CHART_PALETTE[palette];
  const safe = Math.max(0, Math.min(100, value || 0));
  const isEmpty = !value && !previousValue;

  const delta = previousValue !== undefined ? safe - previousValue : undefined;
  const deltaColor =
    delta === undefined
      ? "text-slate-400"
      : delta > 0
        ? "text-emerald-600 bg-emerald-50"
        : delta < 0
          ? "text-rose-600 bg-rose-50"
          : "text-slate-500 bg-slate-50";
  const DeltaIcon = delta === undefined || delta === 0 ? Minus : delta > 0 ? ArrowUp : ArrowDown;

  return (
    <ChartCardShell title={title} subtitle={subtitle} palette={palette} icon={icon}>
      <div className="relative h-64 w-full">
        {isEmpty ? (
          <EmptyChart icon={icon} message={emptyMessage} />
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="68%"
                outerRadius="100%"
                data={[{ name: "value", value: safe, fill: `url(#gauge-${palette}-radial)` }]}
                startAngle={210}
                endAngle={-30}
                cy="62%"
              >
                <ChartGradients id={`gauge-${palette}`} palette={palette} />
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar
                  background={{ fill: "#f1f5f9" }}
                  dataKey="value"
                  cornerRadius={20}
                  animationDuration={1100}
                  animationEasing="ease-out"
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6 text-center">
              <p className="text-4xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-5xl">
                {safe.toFixed(1)}
                <span className="text-2xl text-slate-400 sm:text-3xl">%</span>
              </p>
              {delta !== undefined ? (
                <span
                  className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${deltaColor}`}
                >
                  <DeltaIcon className="h-3.5 w-3.5" />
                  {Math.abs(delta).toFixed(1)} pp vs período anterior
                </span>
              ) : null}
              {hint ? (
                <p className="mt-2 max-w-[12rem] text-[11px] leading-tight text-slate-500">
                  {hint}
                </p>
              ) : null}
            </div>
            {/* ticks 0 / 50 / 100 */}
            <div className="pointer-events-none absolute inset-x-6 bottom-2 flex justify-between text-[10px] font-semibold text-slate-300">
              <span>0%</span>
              <span style={{ color: c.accent }}>50%</span>
              <span>100%</span>
            </div>
          </>
        )}
      </div>
    </ChartCardShell>
  );
}
