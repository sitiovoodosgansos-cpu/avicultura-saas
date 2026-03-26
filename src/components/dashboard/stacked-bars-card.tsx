"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";

type Datum = {
  label: string;
  income: number;
  expenses: number;
};

type StackedBarsCardProps = {
  title: string;
  subtitle: string;
  data: Datum[];
  emoji?: string;
};

export function StackedBarsCard({
  title,
  subtitle,
  data,
  emoji = "📊"
}: StackedBarsCardProps) {
  return (
    <Card>
      <div className="mb-4 flex items-start gap-3">
        <IconBadge emoji={emoji} tone="violet" className="size-9 rounded-lg text-base sm:size-10 sm:rounded-xl" />
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 sm:text-base">{title}</h3>
          <p className="text-[11px] text-zinc-500 sm:text-xs">{subtitle}</p>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="income" name="Entradas" fill="#0f766e" />
            <Bar dataKey="expenses" name="Saídas" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
