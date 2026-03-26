import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "danger";
type Size = "default" | "icon";

const variantStyles: Record<Variant, string> = {
  default:
    "bg-[linear-gradient(135deg,var(--brand),var(--brand-strong))] text-white shadow-[0_12px_30px_rgba(15,157,138,0.25)] hover:translate-y-[-1px] hover:opacity-95",
  outline:
    "border border-[color:var(--line)] bg-white/90 text-slate-800 hover:bg-[color:var(--surface-soft)]",
  danger: "bg-red-600 text-white shadow-[0_10px_25px_rgba(220,38,38,0.2)] hover:bg-red-700"
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  iconOnlyOnMobile?: boolean;
  mobileIcon?: React.ReactNode;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      iconOnlyOnMobile = false,
      mobileIcon,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-2xl sm:text-sm",
          size === "default" && "h-9 px-3 sm:h-11 sm:px-4",
          size === "icon" && "size-9 p-0 sm:size-11",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {iconOnlyOnMobile && mobileIcon ? (
          <span aria-hidden className="text-base leading-none sm:hidden">
            {mobileIcon}
          </span>
        ) : null}
        <span className={cn(iconOnlyOnMobile ? "hidden sm:inline" : "")}>{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
