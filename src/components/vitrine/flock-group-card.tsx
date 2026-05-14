"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronRight, Pencil, Users } from "lucide-react";
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

// Define se um listing é "Lote avulso" — sem ave-fonte 1:1 e sem
// incubator batch vinculado. Esses são os elegíveis pra mesclar
// visualmente quando compartilham (idade + preço + status).
function isAggregatedAvulso(listing: VitrineListingItem) {
  return listing.sourceBirdId === null && listing.sourceIncubatorBatchId === null;
}

/**
 * Gera o titulo do listing pra exibir.
 * - Para Lote avulso: regenera dinamicamente usando a idade ATUAL
 *   (recalculada toda vez que a pagina carrega via getCurrentPrice).
 *   O titulo salvo no banco congela a idade da insercao, o que
 *   confunde o usuario quando o tempo passa.
 * - Para 1:1 ou chocadas: usa o titulo salvo (carrega identidade
 *   especifica como nome ou numero da anilha).
 */
function displayTitle(listing: VitrineListingItem): string {
  if (isAggregatedAvulso(listing)) {
    return `Lote avulso · ${listing.availableQuantity} aves · ${formatAge(listing.ageInMonths)}`;
  }
  return listing.title?.trim() || `Lote ${listing.id.slice(-4).toUpperCase()}`;
}

type DisplayRow =
  | { kind: "single"; listing: VitrineListingItem }
  | { kind: "merged"; key: string; listings: VitrineListingItem[] };

/**
 * Agrupa listings 'Lote avulso' com a mesma combinacao (idade + preco
 * + status) numa linha unica. Mantem 1:1 e chocadas como linhas
 * individuais (cada uma representa identidade especifica).
 */
function buildDisplayRows(listings: VitrineListingItem[]): DisplayRow[] {
  const merged = new Map<string, VitrineListingItem[]>();
  const order: string[] = []; // preserva ordem da 1a aparicao por bucket
  const singles: VitrineListingItem[] = [];

  for (const listing of listings) {
    if (!isAggregatedAvulso(listing)) {
      singles.push(listing);
      continue;
    }
    const key = `avulso|${listing.ageInMonths}|${listing.currentPrice ?? "x"}|${listing.status}`;
    const bucket = merged.get(key);
    if (bucket) {
      bucket.push(listing);
    } else {
      merged.set(key, [listing]);
      order.push(key);
    }
  }

  const rows: DisplayRow[] = singles.map((listing) => ({ kind: "single" as const, listing }));
  for (const key of order) {
    const bucket = merged.get(key)!;
    if (bucket.length === 1) {
      rows.push({ kind: "single", listing: bucket[0] });
    } else {
      rows.push({ kind: "merged", key, listings: bucket });
    }
  }
  return rows;
}

export function FlockGroupCard({
  group,
  listings,
  onEdit,
  onRemove,
  onViewBirds
}: {
  group: FlockGroupRef;
  listings: VitrineListingItem[];
  onEdit: (listing: VitrineListingItem) => void;
  onRemove: (id: string) => void;
  onViewBirds: (listings: VitrineListingItem[]) => void;
}) {
  const available = listings.filter((listing) => listing.status === "AVAILABLE");
  const totalAvailable = available.reduce((acc, listing) => acc + listing.availableQuantity, 0);
  const totalValue = available.reduce((acc, listing) => {
    if (listing.currentPrice === null) return acc;
    return acc + listing.currentPrice * listing.availableQuantity;
  }, 0);

  // Pre-computa as linhas (mesclando avulsos de mesma idade+preco+status)
  const displayRows = useMemo(() => buildDisplayRows(listings), [listings]);

  // Estado de expansao por chave de grupo mesclado (default: colapsado)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold leading-tight text-slate-900 sm:text-lg">
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
        {displayRows.map((row) => {
          if (row.kind === "single") {
            return <SingleListingRow key={row.listing.id} listing={row.listing} onEdit={onEdit} onRemove={onRemove} onViewBirds={onViewBirds} />;
          }

          // Linha mesclada: soma quantidades e oferece expansao pra
          // ver/editar lotes individuais (mantem rastreabilidade de
          // cada inserção quando o user precisar).
          const isExpanded = expandedKeys.has(row.key);
          const first = row.listings[0];
          const totalAvailableMerged = row.listings.reduce((a, l) => a + l.availableQuantity, 0);
          const totalInitialMerged = row.listings.reduce((a, l) => a + l.initialQuantity, 0);
          const firstPhoto = row.listings.find((l) => l.photos.length > 0)?.photos[0] ?? null;

          return (
            <li
              key={row.key}
              className="rounded-2xl border border-[color:var(--line)] bg-white/70 p-2.5 sm:p-3"
            >
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  {firstPhoto ? (
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-14 sm:w-14">
                      <Image
                        src={firstPhoto.url}
                        alt="Foto do lote"
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        Lote · {totalAvailableMerged} aves · {formatAge(first.ageInMonths)}
                      </p>
                      <span
                        className={
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] " +
                          statusClass(first.status)
                        }
                      >
                        {statusLabel(first.status)}
                      </span>
                      <span className="shrink-0 rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-sky-700">
                        {row.listings.length} inserções
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {formatAge(first.ageInMonths)} · agrupado por mesma idade e preço
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-1.5">
                <div className="flex min-w-0 items-center gap-1.5 text-xs">
                  <span className="rounded-lg bg-[color:var(--surface-soft)] px-2 py-1">
                    <strong className="text-slate-900">{totalAvailableMerged}</strong>
                    <span className="text-slate-500">/{totalInitialMerged}</span>
                  </span>
                  <span className="rounded-lg bg-[color:var(--surface-soft)] px-2 py-1 font-semibold text-slate-900">
                    {formatBRL(first.currentPrice)}
                  </span>
                  {!first.isOverride && !first.missingTier && first.currentPrice !== null ? (
                    <span
                      className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.05em] text-emerald-700"
                      title="O preço acompanha a tabela conforme a idade aumenta"
                    >
                      auto
                    </span>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => onViewBirds(row.listings)}
                    aria-label="Ver aves do grupo"
                    title="Ver aves do grupo"
                    className="h-8 w-8 sm:h-9 sm:w-9"
                  >
                    <Users className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => toggleExpand(row.key)}
                    aria-label={isExpanded ? "Recolher inserções" : "Expandir inserções"}
                    title={isExpanded ? "Recolher inserções" : "Expandir inserções"}
                    className="h-8 w-8 sm:h-9 sm:w-9"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    ) : (
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                </div>
              </div>

              {/* Sub-rows expandidas: cada inserção individual com editar/excluir */}
              {isExpanded ? (
                <ul className="mt-2 grid gap-2 border-t border-[color:var(--line)] pt-2">
                  {row.listings.map((listing) => (
                    <SingleListingRow
                      key={listing.id}
                      listing={listing}
                      onEdit={onEdit}
                      onRemove={onRemove}
                      onViewBirds={onViewBirds}
                      compact
                    />
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/**
 * Linha individual de listing — usada tanto no nivel raiz (quando o
 * listing eh unico ou 1:1) quanto dentro de um grupo mesclado expandido
 * (modo compact). Mantem todas as acoes (ver aves, editar, excluir).
 */
function SingleListingRow({
  listing,
  onEdit,
  onRemove,
  onViewBirds,
  compact = false
}: {
  listing: VitrineListingItem;
  onEdit: (listing: VitrineListingItem) => void;
  onRemove: (id: string) => void;
  onViewBirds: (listings: VitrineListingItem[]) => void;
  compact?: boolean;
}) {
  return (
    <li
      className={
        compact
          ? "rounded-xl border border-[color:var(--line)]/60 bg-white/60 p-2"
          : "rounded-2xl border border-[color:var(--line)] bg-white/70 p-2.5 sm:p-3"
      }
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {listing.photos.length > 0 && !compact ? (
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
                {displayTitle(listing)}
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
            {listing.description && !compact ? (
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
            <span className="text-[9px] font-medium text-sky-700" title="Preço fixado manualmente nesse lote">
              próprio
            </span>
          ) : !listing.missingTier && listing.currentPrice !== null ? (
            <span
              className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.05em] text-emerald-700"
              title="O preço acompanha a tabela conforme a idade aumenta"
            >
              auto
            </span>
          ) : null}
          {listing.missingTier ? (
            <span className="text-[9px] font-medium text-amber-600">sem tabela</span>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => onViewBirds([listing])}
            aria-label="Ver aves do lote"
            title="Ver aves do lote"
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <Users className="h-4 w-4" aria-hidden />
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
  );
}
