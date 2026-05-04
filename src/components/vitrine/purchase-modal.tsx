"use client";

import { useEffect, useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const inputClass =
  "h-10 w-full rounded-xl border border-[color:var(--line)] bg-white/90 px-3 text-[13px] text-slate-800 outline-none focus:ring-4 focus:ring-[color:var(--brand)]/20 sm:h-11 sm:rounded-2xl sm:px-4 sm:text-sm";

const textareaClass =
  "min-h-20 w-full rounded-2xl border border-[color:var(--line)] bg-white/90 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-[color:var(--brand)]/20 sm:px-4 sm:py-3";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-slate-500">{hint}</span> : null}
    </label>
  );
}

type TaxonomyItem = { id: string; name: string };
export type Taxonomy = {
  species: TaxonomyItem[];
  breeds: TaxonomyItem[];
  varieties: TaxonomyItem[];
};

export type PurchaseFormValues = {
  speciesId: string;
  breedId: string;
  varietyId: string;
  title: string;
  ageInMonths: number;
  initialQuantity: number;
  purchaseDate: string;
  purchaseCost: string;
  vendorName: string;
  priceOverride: string;
  description: string;
};

const empty: PurchaseFormValues = {
  speciesId: "",
  breedId: "",
  varietyId: "",
  title: "",
  ageInMonths: 1,
  initialQuantity: 1,
  purchaseDate: "",
  purchaseCost: "",
  vendorName: "",
  priceOverride: "",
  description: ""
};

function todayInput() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PurchaseModal({
  open,
  onClose,
  onSubmit,
  error
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: PurchaseFormValues) => Promise<void>;
  error: string | null;
}) {
  const [values, setValues] = useState<PurchaseFormValues>({ ...empty, purchaseDate: todayInput() });
  const [taxonomy, setTaxonomy] = useState<Taxonomy>({ species: [], breeds: [], varieties: [] });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues({ ...empty, purchaseDate: todayInput() });
    setSubmitting(false);
    void (async () => {
      const res = await fetch("/api/plantel/groups", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { taxonomy: Taxonomy };
      setTaxonomy(data.taxonomy);
    })();
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppModal
      open={open}
      title="Comprar aves para revenda"
      onClose={onClose}
      error={error}
    >
      <form onSubmit={handleSubmit} className="grid gap-3">
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          Use para registrar aves compradas para recria/revenda. Elas <strong>não entram no plantel</strong> e
          aparecem só na vitrine. A compra vira automaticamente uma saída financeira.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Espécie">
            <select
              required
              className={inputClass}
              value={values.speciesId}
              onChange={(e) => setValues({ ...values, speciesId: e.target.value })}
            >
              <option value="">Selecione</option>
              {taxonomy.species.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Raça">
            <select
              required
              className={inputClass}
              value={values.breedId}
              onChange={(e) => setValues({ ...values, breedId: e.target.value })}
            >
              <option value="">Selecione</option>
              {taxonomy.breeds.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Variedade (opcional)">
            <select
              className={inputClass}
              value={values.varietyId}
              onChange={(e) => setValues({ ...values, varietyId: e.target.value })}
            >
              <option value="">—</option>
              {taxonomy.varieties.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Idade ao comprar (meses)">
            <Input
              type="number"
              required
              min={0}
              max={999}
              value={values.ageInMonths}
              onChange={(e) => setValues({ ...values, ageInMonths: Number(e.target.value) })}
            />
          </Field>

          <Field label="Quantidade comprada">
            <Input
              type="number"
              required
              min={1}
              value={values.initialQuantity}
              onChange={(e) => setValues({ ...values, initialQuantity: Number(e.target.value) })}
            />
          </Field>

          <Field label="Data da compra">
            <Input
              type="date"
              required
              value={values.purchaseDate}
              onChange={(e) => setValues({ ...values, purchaseDate: e.target.value })}
            />
          </Field>

          <Field label="Custo total (R$)" hint="Vai virar uma saída financeira automática.">
            <Input
              type="number"
              step="0.01"
              required
              min={0}
              value={values.purchaseCost}
              onChange={(e) => setValues({ ...values, purchaseCost: e.target.value })}
            />
          </Field>

          <Field label="Vendedor (opcional)">
            <Input
              type="text"
              placeholder="Nome ou criatório"
              value={values.vendorName}
              onChange={(e) => setValues({ ...values, vendorName: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Título do anúncio (opcional)">
          <Input
            type="text"
            placeholder="Ex: Lote Sedosa Branca 2 meses"
            value={values.title}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
          />
        </Field>

        <Field label="Preço de venda unitário (opcional)" hint="Se vazio, usa a tabela de preços por idade da raça.">
          <Input
            type="number"
            step="0.01"
            min={0}
            value={values.priceOverride}
            onChange={(e) => setValues({ ...values, priceOverride: e.target.value })}
          />
        </Field>

        <Field label="Observações (opcional)">
          <textarea
            className={textareaClass}
            value={values.description}
            onChange={(e) => setValues({ ...values, description: e.target.value })}
            placeholder="Anotações sobre o lote, vacinação, sexagem etc."
          />
        </Field>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Registrando..." : "Registrar compra"}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
