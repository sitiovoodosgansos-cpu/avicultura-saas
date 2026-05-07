"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function AppModal({
  open,
  title,
  onClose,
  error,
  children,
  zIndex = 90
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  error?: string | null;
  children: ReactNode;
  /** Override do z-index. Default 90. Use valor menor (ex: 80) pra
   * modais "container" que abrem outros modais por dentro. */
  zIndex?: number;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-start justify-center overflow-y-auto bg-slate-950/45 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm md:items-center md:p-4"
      style={{ zIndex }}
    >
      <div className="mt-1 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[color:var(--line)] bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:mt-2 sm:rounded-[28px] sm:p-5 md:mt-0">
        <div className="sticky top-0 z-10 -mx-4 mb-3 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 pb-3 pt-1 sm:-mx-5 sm:mb-4 sm:px-5">
          <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">{title}</h3>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
            <p className="text-sm font-medium text-rose-700">{error}</p>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
