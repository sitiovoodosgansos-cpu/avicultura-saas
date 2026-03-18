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

type Datum = {
  label: string;
  income: number;
  expenses: number;
};

type StackedBarsCardProps = {
  title: string;
  subtitle: string;
  data: Datum[];
};

export function StackedBarsCard({ title, subtitle, data }: StackedBarsCardProps) {
  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
        <p className="text-xs text-zinc-500">{subtitle}</p>
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
