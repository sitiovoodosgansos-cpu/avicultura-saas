"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ReactNode } from "react";
import {
  ChartCardShell,
  ChartGradients,
  CustomTooltip,
  EmptyChart
} from "./_chart-foundation";

type Datum = {
  label: string;
  /** vendas de ovos (Prateleira) — count de transacoes ou itens */
  eggs: number;
  /** vendas de aves (Vitrine) — count de aves vendidas */
  birds: number;
};

type Props = {
  title: string;
  subtitle: string;
  data: Datum[];
  icon: ReactNode;
  emptyMessage?: string;
};

export function SalesComparisonCard({
  title,
  subtitle,
  data,
  icon,
  emptyMessage = "Sem vendas nesse periodo."
}: Props) {
  const isEmpty = data.length === 0 || data.every((d) => d.eggs === 0 && d.birds === 0);

  return (
    <ChartCardShell title={title} subtitle={subtitle} palette="amber" icon={icon}>
      <div className="h-64 w-full">
        {isEmpty ? (
          <EmptyChart icon={icon} message={emptyMessage} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
              barCategoryGap="22%"
            >
              <ChartGradients id="sales-eggs" palette="amber" />
              <ChartGradients id="sales-birds" palette="indigo" />
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
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(148, 163, 184, 0.06)" }}
              />
              <Bar
                dataKey="eggs"
                name="Ovos (Prateleira)"
                fill="url(#sales-eggs-bar)"
                radius={[8, 8, 0, 0]}
                animationDuration={800}
                animationEasing="ease-out"
              />
              <Bar
                dataKey="birds"
                name="Aves (Vitrine)"
                fill="url(#sales-birds-bar)"
                radius={[8, 8, 0, 0]}
                animationDuration={950}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {!isEmpty ? (
        <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600" />
            Ovos (Prateleira)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600" />
            Aves (Vitrine)
          </span>
        </div>
      ) : null}
    </ChartCardShell>
  );
}
