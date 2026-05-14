"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/layout/page-title";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FlockGroupCard } from "@/components/vitrine/flock-group-card";
import {
  ListingFormModal,
  type ListingFormValues
} from "@/components/vitrine/listing-form-modal";
import { PriceTierManager } from "@/components/vitrine/price-tier-manager";
import {
  BulkSellModal,
  type BulkCartItem,
  type BulkSubmitPayload
} from "@/components/vitrine/bulk-sell-modal";
import { PurchaseModal, type PurchaseFormValues } from "@/components/vitrine/purchase-modal";
import { AvulsasModal, type AvulsasFormValues } from "@/components/vitrine/avulsas-modal";
import { ListingBirdsModal } from "@/components/vitrine/listing-birds-modal";
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
  // Carrinho persistente: cada clique no botao 🛒 toggle o listing.
  // Quando o usuario clica "Finalizar venda" abre o BulkSellModal.
  const [cart, setCart] = useState<Map<string, BulkCartItem>>(new Map());
  const [sellOpen, setSellOpen] = useState(false);
  const [sellError, setSellError] = useState<string | null>(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [avulsasOpen, setAvulsasOpen] = useState(false);
  const [avulsasError, setAvulsasError] = useState<string | null>(null);
  // Pode ser 1 listing (Ver aves de lote individual) ou multiplos
  // (Ver aves de grupo mesclado por idade+preco no FlockGroupCard).
  const [viewingBirdsListings, setViewingBirdsListings] = useState<VitrineListingItem[] | null>(null);

  // Filtros: busca livre + dropdown de grupo (mesmo padrao da Prateleira).
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("");

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

  async function handlePurchase(values: PurchaseFormValues) {
    setPurchaseError(null);
    try {
      const overrideValue = values.priceOverride.trim();
      const priceOverride = overrideValue === "" ? null : Number(overrideValue);

      const response = await fetch("/api/vitrine/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speciesId: values.speciesId,
          breedId: values.breedId,
          varietyId: values.varietyId || null,
          title: values.title || null,
          ageInMonths: values.ageInMonths,
          initialQuantity: values.initialQuantity,
          purchaseDate: values.purchaseDate,
          purchaseCost: Number(values.purchaseCost),
          vendorName: values.vendorName || null,
          priceOverride,
          description: values.description || null
        })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Erro ao registrar compra.");
      }
      setPurchaseOpen(false);
      await load();
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : "Erro ao registrar compra.");
      throw err;
    }
  }

  // Insercao em lote de aves "avulsas" — pre-existentes ao uso do sistema.
  // Cria N Birds + N VitrineListings num so request (vai aparecer no
  // Plantel E na Vitrine, com anilhas auto-geradas).
  async function handleAvulsasSubmit(values: AvulsasFormValues) {
    setAvulsasError(null);
    try {
      const response = await fetch("/api/vitrine/avulsas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flockGroupId: values.flockGroupId,
          ageInMonths: values.ageInMonths,
          females: values.females,
          males: values.males,
          unknownSex: values.unknownSex
        })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Erro ao inserir aves.");
      }
      const json = (await response.json()) as { missingTier?: boolean };
      setAvulsasOpen(false);
      await load();
      if (json.missingTier) {
        // Aviso amigavel: aves estao na vitrine mas sem preco — usuario
        // precisa configurar tier
        setError(
          "Aves inseridas, mas a raça ainda não tem tabela de preços. Configure a tabela pra elas aparecerem com valor."
        );
      }
    } catch (err) {
      setAvulsasError(err instanceof Error ? err.message : "Erro ao inserir aves.");
      throw err;
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

  // Toggle o listing no carrinho. Default: quantity=1, unitPrice = preço
  // sugerido da tabela (currentPrice) ou 0 se nao houver tier.
  function toggleCart(listing: VitrineListingItem) {
    setCart((prev) => {
      const next = new Map(prev);
      if (next.has(listing.id)) {
        next.delete(listing.id);
      } else {
        next.set(listing.id, {
          listing,
          quantity: 1,
          unitPrice: listing.currentPrice ?? 0
        });
      }
      return next;
    });
  }

  function clearCart() {
    setCart(new Map());
  }

  function openCart() {
    if (cart.size === 0) return;
    setSellError(null);
    setSellOpen(true);
  }

  function updateCartItem(
    listingId: string,
    patch: Partial<{ quantity: number; unitPrice: number }>
  ) {
    setCart((prev) => {
      const next = new Map(prev);
      const item = next.get(listingId);
      if (!item) return next;
      next.set(listingId, { ...item, ...patch });
      return next;
    });
  }

  async function submitBulkSale(values: BulkSubmitPayload) {
    setSellError(null);
    try {
      const response = await fetch("/api/vitrine/sell-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: values.paymentMethod,
          customer: values.customer || null,
          notes: values.notes || null,
          items: values.items
        })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Erro ao registrar venda.");
      }
      setSellOpen(false);
      clearCart();
      await load();
    } catch (err) {
      setSellError(err instanceof Error ? err.message : "Erro ao registrar venda.");
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

  // Set de ids no carrinho — pra destacar o botao 🛒 nos cards
  const cartIdSet = useMemo(() => new Set(cart.keys()), [cart]);
  // Lista do carrinho como array (ordenada por como foi adicionada)
  const cartList = useMemo(() => Array.from(cart.values()), [cart]);
  // Total parcial do carrinho pra mostrar na barra flutuante
  const cartTotal = useMemo(
    () =>
      cartList.reduce((sum, it) => sum + Number((it.quantity * it.unitPrice).toFixed(2)), 0),
    [cartList]
  );

  // Aplica busca + filtro de grupo nos cards visiveis. Mantem `summary` e
  // contadores no panorama (todos os anuncios) e so filtra a grade.
  const visibleGrouped = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return grouped.filter(({ group }) => {
      if (groupFilter && group.id !== groupFilter) return false;
      if (!q) return true;
      const haystack = [
        group.title,
        group.species?.name,
        group.breed?.name,
        group.variety?.name
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [grouped, searchQuery, groupFilter]);

  // Lista do dropdown: prefere grupos que ja tem anuncio (vem do `grouped`),
  // depois completa com o catalogo do plantel pra possibilitar pre-filtro.
  const dropdownGroups = useMemo(() => {
    const merged = new Map<string, string>();
    for (const g of grouped) merged.set(g.group.id, g.group.title);
    for (const g of data?.flockGroups ?? []) if (!merged.has(g.id)) merged.set(g.id, g.title);
    return Array.from(merged, ([id, title]) => ({ id, title })).sort((a, b) =>
      a.title.localeCompare(b.title, "pt-BR")
    );
  }, [grouped, data]);

  return (
    <div className="grid gap-4">
      <PageTitle
        title="Vitrine"
        description="Catálogo dos animais disponíveis para venda. O preço atualiza automaticamente conforme o filhote envelhece, com base na tabela de preços por idade."
        icon="🏪"
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
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setPricesOpen(true)}>
            Tabela de preços
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.open("/exportar-vitrine", "_blank")}
            title="Abrir lista de aves em pagina pronta para imprimir / salvar como PDF"
          >
            📄 Exportar PDF
          </Button>
          <Button
            type="button"
            onClick={() => { setAvulsasError(null); setAvulsasOpen(true); }}
            disabled={!data || data.flockGroups.length === 0}
          >
            🐔 Inserir aves
          </Button>
          <Button type="button" variant="outline" onClick={() => { setPurchaseError(null); setPurchaseOpen(true); }}>
            🛒 Comprar p/ revenda
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

      {!loading && data && grouped.length > 0 ? (
        <Card className="bg-white/90">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="🔎 Buscar por raça, espécie ou variedade..."
              />
            </div>
            <div className="md:w-72">
              <select
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value)}
                className="h-11 w-full rounded-2xl border border-[color:var(--line)] bg-white px-3 text-sm text-zinc-700 shadow-sm focus:border-[color:var(--brand)] focus:outline-none"
              >
                <option value="">Todos os grupos</option>
                {dropdownGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
            {searchQuery || groupFilter ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setGroupFilter("");
                }}
                className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Limpar
              </button>
            ) : null}
          </div>
          {searchQuery || groupFilter ? (
            <p className="mt-3 text-xs text-zinc-500">
              Mostrando <span className="font-semibold text-zinc-800">{visibleGrouped.length}</span> de{" "}
              {grouped.length} grupos.
            </p>
          ) : null}
        </Card>
      ) : null}

      {!loading && grouped.length > 0 && visibleGrouped.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">
            Nenhum grupo casa com esse filtro. Ajuste a busca ou escolha outro grupo no dropdown.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleGrouped.map(({ group, listings }) => (
          <FlockGroupCard
            key={group.id}
            group={group}
            listings={listings}
            onEdit={openEdit}
            onRemove={handleRemove}
            onViewBirds={(grouped) => setViewingBirdsListings(grouped)}
          />
        ))}
      </div>

      <ListingFormModal
        open={formOpen}
        editing={
          editing
            ? data?.listings.find((listing) => listing.id === editing.id) ?? editing
            : null
        }
        flockGroups={data?.flockGroups ?? []}
        onPhotosChanged={() => void load()}
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

      <BulkSellModal
        open={sellOpen}
        cart={cartList}
        onClose={() => setSellOpen(false)}
        onChangeItem={updateCartItem}
        onRemoveItem={(id) => toggleCart(cart.get(id)!.listing)}
        onSubmit={submitBulkSale}
        error={sellError}
      />

      <PurchaseModal
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        onSubmit={handlePurchase}
        error={purchaseError}
      />

      <AvulsasModal
        open={avulsasOpen}
        onClose={() => setAvulsasOpen(false)}
        onSubmit={handleAvulsasSubmit}
        flockGroups={data?.flockGroups ?? []}
        error={avulsasError}
      />

      <ListingBirdsModal
        open={viewingBirdsListings !== null}
        listingIds={viewingBirdsListings?.map((l) => l.id) ?? null}
        listingTitle={(() => {
          if (!viewingBirdsListings || viewingBirdsListings.length === 0) return null;
          if (viewingBirdsListings.length === 1) {
            const l = viewingBirdsListings[0];
            return l.title?.trim() || l.flockGroup?.title || null;
          }
          // Grupo mesclado: usa nome da raca + composicao agregada
          const first = viewingBirdsListings[0];
          const totalAvailable = viewingBirdsListings.reduce(
            (acc, l) => acc + l.availableQuantity,
            0
          );
          const raca = first.flockGroup?.title ?? "Lote";
          const idade = `${first.ageInMonths} ${first.ageInMonths === 1 ? "mês" : "meses"}`;
          return `${raca} · ${totalAvailable} aves · ${idade}`;
        })()}
        onClose={() => setViewingBirdsListings(null)}
      />

      {/* Barra flutuante do carrinho da Vitrine — acumula listings em
          uma unica venda. Substitui o modal per-listing antigo. */}
      {cart.size > 0 ? (
        <div className="cart-floating-bar fixed inset-x-3 mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-xl" aria-hidden>🛒</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {cart.size} {cart.size === 1 ? "item" : "itens"} ·{" "}
                {cartList.reduce((s, it) => s + it.quantity, 0)} ave(s) ·{" "}
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                }).format(cartTotal)}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                Tudo será gerado como uma única venda
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={clearCart}>
            Limpar
          </Button>
          <Button type="button" onClick={openCart}>
            Finalizar venda
          </Button>
        </div>
      ) : null}
    </div>
  );
}
