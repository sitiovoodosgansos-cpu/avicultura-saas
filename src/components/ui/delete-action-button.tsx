import * as React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DeleteActionButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label?: string;
  iconOnly?: boolean;
};

export function DeleteActionButton({
  label = "Excluir",
  iconOnly = false,
  className,
  "aria-label": ariaLabel,
  ...props
}: DeleteActionButtonProps) {
  const commonLabel = ariaLabel ?? label;

  if (iconOnly) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={commonLabel}
        title={commonLabel}
        className={cn("border-red-200 bg-white text-red-600 shadow-none hover:border-red-300 hover:bg-red-50", className)}
        {...props}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="danger"
      size="icon"
      iconOnlyOnMobile
      mobileIcon={<Trash2 className="h-4 w-4" aria-hidden />}
      aria-label={commonLabel}
      title={commonLabel}
      className={cn("sm:h-11 sm:w-auto sm:px-4 sm:text-sm", className)}
      {...props}
    >
      {label}
    </Button>
  );
}
