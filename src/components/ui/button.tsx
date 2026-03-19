import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "danger";

const variantStyles: Record<Variant, string> = {
  default:
    "bg-[linear-gradient(135deg,var(--brand),var(--brand-strong))] text-white shadow-[0_12px_30px_rgba(15,157,138,0.25)] hover:translate-y-[-1px] hover:opacity-95",
  outline:
    "border border-[color:var(--line)] bg-white/90 text-slate-800 hover:bg-[color:var(--surface-soft)]",
  danger: "bg-red-600 text-white shadow-[0_10px_25px_rgba(220,38,38,0.2)] hover:bg-red-700"
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
          variantStyles[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
