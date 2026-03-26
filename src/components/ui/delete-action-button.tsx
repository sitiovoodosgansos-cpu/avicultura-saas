import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DeleteActionButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label?: string;
};

export function DeleteActionButton({
  label = "Excluir",
  className,
  "aria-label": ariaLabel,
  ...props
}: DeleteActionButtonProps) {
  return (
    <Button
      type="button"
      variant="danger"
      size="icon"
      iconOnlyOnMobile
      mobileIcon="🗑️"
      aria-label={ariaLabel ?? label}
      title={ariaLabel ?? label}
      className={cn("sm:h-11 sm:w-auto sm:px-4 sm:text-sm", className)}
      {...props}
    >
      {label}
    </Button>
  );
}

