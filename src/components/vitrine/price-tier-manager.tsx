"use client";

import { useEffect, useMemo, useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteActionButton } from "@/components/ui/delete-action-button";

const inputClass =
  "h-10 w-full rounded-xl border border-[color:var(--line)] bg-white/90 px-3 text-[13px] text-slate-800 outline-none focus:ring-4 focus:ring-[color:var(--brand)]/20 sm:h-11 sm:rounded-2xl sm:px-4 sm:text-sm";

type FlockGroupOption = {
  id: string;
  title: string;
  species: { id: string; name: string };
  breed: { id: string; name: string } | null;
  variety: { id: string; name: string } | null;
};

type Tier = {
  id: string;
  flockGroupId: string;
  ageInMonths: number;
  price: string | number;
  flockGroup: {
    id: string;
    title: string;
    species: { name: string };
    breed: { name: string } | null;
    variety: { name: string } | null;
  };
};

type PriceTiersResponse = {
  tiers: Tier[];
  flockGroups: FlockGroupOption[];
};

type Row = {
  ageInMonths: number;
  price: number;
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
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [rows, setRows] = useState<Row[]>([{ ageInMonths: 0, price: 0 }]);
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

  // When user picks a group, prefill rows with the existing tiers for that group
  useEffect(() => {
    if (!data || !selectedGroupId) {
      setRows([{ ageInMonths: 0, price: 0 }]);
      return;
    }
    const existing = data.tiers
      .filter((tier) => tier.flockGroupId === selectedGroupId)
      .sort((a, b) => a.ageInMonths - b.ageInMonths);

    if (existing.length === 0) {
      setRows([{ ageInMonths: 0, price: 0 }]);
    } else {
      setRows(
        existing.map((tier) => ({ ageInMonths: tier.ageInMonths, price: Number(tier.price) }))
      );
    }
  }, [selectedGroupId, data]);

  function addRow() {
    setRows((current) => {
      const lastAge = current.length > 0 ? current[current.length - 1].ageInMonths : -1;
      return [...current, { ageInMonths: lastAge + 1, price: 0 }];
    });
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((current) => current.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, idx) => idx !== index));
  }

  async function handleSave() {
    if (!selectedGroupId) {
      setError("Selecione um card.");
      return;
    }
    if (rows.length === 0) {
      setError("Adicione pelo menos uma linha de preço.");
      return;
    }

    const ages = rows.map((row) => row.ageInMonths);
    const duplicate = ages.find((age, idx) => ages.indexOf(age) !== idx);
    if (duplicate !== undefined) {
      setError(`Idade ${duplicate} duplicada — use apenas uma linha por idade.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/price-tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flockGroupId: selectedGroupId,
          tiers: rows
        })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Erro ao salvar tabela.");
      }
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar tabela.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteTier(id: string) {
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
      const taxonomy = [
        tier.flockGroup.species.name,
        tier.flockGroup.breed?.name,
        tier.flockGroup.variety?.name
      ]
        .filter(Boolean)
        .join(" / ");
      const label = taxonomy
        ? `${tier.flockGroup.title} (${taxonomy})`
        : tier.flockGroup.title;
      const key = tier.flockGroupId;
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
        Selecione um card do Plantel e cadastre o preço por idade. O sistema usa o preço da maior
        idade já atingida pelo filhote.
      </p>

      <div className="mb-4 grid gap-3 rounded-2xl bg-[color:var(--surface-soft)] p-3 sm:p-4">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold text-slate-800">Card do Plantel</span>
          <select
            className={inputClass}
            value={selectedGroupId}
            onChange={(event) => setSelectedGroupId(event.target.value)}
          >
            <option value="">Selecione</option>
            {data?.flockGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.title}
              </option>
            ))}
          </select>
        </label>

        {selectedGroupId ? (
          <>
            <div className="grid gap-2">
              <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                <span>Idade (meses)</span>
                <span>Preço (R$)</span>
                <span></span>
              </div>
              {rows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={999}
                    value={row.ageInMonths}
                    onChange={(event) =>
                      updateRow(idx, { ageInMonths: Number(event.target.value || 0) })
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.price}
                    onChange={(event) => updateRow(idx, { price: Number(event.target.value || 0) })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeRow(idx)}
                    disabled={rows.length === 1}
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="outline" onClick={addRow}>
                + Adicionar idade
              </Button>
              <Button type="button" onClick={handleSave} disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar tabela"}
              </Button>
            </div>
          </>
        ) : null}
      </div>

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
                  <DeleteActionButton iconOnly onClick={() => handleDeleteTier(tier.id)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </AppModal>
  );
}
