import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "danger";

const variantStyles: Record<Variant, string> = {
  default: "bg-[#0f766e] text-white hover:opacity-90",
  outline: "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50",
  danger: "bg-red-600 text-white hover:bg-red-700"
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
          "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
          variantStyles[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

