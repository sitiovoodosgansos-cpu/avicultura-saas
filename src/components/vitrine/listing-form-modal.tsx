"use client";

import { useEffect, useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FlockGroupRef, VitrineListingItem } from "@/components/vitrine/listing-card";

const inputClass =
  "h-10 w-full rounded-xl border border-[color:var(--line)] bg-white/90 px-3 text-[13px] text-slate-800 outline-none focus:ring-4 focus:ring-[color:var(--brand)]/20 sm:h-11 sm:rounded-2xl sm:px-4 sm:text-sm";

const textareaClass =
  "min-h-24 w-full rounded-2xl border border-[color:var(--line)] bg-white/90 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-[color:var(--brand)]/20 sm:px-4 sm:py-3";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {children}
    </label>
  );
}

export type ListingFormValues = {
  flockGroupId: string;
  title: string;
  ageInMonths: number;
  initialQuantity: number;
  availableQuantity?: number;
  priceOverride: string;
  description: string;
  status?: "AVAILABLE" | "SOLD_OUT" | "REMOVED";
};

const empty: ListingFormValues = {
  flockGroupId: "",
  title: "",
  ageInMonths: 0,
  initialQuantity: 1,
  priceOverride: "",
  description: ""
};

export function ListingFormModal({
  open,
  editing,
  flockGroups,
  onClose,
  onSubmit,
  error
}: {
  open: boolean;
  editing: VitrineListingItem | null;
  flockGroups: FlockGroupRef[];
  onClose: () => void;
  onSubmit: (values: ListingFormValues, id?: string) => Promise<void>;
  error: string | null;
}) {
  const [values, setValues] = useState<ListingFormValues>(empty);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setValues({
        flockGroupId: editing.flockGroupId,
        title: editing.title ?? "",
        ageInMonths: editing.ageInMonths,
        initialQuantity: editing.initialQuantity,
        availableQuantity: editing.availableQuantity,
        priceOverride: editing.priceOverride !== null ? String(editing.priceOverride) : "",
        description: editing.description ?? "",
        status: editing.status
      });
    } else {
      setValues(empty);
    }
  }, [open, editing]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(values, editing?.id);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppModal
      open={open}
      title={editing ? "Editar anúncio" : "Novo anúncio"}
      onClose={onClose}
      error={error}
    >
      <form onSubmit={handleSubmit} className="grid gap-3">
        <Field label="Nome do card (Plantel)">
          <select
            className={inputClass}
            required
            value={values.flockGroupId}
            onChange={(event) => setValues({ ...values, flockGroupId: event.target.value })}
            disabled={Boolean(editing)}
          >
            <option value="">Selecione um card do Plantel</option>
            {flockGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.title}
              </option>
            ))}
          </select>
        </Field>

        {flockGroups.length === 0 ? (
          <p className="text-xs text-amber-700">
            Nenhum card cadastrado no Plantel ainda. Crie um grupo no Plantel para usar a Vitrine.
          </p>
        ) : null}

        <Field label="Título do anúncio (opcional)">
          <Input
            value={values.title}
            onChange={(event) => setValues({ ...values, title: event.target.value })}
            placeholder="Ex: Lote abril 2026"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Idade (meses)">
            <Input
              type="number"
              min={0}
              max={999}
              required
              value={values.ageInMonths}
              onChange={(event) =>
                setValues({ ...values, ageInMonths: Number(event.target.value || 0) })
              }
            />
          </Field>
          <Field label="Quantidade inicial">
            <Input
              type="number"
              min={1}
              required
              value={values.initialQuantity}
              onChange={(event) =>
                setValues({ ...values, initialQuantity: Number(event.target.value || 0) })
              }
              disabled={Boolean(editing)}
            />
          </Field>
          <Field label="Preço (R$, opcional)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={values.priceOverride}
              onChange={(event) => setValues({ ...values, priceOverride: event.target.value })}
              placeholder="Puxa da tabela se vazio"
            />
          </Field>
        </div>

        {editing ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Quantidade disponível">
              <Input
                type="number"
                min={0}
                max={editing.initialQuantity}
                value={values.availableQuantity ?? 0}
                onChange={(event) =>
                  setValues({ ...values, availableQuantity: Number(event.target.value || 0) })
                }
              />
            </Field>
            <Field label="Status">
              <select
                className={inputClass}
                value={values.status ?? "AVAILABLE"}
                onChange={(event) =>
                  setValues({
                    ...values,
                    status: event.target.value as "AVAILABLE" | "SOLD_OUT" | "REMOVED"
                  })
                }
              >
                <option value="AVAILABLE">Disponível</option>
                <option value="SOLD_OUT">Esgotado</option>
                <option value="REMOVED">Removido</option>
              </select>
            </Field>
          </div>
        ) : null}

        <Field label="Descrição">
          <textarea
            className={textareaClass}
            value={values.description}
            onChange={(event) => setValues({ ...values, description: event.target.value })}
            placeholder="Detalhes do anúncio (opcional)"
          />
        </Field>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting || flockGroups.length === 0}>
            {submitting ? "Salvando..." : editing ? "Salvar" : "Criar anúncio"}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
