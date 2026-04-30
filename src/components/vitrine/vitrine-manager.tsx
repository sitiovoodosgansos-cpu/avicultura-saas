"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/layout/page-title";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FlockGroupCard } from "@/components/vitrine/flock-group-card";
import {
  ListingFormModal,
  type ListingFormValues
} from "@/components/vitrine/listing-form-modal";
import { PriceTierManager } from "@/components/vitrine/price-tier-manager";
import {
  formatBRL,
  type FlockGroupRef,
  type VitrineListingItem
} from "@/components/vitrine/types";

type VitrineResponse = {
  listings: VitrineListingItem[];
  flockGroups: FlockGroupRef[];
};

export function VitrineManager() {
  const [data, setData] = useState<VitrineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VitrineListingItem | null>(null);
  const [pricesOpen, setPricesOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/vitrine");
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Erro ao carregar vitrine.");
      }
      const json = (await response.json()) as VitrineResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(listing: VitrineListingItem) {
    setEditing(listing);
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSubmit(values: ListingFormValues, id?: string) {
    setFormError(null);
    try {
      const url = id ? `/api/vitrine/${id}` : "/api/vitrine";
      const method = id ? "PATCH" : "POST";

      const overrideValue = values.priceOverride.trim();
      const priceOverride =
        overrideValue === "" ? null : Number(overrideValue);

      const payload = id
        ? {
            title: values.title || null,
            ageInMonths: values.ageInMonths,
            availableQuantity: values.availableQuantity,
            priceOverride,
            description: values.description || null,
            status: values.status
          }
        : {
            flockGroupId: values.flockGroupId,
            title: values.title || null,
            ageInMonths: values.ageInMonths,
            initialQuantity: values.initialQuantity,
            priceOverride,
            description: values.description || null
          };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Erro ao salvar anúncio.");
      }

      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar anúncio.");
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remover este anúncio da vitrine?")) return;
    try {
      const response = await fetch(`/api/vitrine/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Erro ao remover anúncio.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover anúncio.");
    }
  }

  const summary = useMemo(() => {
    const listings = data?.listings ?? [];
    const available = listings.filter((listing) => listing.status === "AVAILABLE");
    const totalAnimals = available.reduce((acc, listing) => acc + listing.availableQuantity, 0);
    const totalValue = available.reduce((acc, listing) => {
      if (listing.currentPrice === null) return acc;
      return acc + listing.currentPrice * listing.availableQuantity;
    }, 0);
    const missingTiers = available.filter((listing) => listing.missingTier).length;
    return { totalAnimals, totalValue, missingTiers };
  }, [data]);

  const grouped = useMemo(() => {
    if (!data) return [] as Array<{ group: FlockGroupRef; listings: VitrineListingItem[] }>;
    const map = new Map<string, { group: FlockGroupRef; listings: VitrineListingItem[] }>();
    for (const listing of data.listings) {
      const existing = map.get(listing.flockGroupId);
      if (existing) {
        existing.listings.push(listing);
      } else {
        map.set(listing.flockGroupId, {
          group: listing.flockGroup,
          listings: [listing]
        });
      }
    }
    return [...map.values()].sort((a, b) => a.group.title.localeCompare(b.group.title));
  }, [data]);

  return (
    <div className="grid gap-4">
      <PageTitle
        title="Vitrine"
        description="Catálogo dos animais disponíveis para venda. O preço atualiza automaticamente conforme o filhote envelhece, com base na tabela de preços por idade."
        icon="🛍️"
      />

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-1 sm:gap-4">
          <div className="rounded-xl bg-[color:var(--surface-soft)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Disponíveis
            </p>
            <p className="text-2xl font-semibold leading-none text-slate-900">
              {summary.totalAnimals}
            </p>
          </div>
          <div className="rounded-xl bg-[color:var(--surface-soft)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Valor estoque
            </p>
            <p className="text-lg font-semibold leading-none text-slate-900 sm:text-2xl">
              {formatBRL(summary.totalValue)}
            </p>
          </div>
          <div className="rounded-xl bg-[color:var(--surface-soft)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Sem preço
            </p>
            <p className="text-2xl font-semibold leading-none text-slate-900">
              {summary.missingTiers}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setPricesOpen(true)}>
            Tabela de preços
          </Button>
          <Button
            type="button"
            onClick={openCreate}
            disabled={!data || data.flockGroups.length === 0}
          >
            Adicionar
          </Button>
        </div>
      </Card>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
          <p className="text-sm font-medium text-rose-700">{error}</p>
        </div>
      ) : null}

      {summary.missingTiers > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Existem {summary.missingTiers} anúncio(s) sem preço cadastrado para a idade atual. Abra
          a <button onClick={() => setPricesOpen(true)} className="font-semibold underline">tabela de preços</button> para preencher.
        </div>
      ) : null}

      {!loading && data && data.flockGroups.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">
            Nenhum card cadastrado no Plantel. Cadastre um grupo no Plantel primeiro para começar a
            usar a Vitrine.
          </p>
        </Card>
      ) : null}

      {loading ? <p className="text-sm text-slate-500">Carregando vitrine...</p> : null}

      {!loading && data && data.listings.length === 0 && data.flockGroups.length > 0 ? (
        <Card>
          <p className="text-sm text-slate-600">
            Nenhum anúncio na vitrine ainda. Clique em <strong>Adicionar</strong> para criar o primeiro
            ou cadastre a tabela de preços para que filhotes nascidos nas chocadeiras apareçam
            automaticamente (em breve).
          </p>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {grouped.map(({ group, listings }) => (
          <FlockGroupCard
            key={group.id}
            group={group}
            listings={listings}
            onEdit={openEdit}
            onRemove={handleRemove}
          />
        ))}
      </div>

      <ListingFormModal
        open={formOpen}
        editing={editing}
        flockGroups={data?.flockGroups ?? []}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        error={formError}
      />

      <PriceTierManager
        open={pricesOpen}
        onClose={() => setPricesOpen(false)}
        onChanged={() => void load()}
      />
    </div>
  );
}
