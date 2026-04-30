"use client";

import { useEffect, useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { VitrineListingItem } from "@/components/vitrine/listing-card";

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
  title: string;
  species: string;
  breed: string;
  variety: string;
  birthDate: string;
  initialQuantity: number;
  availableQuantity?: number;
  description: string;
  status?: "AVAILABLE" | "SOLD_OUT" | "REMOVED";
};

const empty: ListingFormValues = {
  title: "",
  species: "",
  breed: "",
  variety: "",
  birthDate: "",
  initialQuantity: 1,
  description: ""
};

function toDateInput(value: string | undefined | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ListingFormModal({
  open,
  editing,
  onClose,
  onSubmit,
  error
}: {
  open: boolean;
  editing: VitrineListingItem | null;
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
        title: editing.title ?? "",
        species: editing.species.name,
        breed: editing.breed?.name ?? "",
        variety: editing.variety?.name ?? "",
        birthDate: toDateInput(editing.birthDate),
        initialQuantity: editing.initialQuantity,
        availableQuantity: editing.availableQuantity,
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
        <Field label="Título (opcional)">
          <Input
            value={values.title}
            onChange={(event) => setValues({ ...values, title: event.target.value })}
            placeholder="Ex: Galinha Sedosa Branca - lote abril"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Espécie">
            <Input
              required
              value={values.species}
              onChange={(event) => setValues({ ...values, species: event.target.value })}
              placeholder="Galinha"
              disabled={Boolean(editing)}
            />
          </Field>
          <Field label="Raça">
            <Input
              value={values.breed}
              onChange={(event) => setValues({ ...values, breed: event.target.value })}
              placeholder="Sedosa"
              disabled={Boolean(editing)}
            />
          </Field>
          <Field label="Variedade">
            <Input
              value={values.variety}
              onChange={(event) => setValues({ ...values, variety: event.target.value })}
              placeholder="Branca"
              disabled={Boolean(editing)}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Data de nascimento">
            <Input
              type="date"
              required
              value={values.birthDate}
              onChange={(event) => setValues({ ...values, birthDate: event.target.value })}
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
          {editing ? (
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
          ) : null}
        </div>

        {editing ? (
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
          <Button type="submit" disabled={submitting}>
            {submitting ? "Salvando..." : editing ? "Salvar" : "Criar anúncio"}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
