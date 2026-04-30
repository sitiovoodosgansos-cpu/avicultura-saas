"use client";

import { useEffect, useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL, type VitrineListingItem } from "@/components/vitrine/types";

const inputClass =
  "h-10 w-full rounded-xl border border-[color:var(--line)] bg-white/90 px-3 text-[13px] text-slate-800 outline-none focus:ring-4 focus:ring-[color:var(--brand)]/20 sm:h-11 sm:rounded-2xl sm:px-4 sm:text-sm";

const textareaClass =
  "min-h-20 w-full rounded-2xl border border-[color:var(--line)] bg-white/90 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-[color:var(--brand)]/20 sm:px-4 sm:py-3";

export type PaymentMethod = "PIX" | "CARD" | "CASH";

export type SaleFormValues = {
  quantity: number;
  unitPrice: number;
  paymentMethod: PaymentMethod;
  customer: string;
  notes: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {children}
    </label>
  );
}

export function SellModal({
  open,
  listing,
  onClose,
  onSubmit,
  error
}: {
  open: boolean;
  listing: VitrineListingItem | null;
  onClose: () => void;
  onSubmit: (values: SaleFormValues, id: string) => Promise<void>;
  error: string | null;
}) {
  const [values, setValues] = useState<SaleFormValues>({
    quantity: 1,
    unitPrice: 0,
    paymentMethod: "PIX",
    customer: "",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !listing) return;
    setValues({
      quantity: 1,
      unitPrice: listing.currentPrice ?? 0,
      paymentMethod: "PIX",
      customer: "",
      notes: ""
    });
  }, [open, listing]);

  if (!listing) return null;

  const total = Number((values.quantity * values.unitPrice).toFixed(2));

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
    <AppModal open={open} title="Registrar venda" onClose={onClose} error={error}>
      <p className="mb-3 text-sm text-slate-600">
        <strong>{listing.title?.trim() || listing.flockGroup.title}</strong> ·{" "}
        {listing.availableQuantity} disponível(is)
      </p>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Quantidade">
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
          <Field label="Preço unitário (R$)">
            <Input
              type="number"
              min={0}
              step="0.01"
              required
              value={values.unitPrice}
              onChange={(event) =>
                setValues({ ...values, unitPrice: Number(event.target.value || 0) })
              }
            />
          </Field>
        </div>

        <Field label="Método de pagamento">
          <select
            className={inputClass}
            value={values.paymentMethod}
            onChange={(event) =>
              setValues({
                ...values,
                paymentMethod: event.target.value as PaymentMethod
              })
            }
          >
            <option value="PIX">PIX</option>
            <option value="CARD">Cartão</option>
            <option value="CASH">Dinheiro</option>
          </select>
        </Field>

        <Field label="Comprador (opcional)">
          <Input
            value={values.customer}
            onChange={(event) => setValues({ ...values, customer: event.target.value })}
            placeholder="Nome do comprador"
          />
        </Field>

        <Field label="Notas (opcional)">
          <textarea
            className={textareaClass}
            value={values.notes}
            onChange={(event) => setValues({ ...values, notes: event.target.value })}
            placeholder="Detalhes da venda"
          />
        </Field>

        <div className="rounded-2xl bg-[color:var(--surface-soft)] px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-600">Total</span>
            <span className="text-lg font-semibold text-slate-900">{formatBRL(total)}</span>
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting || values.quantity < 1}>
            {submitting ? "Registrando..." : "Registrar venda"}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
