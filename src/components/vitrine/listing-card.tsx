"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteActionButton } from "@/components/ui/delete-action-button";

export type FlockGroupRef = {
  id: string;
  title: string;
  species: { id: string; name: string };
  breed: { id: string; name: string } | null;
  variety: { id: string; name: string } | null;
};

export type VitrineListingItem = {
  id: string;
  flockGroupId: string;
  title: string | null;
  birthDate: string;
  initialQuantity: number;
  availableQuantity: number;
  priceOverride: number | null;
  description: string | null;
  status: "AVAILABLE" | "SOLD_OUT" | "REMOVED";
  flockGroup: FlockGroupRef;
  currentPrice: number | null;
  ageInMonths: number;
  missingTier: boolean;
  isOverride: boolean;
};

function formatBRL(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatAge(months: number) {
  if (months <= 0) return "Recém-nascido";
  if (months === 1) return "1 mês";
  if (months < 12) return `${months} meses`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (rest === 0) return years === 1 ? "1 ano" : `${years} anos`;
  return `${years}a ${rest}m`;
}

export function ListingCard({
  listing,
  onEdit,
  onRemove
}: {
  listing: VitrineListingItem;
  onEdit: (listing: VitrineListingItem) => void;
  onRemove: (id: string) => void;
}) {
  const taxonomy = [
    listing.flockGroup.species.name,
    listing.flockGroup.breed?.name,
    listing.flockGroup.variety?.name
  ]
    .filter(Boolean)
    .join(" · ");
  const headline = listing.title?.trim() || listing.flockGroup.title;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--brand-strong)]">
            {listing.flockGroup.title}
          </p>
          <h3 className="mt-1 text-base font-semibold leading-tight text-slate-900 sm:text-lg">
            {headline}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {taxonomy ? `${taxonomy} · ` : ""}{formatAge(listing.ageInMonths)}
          </p>
        </div>
        <span
          className={
            "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] " +
            (listing.status === "AVAILABLE"
              ? "bg-emerald-100 text-emerald-700"
              : listing.status === "SOLD_OUT"
              ? "bg-slate-200 text-slate-600"
              : "bg-rose-100 text-rose-700")
          }
        >
          {listing.status === "AVAILABLE"
            ? "Disponível"
            : listing.status === "SOLD_OUT"
            ? "Esgotado"
            : "Removido"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[color:var(--surface-soft)] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Disponíveis
          </p>
          <p className="mt-0.5 text-2xl font-semibold leading-none text-slate-900">
            {listing.availableQuantity}
            <span className="ml-1 text-xs text-slate-500">/ {listing.initialQuantity}</span>
          </p>
        </div>
        <div className="rounded-xl bg-[color:var(--surface-soft)] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Preço atual
          </p>
          <p className="mt-0.5 text-2xl font-semibold leading-none text-slate-900">
            {formatBRL(listing.currentPrice)}
          </p>
          {listing.isOverride ? (
            <p className="mt-0.5 text-[10px] font-medium text-sky-700">Preço próprio do anúncio</p>
          ) : null}
          {listing.missingTier ? (
            <p className="mt-0.5 text-[10px] font-medium text-amber-600">
              Cadastre o preço para esta idade
            </p>
          ) : null}
        </div>
      </div>

      {listing.description ? (
        <p className="text-sm text-slate-600">{listing.description}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => onEdit(listing)}>
          Editar
        </Button>
        <DeleteActionButton onClick={() => onRemove(listing.id)} />
      </div>
    </Card>
  );
}
