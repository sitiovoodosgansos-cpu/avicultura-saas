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
  income: number;
  expenses: number;
};

type StackedBarsCardProps = {
  title: string;
  subtitle: string;
  data: Datum[];
  icon: ReactNode;
};

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  }).format(v);

export function StackedBarsCard({ title, subtitle, data, icon }: StackedBarsCardProps) {
  const isEmpty = data.length === 0 || data.every((d) => d.income === 0 && d.expenses === 0);

  return (
    <ChartCardShell title={title} subtitle={subtitle} palette="emerald" icon={icon}>
      <div className="h-64 w-full">
        {isEmpty ? (
          <EmptyChart icon={icon} message="Registre entradas e saídas pra ver o comparativo financeiro." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
              barCategoryGap="22%"
            >
              <ChartGradients id="finance-in" palette="emerald" />
              <ChartGradients id="finance-out" palette="rose" />
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
                width={50}
              />
              <Tooltip
                content={<CustomTooltip formatter={(v: number) => formatBRL(v)} />}
                cursor={{ fill: "rgba(148, 163, 184, 0.06)" }}
              />
              <Bar
                dataKey="income"
                name="Entradas"
                fill="url(#finance-in-bar)"
                radius={[8, 8, 0, 0]}
                animationDuration={800}
                animationEasing="ease-out"
              />
              <Bar
                dataKey="expenses"
                name="Saídas"
                fill="url(#finance-out-bar)"
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
            <span className="block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600" />
            Entradas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-rose-400 to-rose-600" />
            Saídas
          </span>
        </div>
      ) : null}
    </ChartCardShell>
  );
}
