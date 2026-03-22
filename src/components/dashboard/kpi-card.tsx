import { Card } from "@/components/ui/card";

type KpiCardProps = {
  title: string;
  value: string;
  hint?: string;
  emoji?: string;
};

export function KpiCard({ title, value, hint, emoji = "📊" }: KpiCardProps) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">
        {emoji} {title}
      </p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
      {hint ? <p className="mt-2 text-xs text-zinc-500">{hint}</p> : null}
    </Card>
  );
}
