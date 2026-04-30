"use client";

import { useEffect, useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { VitrineListingItem } from "@/components/vitrine/types";

const textareaClass =
  "min-h-20 w-full rounded-2xl border border-[color:var(--line)] bg-white/90 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-[color:var(--brand)]/20 sm:px-4 sm:py-3";

export type DeathFormValues = {
  quantity: number;
  cause: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {children}
    </label>
  );
}

export function DeathModal({
  open,
  listing,
  onClose,
  onSubmit,
  error
}: {
  open: boolean;
  listing: VitrineListingItem | null;
  onClose: () => void;
  onSubmit: (values: DeathFormValues, id: string) => Promise<void>;
  error: string | null;
}) {
  const [values, setValues] = useState<DeathFormValues>({ quantity: 1, cause: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues({ quantity: 1, cause: "" });
  }, [open]);

  if (!listing) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!listing) return;
    setSubmitting(true);
    try {
      await onSubmit(values, listing.id);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppModal open={open} title="Registrar óbito" onClose={onClose} error={error}>
      <p className="mb-3 text-sm text-slate-600">
        <strong>{listing.title?.trim() || listing.flockGroup.title}</strong> ·{" "}
        {listing.availableQuantity} disponível(is)
      </p>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <Field label="Quantidade que morreu">
          <Input
            type="number"
            min={1}
            max={listing.availableQuantity}
            required
            value={values.quantity}
            onChange={(event) =>
              setValues({ ...values, quantity: Number(event.target.value || 0) })
            }
          />
        </Field>

        <Field label="Causa (opcional)">
          <textarea
            className={textareaClass}
            value={values.cause}
            onChange={(event) => setValues({ ...values, cause: event.target.value })}
            placeholder="Ex: doença respiratória, predador, frio..."
          />
        </Field>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
          A quantidade disponível será reduzida. Se chegar a zero, o lote é arquivado. Quando o
          anúncio é uma ave individual vinda do Plantel, a ave é marcada como morta automaticamente.
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={submitting || values.quantity < 1}
          >
            {submitting ? "Registrando..." : "Registrar óbito"}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
