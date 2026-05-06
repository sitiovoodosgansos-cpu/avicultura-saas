"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ReactNode } from "react";
import {
  CATEGORICAL_PALETTE,
  CHART_PALETTE,
  ChartCardShell,
  ChartGradients,
  CustomTooltip,
  EmptyChart,
  type PaletteKey
} from "./_chart-foundation";
import { formatChartValue, type ChartFormat } from "./palette";

type DonutDatum = { label: string; value: number; palette?: PaletteKey };

type DonutCardProps = {
  title: string;
  subtitle: string;
  data: DonutDatum[];
  centerLabel: string;
  centerValue: string;
  centerHint?: string;
  palette: PaletteKey;
  icon: ReactNode;
  format?: ChartFormat;
  emptyMessage?: string;
};

export function DonutCard({
  title,
  subtitle,
  data,
  centerLabel,
  centerValue,
  centerHint,
  palette,
  icon,
  format,
  emptyMessage = "Sem dados pra exibir ainda."
}: DonutCardProps) {
  const formatter = format ? (v: number) => formatChartValue(v, format) : undefined;
  const isEmpty = data.length === 0 || data.every((d) => !d.value);

  // Resolve cor de cada fatia: usa a definida ou cai na sequencia categorica
  const slices = data.map((d, i) => ({
    ...d,
    paletteKey: d.palette ?? CATEGORICAL_PALETTE[i % CATEGORICAL_PALETTE.length]
  }));

  return (
    <ChartCardShell title={title} subtitle={subtitle} palette={palette} icon={icon}>
      <div className="relative h-64 w-full">
        {isEmpty ? (
          <EmptyChart icon={icon} message={emptyMessage} />
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {slices.map((s, i) => (
                  <ChartGradients key={i} id={`donut-${i}`} palette={s.paletteKey} />
                ))}
                <Pie
                  data={slices}
                  innerRadius="62%"
                  outerRadius="94%"
                  dataKey="value"
                  paddingAngle={3}
                  cornerRadius={8}
                  startAngle={90}
                  endAngle={-270}
                  animationDuration={1100}
                  animationEasing="ease-out"
                  isAnimationActive
                  stroke="none"
                >
                  {slices.map((s, i) => (
                    <Cell key={i} fill={`url(#donut-${i}-radial)`} />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <CustomTooltip
                      formatter={formatter ? (v: number) => formatter(v) : undefined}
                    />
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {centerLabel}
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
                {centerValue}
              </p>
              {centerHint ? (
                <p className="mt-1 max-w-[8rem] text-[11px] leading-tight text-slate-500">
                  {centerHint}
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
      {!isEmpty ? (
        <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          {slices.map((s, i) => {
            const c = CHART_PALETTE[s.paletteKey];
            return (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: `linear-gradient(135deg, ${c.from} 0%, ${c.to} 100%)` }}
                  />
                  <span className="truncate text-slate-600">{s.label}</span>
                </div>
                <span className="font-semibold tabular-nums text-slate-900">
                  {formatter ? formatter(s.value) : s.value}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </ChartCardShell>
  );
}
