"use client";

import { ReactNode } from "react";
import {
  CATEGORICAL_PALETTE,
  CHART_PALETTE,
  ChartCardShell,
  EmptyChart,
  type PaletteKey
} from "./_chart-foundation";
import { formatChartValue, type ChartFormat } from "./palette";

type Segment = { label: string; value: number; palette?: PaletteKey };

type StackedHorizontalCardProps = {
  title: string;
  subtitle: string;
  segments: Segment[];
  palette: PaletteKey;
  icon: ReactNode;
  format?: ChartFormat;
  emptyMessage?: string;
};

export function StackedHorizontalCard({
  title,
  subtitle,
  segments,
  palette,
  icon,
  format,
  emptyMessage = "Sem dados pra exibir ainda."
}: StackedHorizontalCardProps) {
  const formatter = format ? (v: number) => formatChartValue(v, format) : undefined;
  const total = segments.reduce((s, x) => s + x.value, 0);
  const isEmpty = total <= 0;

  // Resolve cor de cada segmento (definida ou via sequencia categorica)
  const colored = segments
    .filter((s) => s.value > 0)
    .map((s, i) => ({
      ...s,
      paletteKey: s.palette ?? CATEGORICAL_PALETTE[i % CATEGORICAL_PALETTE.length]
    }));

  return (
    <ChartCardShell
      title={title}
      subtitle={subtitle}
      palette={palette}
      icon={icon}
      rightSlot={
        !isEmpty ? (
          <div className="flex flex-col items-end text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Total
            </p>
            <p className="text-base font-semibold tabular-nums text-slate-900">
              {formatter ? formatter(total) : total}
            </p>
          </div>
        ) : null
      }
    >
      {isEmpty ? (
        <div className="h-48">
          <EmptyChart icon={icon} message={emptyMessage} />
        </div>
      ) : (
        <div className="space-y-4 py-4">
          {/* Barra unica horizontal com segmentos coloridos */}
          <div className="flex h-12 w-full overflow-hidden rounded-2xl bg-slate-50 shadow-inner">
            {colored.map((s, i) => {
              const c = CHART_PALETTE[s.paletteKey];
              const pct = (s.value / total) * 100;
              return (
                <div
                  key={i}
                  className="group relative flex items-center justify-center transition-all"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(135deg, ${c.from} 0%, ${c.to} 100%)`
                  }}
                  title={`${s.label}: ${formatter ? formatter(s.value) : s.value} (${pct.toFixed(1)}%)`}
                >
                  {pct >= 14 ? (
                    <span className="text-[11px] font-semibold text-white drop-shadow">
                      {pct.toFixed(0)}%
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Legenda detalhada em grid */}
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            {colored.map((s, i) => {
              const c = CHART_PALETTE[s.paletteKey];
              const pct = (s.value / total) * 100;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white/60 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: `linear-gradient(135deg, ${c.from} 0%, ${c.to} 100%)` }}
                    />
                    <span className="truncate text-slate-700">{s.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums text-slate-900">
                      {formatter ? formatter(s.value) : s.value}
                    </p>
                    <p className="text-[10px] text-slate-400">{pct.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ChartCardShell>
  );
}
