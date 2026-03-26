import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)]/95 p-3 shadow-[0_14px_38px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:rounded-[28px] sm:p-5 sm:shadow-[0_18px_50px_rgba(15,23,42,0.08)]",
        className
      )}
      {...props}
    />
  );
}
