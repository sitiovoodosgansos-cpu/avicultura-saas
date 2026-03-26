"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function AppModal({
  open,
  title,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-950/45 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm md:items-center md:p-4">
      <div className="mt-1 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[color:var(--line)] bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:mt-2 sm:rounded-[28px] sm:p-5 md:mt-0">
        <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
          <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">{title}</h3>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
