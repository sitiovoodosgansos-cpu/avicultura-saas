"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card } from "@/components/ui/card";

type Datum = { label: string; value: number };

type LineChartCardProps = {
  title: string;
  subtitle: string;
  data: Datum[];
  color?: string;
};

export function LineChartCard({
  title,
  subtitle,
  data,
  color = "#0f766e"
}: LineChartCardProps) {
  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
        <p className="text-xs text-zinc-500">{subtitle}</p>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
