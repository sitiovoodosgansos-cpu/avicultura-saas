"use client";

import Image from "next/image";
import { Pencil, ShoppingCart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteActionButton } from "@/components/ui/delete-action-button";
import {
  formatAge,
  formatBRL,
  type FlockGroupRef,
  type VitrineListingItem
} from "@/components/vitrine/types";

function statusLabel(status: VitrineListingItem["status"]) {
  if (status === "AVAILABLE") return "Disponível";
  if (status === "SOLD_OUT") return "Esgotado";
  return "Removido";
}

function statusClass(status: VitrineListingItem["status"]) {
  if (status === "AVAILABLE") return "bg-emerald-100 text-emerald-700";
  if (status === "SOLD_OUT") return "bg-slate-200 text-slate-600";
  return "bg-rose-100 text-rose-700";
}

export function FlockGroupCard({
  group,
  listings,
  onEdit,
  onSell,
  onDeath,
  onRemove
}: {
  group: FlockGroupRef;
  listings: VitrineListingItem[];
  onEdit: (listing: VitrineListingItem) => void;
  onSell: (listing: VitrineListingItem) => void;
  onDeath: (listing: VitrineListingItem) => void;
  onRemove: (id: string) => void;
}) {
  const taxonomy = [group.species.name, group.breed?.name, group.variety?.name]
    .filter(Boolean)
    .join(" · ");

  const available = listings.filter((listing) => listing.status === "AVAILABLE");
  const totalAvailable = available.reduce((acc, listing) => acc + listing.availableQuantity, 0);
  const totalValue = available.reduce((acc, listing) => {
    if (listing.currentPrice === null) return acc;
    return acc + listing.currentPrice * listing.availableQuantity;
  }, 0);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--brand-strong)] sm:text-xs">
            {taxonomy || "Sem taxonomia"}
          </p>
          <h3 className="mt-0.5 truncate text-base font-semibold leading-tight text-slate-900 sm:text-lg">
            {group.title}
          </h3>
        </div>
        <div className="flex shrink-0 gap-1.5 text-right">
          <div className="rounded-lg bg-[color:var(--surface-soft)] px-2 py-1">
            <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              Disp.
            </p>
            <p className="text-sm font-semibold leading-none text-slate-900 sm:text-base">
              {totalAvailable}
            </p>
          </div>
          <div className="rounded-lg bg-[color:var(--surface-soft)] px-2 py-1">
            <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              Valor
            </p>
            <p className="text-sm font-semibold leading-none text-slate-900 sm:text-base">
              {formatBRL(totalValue)}
            </p>
          </div>
        </div>
      </div>

      <ul className="grid gap-2">
        {listings.map((listing) => (
          <li
            key={listing.id}
            className="rounded-2xl border border-[color:var(--line)] bg-white/70 p-2.5 sm:p-3"
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-start gap-2">
                {listing.photos.length > 0 ? (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-14 sm:w-14">
                    <Image
                      src={listing.photos[0].url}
                      alt={listing.title ?? "Foto do lote"}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {listing.title?.trim() || `Lote ${listing.id.slice(-4).toUpperCase()}`}
                    </p>
                    <span
                      className={
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] " +
                        statusClass(listing.status)
                      }
                    >
                      {statusLabel(listing.status)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {formatAge(listing.ageInMonths)}
                  </p>
                  {listing.purchaseDate ? (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                      🛒 Recria comprada
                      {listing.vendorName ? ` · ${listing.vendorName}` : ""}
                    </p>
                  ) : null}
                  {listing.lastVaccination ? (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                      💉 {listing.lastVaccination.vaccineName} ·{" "}
                      {new Date(listing.lastVaccination.appliedAt).toLocaleDateString("pt-BR")}
                    </p>
                  ) : null}
                  {listing.description ? (
                    <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">
                      {listing.description}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5 text-xs">
                <span className="rounded-lg bg-[color:var(--surface-soft)] px-2 py-1">
                  <strong className="text-slate-900">{listing.availableQuantity}</strong>
                  <span className="text-slate-500">/{listing.initialQuantity}</span>
                </span>
                <span className="rounded-lg bg-[color:var(--surface-soft)] px-2 py-1 font-semibold text-slate-900">
                  {formatBRL(listing.currentPrice)}
                </span>
                {listing.isOverride ? (
                  <span className="text-[9px] font-medium text-sky-700">próprio</span>
                ) : null}
                {listing.missingTier ? (
                  <span className="text-[9px] font-medium text-amber-600">sem tabela</span>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  type="button"
                  size="icon"
                  onClick={() => onSell(listing)}
                  disabled={listing.status !== "AVAILABLE" || listing.availableQuantity === 0}
                  aria-label="Vender"
                  title="Vender"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                >
                  <ShoppingCart className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => onDeath(listing)}
                  disabled={listing.status !== "AVAILABLE" || listing.availableQuantity === 0}
                  aria-label="Registrar óbito"
                  title="Registrar óbito"
                  className="h-8 w-8 border-rose-200 bg-white text-rose-600 hover:border-rose-300 hover:bg-rose-50 sm:h-9 sm:w-9"
                >
                  <span className="text-base leading-none" aria-hidden>💀</span>
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => onEdit(listing)}
                  aria-label="Editar"
                  title="Editar"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
                <DeleteActionButton
                  iconOnly
                  onClick={() => onRemove(listing.id)}
                  className="h-8 w-8 sm:h-9 sm:w-9"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
