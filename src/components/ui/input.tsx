import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none ring-[#0f766e]/30 placeholder:text-zinc-400 focus:ring-2",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

