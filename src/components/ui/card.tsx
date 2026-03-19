import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[color:var(--line)] bg-[color:var(--surface)]/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}
