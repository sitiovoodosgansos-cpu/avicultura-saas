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
  hatched: number;
  infertile: number;
  lost: number;
};

type StackedResultsCardProps = {
  title: string;
  subtitle: string;
  data: Datum[];
  icon: ReactNode;
};

export function StackedResultsCard({ title, subtitle, data, icon }: StackedResultsCardProps) {
  const isEmpty =
    data.length === 0 ||
    data.every((d) => !d.hatched && !d.infertile && !d.lost);

  return (
    <ChartCardShell title={title} subtitle={subtitle} palette="emerald" icon={icon}>
      <div className="h-64 w-full">
        {isEmpty ? (
          <EmptyChart icon={icon} message="Quando os lotes forem finalizados, o resultado vai aparecer aqui." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
              barCategoryGap="22%"
            >
              <ChartGradients id="result-hatched" palette="emerald" />
              <ChartGradients id="result-infertile" palette="amber" />
              <ChartGradients id="result-lost" palette="rose" />
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
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(148, 163, 184, 0.06)" }}
              />
              <Bar
                dataKey="hatched"
                stackId="batch"
                name="Eclodidos"
                fill="url(#result-hatched-bar)"
                animationDuration={800}
              />
              <Bar
                dataKey="infertile"
                stackId="batch"
                name="Inférteis"
                fill="url(#result-infertile-bar)"
                animationDuration={900}
              />
              <Bar
                dataKey="lost"
                stackId="batch"
                name="Perdidos"
                fill="url(#result-lost-bar)"
                animationDuration={1000}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {!isEmpty ? (
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600" />
            Eclodidos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600" />
            Inférteis
          </span>
          <span className="flex items-center gap-1.5">
            <span className="block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-rose-400 to-rose-600" />
            Perdidos
          </span>
        </div>
      ) : null}
    </ChartCardShell>
  );
}
