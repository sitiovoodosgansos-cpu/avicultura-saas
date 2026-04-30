"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/layout/page-title";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListingCard, type VitrineListingItem } from "@/components/vitrine/listing-card";
import {
  ListingFormModal,
  type ListingFormValues
} from "@/components/vitrine/listing-form-modal";
import { PriceTierManager } from "@/components/vitrine/price-tier-manager";

type VitrineResponse = {
  listings: VitrineListingItem[];
  taxonomy: {
    species: Array<{ id: string; name: string }>;
    breeds: Array<{ id: string; name: string; speciesId: string }>;
    varieties: Array<{ id: string; name: string; breedId: string }>;
  };
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

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

      const payload = id
        ? {
            title: values.title || null,
            birthDate: values.birthDate,
            availableQuantity: values.availableQuantity,
            description: values.description || null,
            status: values.status
          }
        : {
            title: values.title || null,
            species: values.species,
            breed: values.breed || null,
            variety: values.variety || null,
            birthDate: values.birthDate,
            initialQuantity: values.initialQuantity,
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

  return (
    <div className="grid gap-4">
      <PageTitle
        title="Vitrine"
        description="Catálogo dos animais disponíveis para venda. Cadastre a tabela de preços por idade para acompanhar o valor automaticamente."
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
          <Button type="button" onClick={openCreate}>
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

      {loading ? <p className="text-sm text-slate-500">Carregando vitrine...</p> : null}

      {!loading && data && data.listings.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">
            Nenhum anúncio na vitrine ainda. Clique em <strong>Adicionar</strong> para criar o primeiro
            ou cadastre a tabela de preços para que filhotes nascidos nas chocadeiras apareçam
            automaticamente (em breve).
          </p>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data?.listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            onEdit={openEdit}
            onRemove={handleRemove}
          />
        ))}
      </div>

      <ListingFormModal
        open={formOpen}
        editing={editing}
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
