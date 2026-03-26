import { Card } from "@/components/ui/card";
import { IconBadge } from "@/components/ui/icon-badge";

type KpiCardProps = {
  title: string;
  value: string;
  hint?: string;
  emoji?: string;
};

export function KpiCard({ title, value, hint, emoji = "\u{1F4CA}" }: KpiCardProps) {
  return (
    <Card className="h-full">
      <div className="flex items-start gap-3">
        <IconBadge emoji={emoji} tone="amber" className="size-9 rounded-lg text-base sm:size-10 sm:rounded-xl" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 sm:text-xs">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 sm:mt-2">{value}</p>
          {hint ? <p className="mt-1 text-[12px] text-zinc-500 sm:mt-2 sm:text-xs">{hint}</p> : null}
        </div>
      </div>
    </Card>
  );
}

