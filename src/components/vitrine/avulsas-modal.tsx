"use client";

import { useEffect, useMemo, useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FlockGroupRef } from "@/components/vitrine/types";

const inputClass =
  "h-10 w-full rounded-xl border border-[color:var(--line)] bg-white/90 px-3 text-[13px] text-slate-800 outline-none focus:ring-4 focus:ring-[color:var(--brand)]/20 sm:h-11 sm:rounded-2xl sm:px-4 sm:text-sm";

function Field({
  label,
  children,
  hint
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-slate-500">{hint}</span> : null}
    </label>
  );
}

export type AvulsasFormValues = {
  flockGroupId: string;
  ageInMonths: number;
  females: number;
  males: number;
  unknownSex: number;
};

const empty: AvulsasFormValues = {
  flockGroupId: "",
  ageInMonths: 12,
  females: 0,
  males: 0,
  unknownSex: 0
};

export function AvulsasModal({
  open,
  onClose,
  onSubmit,
  flockGroups,
  error
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: AvulsasFormValues) => Promise<void>;
  flockGroups: FlockGroupRef[];
  error: string | null;
}) {
  const [values, setValues] = useState<AvulsasFormValues>(empty);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(empty);
    setSubmitting(false);
  }, [open]);

  // Filtra cards de recria (ocultos no plantel). User so adiciona aves
  // avulsas em FlockGroups regulares.
  const availableGroups = useMemo(
    () => flockGroups.filter((g) => !g.title.startsWith("Recria · ")),
    [flockGroups]
  );

  const total = values.females + values.males + values.unknownSex;
  const totalLabel = total === 1 ? "1 ave" : `${total} aves`;
  const canSubmit = !submitting && values.flockGroupId !== "" && total >= 1;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppModal open={open} title="Inserir aves" onClose={onClose} error={error}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] leading-relaxed text-emerald-800">
          Use isso pra cadastrar aves que <strong>já existiam antes</strong> do seu uso do
          sistema (sem registro de eclosão). As aves vão entrar no card da raça escolhida no{" "}
          <strong>Plantel</strong> e também na <strong>Vitrine</strong>, com anilhas geradas
          automaticamente. O preço de venda usa a tabela por idade da raça.
        </p>

        <Field label="Raça (card do plantel)">
          <select
            required
            className={inputClass}
            value={values.flockGroupId}
            onChange={(e) => setValues({ ...values, flockGroupId: e.target.value })}
          >
            <option value="">Selecione um card existente</option>
            {availableGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Idade das aves (em meses)"
          hint="Se você tem aves de idades diferentes, faça uma leva pra cada idade."
        >
          <Input
            type="number"
            required
            min={0}
            max={999}
            value={values.ageInMonths}
            onChange={(e) =>
              setValues({ ...values, ageInMonths: Math.max(0, Number(e.target.value)) })
            }
          />
        </Field>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
          <p className="mb-3 text-sm font-semibold text-slate-800">
            Quantidade por sexo
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="🐔 Fêmeas">
              <Input
                type="number"
                min={0}
                max={500}
                value={values.females}
                onChange={(e) =>
                  setValues({ ...values, females: Math.max(0, Number(e.target.value)) })
                }
              />
            </Field>
            <Field label="🐓 Machos">
              <Input
                type="number"
                min={0}
                max={500}
                value={values.males}
                onChange={(e) =>
                  setValues({ ...values, males: Math.max(0, Number(e.target.value)) })
                }
              />
            </Field>
            <Field label="❓ Indefinido">
              <Input
                type="number"
                min={0}
                max={500}
                value={values.unknownSex}
                onChange={(e) =>
                  setValues({ ...values, unknownSex: Math.max(0, Number(e.target.value)) })
                }
              />
            </Field>
          </div>
          <p
            className={`mt-3 text-center text-sm font-semibold ${
              total >= 1 ? "text-emerald-700" : "text-slate-400"
            }`}
          >
            Total: {totalLabel}
          </p>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {submitting ? "Inserindo..." : `Inserir ${totalLabel}`}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
