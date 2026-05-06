"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ReactNode } from "react";
import {
  CHART_PALETTE,
  ChartCardShell,
  ChartGradients,
  CustomTooltip,
  EmptyChart,
  type PaletteKey
} from "./_chart-foundation";

type Datum = { label: string; value: number };

type LineChartCardProps = {
  title: string;
  subtitle: string;
  data: Datum[];
  palette?: PaletteKey;
  icon: ReactNode;
  emptyMessage?: string;
  formatter?: (value: number) => string;
};

export function LineChartCard({
  title,
  subtitle,
  data,
  palette = "emerald",
  icon,
  emptyMessage = "Sem dados ainda — registre informações pra ver a curva nascer.",
  formatter
}: LineChartCardProps) {
  const colors = CHART_PALETTE[palette];
  const isEmpty = data.length === 0 || data.every((d) => !d.value);
  const gid = `ln-${palette}-${Math.abs(hashString(title)).toString(36)}`;

  return (
    <ChartCardShell title={title} subtitle={subtitle} palette={palette} icon={icon}>
      <div className="h-64 w-full">
        {isEmpty ? (
          <EmptyChart icon={icon} message={emptyMessage} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <ChartGradients id={gid} palette={palette} />
              <CartesianGrid strokeDasharray="3 6" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    formatter={formatter ? (v: number) => formatter(v) : undefined}
                  />
                }
                cursor={{ stroke: colors.accent, strokeWidth: 1, strokeDasharray: "3 3" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="none"
                fill={`url(#${gid}-area)`}
                animationDuration={900}
                animationEasing="ease-out"
                isAnimationActive
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={colors.accent}
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#ffffff", stroke: colors.accent, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: colors.accent, stroke: "#ffffff", strokeWidth: 2.5 }}
                animationDuration={1100}
                animationEasing="ease-out"
                isAnimationActive
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCardShell>
  );
}

// Hash deterministico simples pra gerar IDs unicos por chart
function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}
