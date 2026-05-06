"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ReactNode } from "react";
import {
  ChartCardShell,
  ChartGradients,
  CustomTooltip,
  EmptyChart,
  type PaletteKey
} from "./_chart-foundation";

type BarDatum = { label: string; value: number };

type BarCardProps = {
  title: string;
  subtitle: string;
  data: BarDatum[];
  palette: PaletteKey;
  icon: ReactNode;
  /**
   * "horizontal" = barras apontam pra direita (cada categoria em uma linha).
   * "vertical"   = barras sobem do chao (categorias no eixo X).
   */
  layout?: "horizontal" | "vertical";
  formatter?: (v: number) => string;
  emptyMessage?: string;
};

export function BarCard({
  title,
  subtitle,
  data,
  palette,
  icon,
  layout = "horizontal",
  formatter,
  emptyMessage = "Sem dados pra exibir ainda."
}: BarCardProps) {
  const isEmpty = data.length === 0 || data.every((d) => !d.value);
  const gid = `bar-${palette}-${layout}`;
  // No Recharts a convencao eh invertida: layout="vertical" no chart
  // significa BARRAS HORIZONTAIS. Renomeio pra clareza no caller.
  const rechartsLayout = layout === "horizontal" ? "vertical" : "horizontal";
  const fillId = layout === "horizontal" ? `${gid}-barH` : `${gid}-bar`;
  const radius: [number, number, number, number] =
    layout === "horizontal" ? [0, 12, 12, 0] : [12, 12, 0, 0];

  return (
    <ChartCardShell title={title} subtitle={subtitle} palette={palette} icon={icon}>
      <div className="h-64 w-full">
        {isEmpty ? (
          <EmptyChart icon={icon} message={emptyMessage} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout={rechartsLayout}
              margin={{ top: 6, right: 28, left: 4, bottom: 0 }}
            >
              <ChartGradients id={gid} palette={palette} />
              {layout === "horizontal" ? (
                <>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatter}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    axisLine={false}
                    tickLine={false}
                    width={130}
                  />
                </>
              ) : (
                <>
                  <XAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                    tickFormatter={formatter}
                  />
                </>
              )}
              <Tooltip
                content={
                  <CustomTooltip
                    formatter={formatter ? (v: number) => formatter(v) : undefined}
                  />
                }
                cursor={{ fill: "rgba(148, 163, 184, 0.06)" }}
              />
              <Bar
                dataKey="value"
                fill={`url(#${fillId})`}
                radius={radius}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCardShell>
  );
}
