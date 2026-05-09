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

export type BulkCartItem = {
  listing: VitrineListingItem;
  quantity: number;
  unitPrice: number;
};

export type BulkSubmitPayload = {
  paymentMethod: PaymentMethod;
  customer: string;
  notes: string;
  items: Array<{ listingId: string; quantity: number; unitPrice: number }>;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {children}
    </label>
  );
}

export function BulkSellModal({
  open,
  cart,
  onClose,
  onChangeItem,
  onRemoveItem,
  onSubmit,
  error
}: {
  open: boolean;
  cart: BulkCartItem[];
  onClose: () => void;
  onChangeItem: (listingId: string, patch: Partial<{ quantity: number; unitPrice: number }>) => void;
  onRemoveItem: (listingId: string) => void;
  onSubmit: (values: BulkSubmitPayload) => Promise<void>;
  error: string | null;
}) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const [customer, setCustomer] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPaymentMethod("PIX");
    setCustomer("");
    setNotes("");
  }, [open]);

  const total = cart.reduce(
    (sum, item) => sum + Number((item.quantity * item.unitPrice).toFixed(2)),
    0
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        paymentMethod,
        customer,
        notes,
        items: cart.map((it) => ({
          listingId: it.listing.id,
          quantity: it.quantity,
          unitPrice: it.unitPrice
        }))
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppModal open={open} title="Finalizar venda do carrinho" onClose={onClose} error={error}>
      <p className="mb-3 text-sm text-slate-600">
        {cart.length} {cart.length === 1 ? "item" : "itens"} no carrinho — tudo vira{" "}
        <strong>uma única venda</strong> com o mesmo cliente e pagamento.
      </p>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <div className="grid gap-2">
          {cart.map((item) => {
            const label = item.listing.title?.trim() || item.listing.flockGroup.title;
            const itemTotal = Number((item.quantity * item.unitPrice).toFixed(2));
            return (
              <div
                key={item.listing.id}
                className="rounded-2xl border border-[color:var(--line)] bg-white/90 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
                    <p className="text-[11px] text-slate-500">
                      {item.listing.availableQuantity} disponível(is)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.listing.id)}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Remover
                  </button>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <Field label="Qtd">
                    <Input
                      type="number"
                      min={1}
                      max={item.listing.availableQuantity}
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        onChangeItem(item.listing.id, {
                          quantity: Math.max(
                            1,
                            Math.min(item.listing.availableQuantity, Number(e.target.value || 0))
                          )
                        })
                      }
                    />
                  </Field>
                  <Field label="Preço unit. (R$)">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      value={item.unitPrice}
                      onChange={(e) =>
                        onChangeItem(item.listing.id, {
                          unitPrice: Math.max(0, Number(e.target.value || 0))
                        })
                      }
                    />
                  </Field>
                  <div className="flex items-end justify-end">
                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                      {formatBRL(itemTotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Field label="Método de pagamento">
          <select
            className={inputClass}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          >
            <option value="PIX">PIX</option>
            <option value="CARD">Cartão</option>
            <option value="CASH">Dinheiro</option>
          </select>
        </Field>

        <Field label="Comprador (opcional)">
          <Input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Nome do comprador"
          />
        </Field>

        <Field label="Notas (opcional)">
          <textarea
            className={textareaClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalhes da venda"
          />
        </Field>

        <div className="rounded-2xl bg-[color:var(--surface-soft)] px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-600">Total da venda</span>
            <span className="text-lg font-semibold text-slate-900">{formatBRL(total)}</span>
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting || cart.length === 0}>
            {submitting ? "Registrando..." : "Registrar venda"}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
