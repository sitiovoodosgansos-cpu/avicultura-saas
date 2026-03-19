import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-2xl border border-[color:var(--line)] bg-white/90 px-4 text-sm text-slate-800 outline-none ring-[color:var(--brand)]/25 placeholder:text-slate-400 focus:border-transparent focus:ring-4",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
