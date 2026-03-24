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
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 backdrop-blur-sm md:items-center md:p-4">
      <div className="mt-2 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-[color:var(--line)] bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.25)] md:mt-0">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
