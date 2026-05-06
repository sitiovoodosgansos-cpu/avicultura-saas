"use client";

import {
  Funnel,
  FunnelChart,
  LabelList,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { ReactNode } from "react";
import {
  CHART_PALETTE,
  ChartCardShell,
  CustomTooltip,
  EmptyChart,
  type PaletteKey
} from "./_chart-foundation";

type FunnelStage = { label: string; value: number; palette?: PaletteKey };

type FunnelCardProps = {
  title: string;
  subtitle: string;
  stages: FunnelStage[];
  palette: PaletteKey;
  icon: ReactNode;
  emptyMessage?: string;
};

// Sequencia bonita pra funnel: cor inicial -> final mostrando jornada
const DEFAULT_FUNNEL_PALETTES: PaletteKey[] = [
  "amber",
  "orange",
  "indigo",
  "emerald"
];

export function FunnelCard({
  title,
  subtitle,
  stages,
  palette,
  icon,
  emptyMessage = "Sem dados pra montar o funil ainda."
}: FunnelCardProps) {
  const isEmpty = stages.length === 0 || stages.every((s) => !s.value);

  // Cada stage recebe cor: usa a definida ou a cor da posicao na sequencia
  const sliced = stages.map((s, i) => {
    const p = s.palette ?? DEFAULT_FUNNEL_PALETTES[i % DEFAULT_FUNNEL_PALETTES.length];
    return {
      ...s,
      paletteKey: p,
      fill: CHART_PALETTE[p].accent
    };
  });

  // Conversao do anterior pra cada stage (apos o primeiro)
  const withConversion = sliced.map((s, i) => {
    const prev = i > 0 ? sliced[i - 1].value : null;
    const conv = prev && prev > 0 ? (s.value / prev) * 100 : null;
    return { ...s, conv };
  });

  return (
    <ChartCardShell title={title} subtitle={subtitle} palette={palette} icon={icon}>
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="h-64 w-full">
          {isEmpty ? (
            <EmptyChart icon={icon} message={emptyMessage} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip content={<CustomTooltip />} />
                <Funnel
                  dataKey="value"
                  data={withConversion}
                  isAnimationActive
                  animationDuration={1100}
                  animationEasing="ease-out"
                  stroke="#ffffff"
                  strokeWidth={3}
                >
                  <LabelList
                    position="center"
                    dataKey="label"
                    fill="#ffffff"
                    style={{ fontSize: 12, fontWeight: 600 }}
                  />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          )}
        </div>
        {!isEmpty ? (
          <div className="grid gap-2 text-xs md:min-w-[180px]">
            {withConversion.map((s, i) => {
              const c = CHART_PALETTE[s.paletteKey];
              return (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white/50 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        background: `linear-gradient(135deg, ${c.from} 0%, ${c.to} 100%)`
                      }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-700">{s.label}</p>
                      {s.conv !== null ? (
                        <p className="text-[10px] text-slate-400">
                          {s.conv.toFixed(0)}% do anterior
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <span className="font-semibold tabular-nums text-slate-900">{s.value}</span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </ChartCardShell>
  );
}
