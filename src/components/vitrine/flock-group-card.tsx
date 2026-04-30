"use client";

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
  onRemove
}: {
  group: FlockGroupRef;
  listings: VitrineListingItem[];
  onEdit: (listing: VitrineListingItem) => void;
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--brand-strong)]">
            {taxonomy || "Sem taxonomia"}
          </p>
          <h3 className="mt-1 text-base font-semibold leading-tight text-slate-900 sm:text-lg">
            {group.title}
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right">
          <div className="rounded-xl bg-[color:var(--surface-soft)] px-2.5 py-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Disp.
            </p>
            <p className="text-base font-semibold leading-none text-slate-900 sm:text-lg">
              {totalAvailable}
            </p>
          </div>
          <div className="rounded-xl bg-[color:var(--surface-soft)] px-2.5 py-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Valor
            </p>
            <p className="text-base font-semibold leading-none text-slate-900 sm:text-lg">
              {formatBRL(totalValue)}
            </p>
          </div>
        </div>
      </div>

      <ul className="grid gap-2">
        {listings.map((listing) => (
          <li
            key={listing.id}
            className="rounded-2xl border border-[color:var(--line)] bg-white/70 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {listing.title?.trim() || `Lote ${listing.id.slice(-4).toUpperCase()}`}
                  </p>
                  <span
                    className={
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] " +
                      statusClass(listing.status)
                    }
                  >
                    {statusLabel(listing.status)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{formatAge(listing.ageInMonths)}</p>
                {listing.description ? (
                  <p className="mt-1 text-xs text-slate-600">{listing.description}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-xl bg-[color:var(--surface-soft)] px-2.5 py-1.5 text-xs">
                  <span className="font-semibold text-slate-900">
                    {listing.availableQuantity}
                  </span>
                  <span className="text-slate-500">/ {listing.initialQuantity}</span>
                </div>
                <div className="rounded-xl bg-[color:var(--surface-soft)] px-2.5 py-1.5 text-right">
                  <p className="text-sm font-semibold leading-none text-slate-900">
                    {formatBRL(listing.currentPrice)}
                  </p>
                  {listing.isOverride ? (
                    <p className="mt-0.5 text-[9px] font-medium text-sky-700">próprio</p>
                  ) : null}
                  {listing.missingTier ? (
                    <p className="mt-0.5 text-[9px] font-medium text-amber-600">sem tabela</p>
                  ) : null}
                </div>
                <Button type="button" variant="outline" onClick={() => onEdit(listing)}>
                  Editar
                </Button>
                <DeleteActionButton iconOnly onClick={() => onRemove(listing.id)} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
