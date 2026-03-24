import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onFocus, onClick, onKeyDown, inputMode, autoComplete, ...props }, ref) => {
    const isDate = type === "date";

    function openNativeDatePicker(target: HTMLInputElement) {
      const pickerTarget = target as HTMLInputElement & { showPicker?: () => void };
      if (typeof pickerTarget.showPicker === "function") {
        pickerTarget.showPicker();
      }
    }

    return (
      <input
        ref={ref}
        type={type}
        inputMode={isDate ? "none" : inputMode}
        autoComplete={isDate ? "off" : autoComplete}
        onFocus={(event) => {
          if (isDate) openNativeDatePicker(event.currentTarget);
          onFocus?.(event);
        }}
        onClick={(event) => {
          if (isDate) openNativeDatePicker(event.currentTarget);
          onClick?.(event);
        }}
        onKeyDown={(event) => {
          if (isDate) event.preventDefault();
          onKeyDown?.(event);
        }}
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
