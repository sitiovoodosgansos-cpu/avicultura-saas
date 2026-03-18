import { Card } from "@/components/ui/card";

type KpiCardProps = {
  title: string;
  value: string;
  hint?: string;
};

export function KpiCard({ title, value, hint }: KpiCardProps) {
  return (
    <Card>
      <p className="text-sm text-zinc-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
      {hint ? <p className="mt-2 text-xs text-zinc-500">{hint}</p> : null}
    </Card>
  );
}
