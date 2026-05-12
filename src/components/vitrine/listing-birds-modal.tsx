"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";

type ListingBird = {
  id: string;
  ringNumber: string;
  nickname: string | null;
  sex: "FEMALE" | "MALE" | "UNKNOWN";
  status: "ACTIVE" | "SICK" | "DEAD" | "BROODY" | "SOLD";
  flockGroupId: string;
};

const STATUS_META: Record<
  ListingBird["status"],
  { icon: string; label: string; bg: string; text: string }
> = {
  ACTIVE: { icon: "🟢", label: "Ativa", bg: "bg-emerald-100", text: "text-emerald-800" },
  SICK: { icon: "🤒", label: "Doente", bg: "bg-amber-100", text: "text-amber-800" },
  DEAD: { icon: "💀", label: "Morta", bg: "bg-slate-200", text: "text-slate-700" },
  BROODY: { icon: "🪺", label: "Chocando", bg: "bg-violet-100", text: "text-violet-800" },
  SOLD: { icon: "💰", label: "Vendida", bg: "bg-blue-100", text: "text-blue-800" }
};

const SEX_GLYPH: Record<ListingBird["sex"], string> = {
  FEMALE: "♀",
  MALE: "♂",
  UNKNOWN: "?"
};

export function ListingBirdsModal({
  open,
  listingId,
  listingTitle,
  onClose
}: {
  open: boolean;
  listingId: string | null;
  listingTitle: string | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [birds, setBirds] = useState<ListingBird[]>([]);

  useEffect(() => {
    if (!open || !listingId) return;
    setLoading(true);
    setError(null);
    setBirds([]);

    (async () => {
      try {
        const res = await fetch(`/api/vitrine/${listingId}/birds`, {
          cache: "no-store"
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Erro ao carregar aves.");
        }
        const data = (await res.json()) as { birds: ListingBird[] };
        setBirds(data.birds);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar aves.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, listingId]);

  return (
    <AppModal
      open={open}
      title={listingTitle ? `Aves — ${listingTitle}` : "Aves do lote"}
      onClose={onClose}
      error={error}
    >
      <div className="grid gap-3">
        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : birds.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Nenhuma ave vinculada a este lote.
            <br />
            <span className="text-xs">
              (Lotes criados antes do recurso de rastreamento podem não ter
              aves vinculadas — recrias ou listings antigos.)
            </span>
          </div>
        ) : (
          <>
            <p className="rounded-xl bg-blue-50 px-3 py-2 text-[11px] leading-relaxed text-blue-800">
              Clique em uma anilha pra abrir a ave no Plantel — lá você marca
              morte, doença, peso, vacina e tudo mais.
            </p>
            <ul className="grid gap-2">
              {birds.map((bird) => {
                const meta = STATUS_META[bird.status];
                return (
                  <li
                    key={bird.id}
                    className="flex items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-white/70 px-3 py-2 sm:px-4"
                  >
                    <Link
                      href={`/plantel?ring=${encodeURIComponent(bird.ringNumber)}`}
                      className="flex flex-1 items-center gap-3 hover:opacity-80"
                    >
                      <span className="font-mono text-sm font-semibold tracking-wide text-slate-900">
                        {bird.ringNumber}
                      </span>
                      <span
                        className="text-base text-slate-500"
                        aria-label={`Sexo ${bird.sex}`}
                      >
                        {SEX_GLYPH[bird.sex]}
                      </span>
                      {bird.nickname ? (
                        <span className="truncate text-sm text-slate-700">
                          {bird.nickname}
                        </span>
                      ) : null}
                    </Link>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.bg} ${meta.text}`}
                    >
                      <span aria-hidden>{meta.icon}</span>
                      {meta.label}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-center text-[11px] text-slate-500">
              Total: {birds.length} {birds.length === 1 ? "ave" : "aves"}
            </p>
          </>
        )}

        <div className="mt-1 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </AppModal>
  );
}
