import { cn } from "@/lib/utils";

const toneClasses = {
  mint: "bg-emerald-100/80 text-emerald-700",
  sky: "bg-sky-100/80 text-sky-700",
  amber: "bg-amber-100/80 text-amber-700",
  rose: "bg-rose-100/80 text-rose-700",
  violet: "bg-violet-100/80 text-violet-700",
  slate: "bg-slate-100/90 text-slate-700"
} as const;

type IconBadgeProps = {
  emoji: string;
  tone?: keyof typeof toneClasses;
  className?: string;
};

export function IconBadge({ emoji, tone = "mint", className }: IconBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-lg sm:size-11 sm:rounded-2xl",
        toneClasses[tone],
        className
      )}
      aria-hidden
    >
      {emoji}
    </span>
  );
}

