"use client";

import { useEffect, useMemo, useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteActionButton } from "@/components/ui/delete-action-button";

const inputClass =
  "h-10 w-full rounded-xl border border-[color:var(--line)] bg-white/90 px-3 text-[13px] text-slate-800 outline-none focus:ring-4 focus:ring-[color:var(--brand)]/20 sm:h-11 sm:rounded-2xl sm:px-4 sm:text-sm";

type Species = { id: string; name: string };
type Breed = { id: string; name: string; speciesId: string };
type Variety = { id: string; name: string; breedId: string };

type Tier = {
  id: string;
  speciesId: string;
  breedId: string | null;
  varietyId: string | null;
  ageInMonths: number;
  price: string | number;
  species: { id: string; name: string };
  breed: { id: string; name: string } | null;
  variety: { id: string; name: string } | null;
};

type PriceTiersResponse = {
  tiers: Tier[];
  taxonomy: { species: Species[]; breeds: Breed[]; varieties: Variety[] };
};

type FormState = {
  speciesId: string;
  breedId: string;
  varietyId: string;
  ageInMonths: number;
  price: number;
};

const emptyForm: FormState = {
  speciesId: "",
  breedId: "",
  varietyId: "",
  ageInMonths: 0,
  price: 0
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatAge(months: number) {
  if (months <= 0) return "Recém-nascido (0m)";
  if (months === 1) return "1 mês";
  if (months < 12) return `${months} meses`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (rest === 0) return years === 1 ? "1 ano" : `${years} anos`;
  return `${years}a ${rest}m`;
}

export function PriceTierManager({
  open,
  onClose,
  onChanged
}: {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<PriceTiersResponse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/price-tiers");
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Erro ao carregar tabela de preços.");
      }
      const json = (await response.json()) as PriceTiersResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  const breedsForSpecies = useMemo(() => {
    if (!data || !form.speciesId) return [] as Breed[];
    return data.taxonomy.breeds.filter((breed) => breed.speciesId === form.speciesId);
  }, [data, form.speciesId]);

  const varietiesForBreed = useMemo(() => {
    if (!data || !form.breedId) return [] as Variety[];
    return data.taxonomy.varieties.filter((variety) => variety.breedId === form.breedId);
  }, [data, form.breedId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/price-tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speciesId: form.speciesId,
          breedId: form.breedId || null,
          varietyId: form.varietyId || null,
          ageInMonths: form.ageInMonths,
          price: form.price
        })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Erro ao salvar preço.");
      }
      setForm({ ...emptyForm, speciesId: form.speciesId, breedId: form.breedId, varietyId: form.varietyId });
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar preço.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const response = await fetch(`/api/price-tiers/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Erro ao remover preço.");
      }
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover preço.");
    }
  }

  const grouped = useMemo(() => {
    if (!data) return [] as Array<{ key: string; label: string; tiers: Tier[] }>;
    const map = new Map<string, { key: string; label: string; tiers: Tier[] }>();
    for (const tier of data.tiers) {
      const key = `${tier.speciesId}|${tier.breedId ?? ""}|${tier.varietyId ?? ""}`;
      const label = [tier.species.name, tier.breed?.name, tier.variety?.name]
        .filter(Boolean)
        .join(" / ");
      if (!map.has(key)) map.set(key, { key, label, tiers: [] });
      map.get(key)!.tiers.push(tier);
    }
    for (const entry of map.values()) {
      entry.tiers.sort((a, b) => a.ageInMonths - b.ageInMonths);
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);

  return (
    <AppModal open={open} title="Tabela de preços por idade" onClose={onClose} error={error}>
      <p className="mb-3 text-sm text-slate-600">
        Cadastre o preço dos animais por idade em meses. O sistema usa o preço da maior idade já
        atingida pelo filhote.
      </p>

      <form onSubmit={handleSubmit} className="mb-4 grid gap-3 rounded-2xl bg-[color:var(--surface-soft)] p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">Espécie</span>
            <select
              className={inputClass}
              required
              value={form.speciesId}
              onChange={(event) =>
                setForm({ ...form, speciesId: event.target.value, breedId: "", varietyId: "" })
              }
            >
              <option value="">Selecione</option>
              {data?.taxonomy.species.map((species) => (
                <option key={species.id} value={species.id}>
                  {species.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">Raça (opcional)</span>
            <select
              className={inputClass}
              value={form.breedId}
              onChange={(event) => setForm({ ...form, breedId: event.target.value, varietyId: "" })}
              disabled={!form.speciesId}
            >
              <option value="">Todas</option>
              {breedsForSpecies.map((breed) => (
                <option key={breed.id} value={breed.id}>
                  {breed.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">Variedade (opcional)</span>
            <select
              className={inputClass}
              value={form.varietyId}
              onChange={(event) => setForm({ ...form, varietyId: event.target.value })}
              disabled={!form.breedId}
            >
              <option value="">Todas</option>
              {varietiesForBreed.map((variety) => (
                <option key={variety.id} value={variety.id}>
                  {variety.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">Idade (meses)</span>
            <Input
              type="number"
              min={0}
              max={999}
              required
              value={form.ageInMonths}
              onChange={(event) =>
                setForm({ ...form, ageInMonths: Number(event.target.value || 0) })
              }
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">Preço (R$)</span>
            <Input
              type="number"
              min={0}
              step="0.01"
              required
              value={form.price}
              onChange={(event) => setForm({ ...form, price: Number(event.target.value || 0) })}
            />
          </label>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar preço"}
          </Button>
        </div>
      </form>

      {loading ? <p className="text-sm text-slate-500">Carregando...</p> : null}

      {!loading && grouped.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum preço cadastrado ainda.</p>
      ) : null}

      <div className="grid gap-3">
        {grouped.map((group) => (
          <div key={group.key} className="rounded-2xl border border-[color:var(--line)] bg-white p-3">
            <p className="mb-2 text-sm font-semibold text-slate-800">{group.label}</p>
            <ul className="grid gap-1.5">
              {group.tiers.map((tier) => (
                <li
                  key={tier.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-[color:var(--surface-soft)] px-3 py-2 text-sm"
                >
                  <span className="text-slate-700">
                    {formatAge(tier.ageInMonths)}: <strong>{formatBRL(Number(tier.price))}</strong>
                  </span>
                  <DeleteActionButton iconOnly onClick={() => handleDelete(tier.id)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </AppModal>
  );
}
