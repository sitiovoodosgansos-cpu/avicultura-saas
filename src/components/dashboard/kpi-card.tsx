import { Card } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";

type KpiCardProps = {
  title: string;
  value: string;
  hint?: string;
  emoji?: string;
};

export function KpiCard({ title, value, hint, emoji = "📊" }: KpiCardProps) {
  return (
    <Card className="h-full">
      <div className="flex flex-col items-center gap-2 text-center sm:items-start sm:gap-3 sm:text-left">
        <IconBadge emoji={emoji} tone="amber" className="size-10 rounded-xl text-lg sm:size-10 sm:rounded-xl" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 sm:text-xs">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 sm:mt-2">{value}</p>
          {hint ? <p className="mt-1 text-[12px] text-zinc-500 sm:mt-2 sm:text-xs">{hint}</p> : null}
        </div>
      </div>
    </Card>
  );
}
