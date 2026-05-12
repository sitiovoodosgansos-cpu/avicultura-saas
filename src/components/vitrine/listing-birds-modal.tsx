"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, Pencil } from "lucide-react";
import { BirdStatus } from "@prisma/client";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { DeleteActionButton } from "@/components/ui/delete-action-button";
import {
  STATUS_ICON_ORDER,
  statusBadge,
  statusEmoji,
  statusLabel,
  type BirdHistory
} from "@/components/plantel/_shared";

type ListingBird = {
  id: string;
  ringNumber: string;
  nickname: string | null;
  sex: "FEMALE" | "MALE" | "UNKNOWN";
  status: BirdStatus;
  flockGroupId: string;
};

const iconBtn =
  "inline-flex size-8 items-center justify-center rounded-lg border border-[color:var(--line)] bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 sm:size-9";

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
  const [historyByBird, setHistoryByBird] = useState<Record<string, BirdHistory[]>>({});
  const [pendingBirdId, setPendingBirdId] = useState<string | null>(null);

  async function loadBirds() {
    if (!listingId) return;
    const res = await fetch(`/api/vitrine/${listingId}/birds`, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Erro ao carregar aves.");
    }
    const data = (await res.json()) as { birds: ListingBird[] };
    setBirds(data.birds);
  }

  useEffect(() => {
    if (!open || !listingId) return;
    setLoading(true);
    setError(null);
    setBirds([]);
    setHistoryByBird({});

    (async () => {
      try {
        await loadBirds();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar aves.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, listingId]);

  async function applyBirdStatus(birdId: string, nextStatus: BirdStatus) {
    setPendingBirdId(birdId);
    setError(null);
    try {
      const reason = window.prompt("Motivo da alteração de status (opcional):") ?? "";
      const response = await fetch(`/api/plantel/birds/${birdId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, reason })
      });
      if (!response.ok) {
        setError("Não foi possível atualizar o status.");
        return;
      }
      // limpa o histórico em cache pra recarregar próximo toggle
      setHistoryByBird((prev) => {
        const clone = { ...prev };
        delete clone[birdId];
        return clone;
      });
      await loadBirds();
    } finally {
      setPendingBirdId(null);
    }
  }

  async function removeBird(birdId: string) {
    if (!window.confirm("Confirma a exclusão desta ave?")) return;
    setPendingBirdId(birdId);
    setError(null);
    try {
      const response = await fetch(`/api/plantel/birds/${birdId}`, { method: "DELETE" });
      if (!response.ok) {
        setError("Não foi possível excluir a ave.");
        return;
      }
      await loadBirds();
    } finally {
      setPendingBirdId(null);
    }
  }

  async function toggleHistory(birdId: string) {
    if (historyByBird[birdId]) {
      setHistoryByBird((prev) => {
        const clone = { ...prev };
        delete clone[birdId];
        return clone;
      });
      return;
    }
    const response = await fetch(`/api/plantel/birds/${birdId}/history`, { cache: "no-store" });
    if (!response.ok) {
      setError("Não foi possível carregar o histórico da ave.");
      return;
    }
    const data = (await response.json()) as { history: BirdHistory[] };
    setHistoryByBird((prev) => ({ ...prev, [birdId]: data.history }));
  }

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
            <ul className="grid gap-2">
              {birds.map((bird) => {
                const sexGlyph =
                  bird.sex === "FEMALE" ? "♀" : bird.sex === "MALE" ? "♂" : null;
                const sexLabel =
                  bird.sex === "FEMALE" ? "Fêmea" : bird.sex === "MALE" ? "Macho" : "Sexo desconhecido";
                const isPending = pendingBirdId === bird.id;
                const historyEvents = historyByBird[bird.id];

                return (
                  <li
                    key={bird.id}
                    className={`rounded-2xl border border-[color:var(--line)] bg-white/80 px-3 py-2 sm:px-4 ${
                      isPending ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold tracking-wide text-slate-900">
                            {bird.ringNumber}
                          </span>
                          {sexGlyph ? (
                            <span
                              className="text-base text-slate-500"
                              aria-label={sexLabel}
                              title={sexLabel}
                            >
                              {sexGlyph}
                            </span>
                          ) : null}
                          {bird.nickname ? (
                            <span className="truncate text-sm font-medium text-slate-800">
                              {bird.nickname}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {STATUS_ICON_ORDER.map((s) => {
                          const active = bird.status === s;
                          return (
                            <button
                              key={s}
                              type="button"
                              aria-label={statusLabel[s]}
                              title={statusLabel[s]}
                              disabled={isPending}
                              onClick={async () => {
                                if (active) return;
                                await applyBirdStatus(bird.id, s);
                              }}
                              className={`inline-flex size-8 items-center justify-center rounded-lg text-base transition sm:size-9 ${
                                active
                                  ? `${statusBadge[s]} ring-2 ring-offset-1 ring-[color:var(--brand)]/30`
                                  : "border border-[color:var(--line)] bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                              }`}
                            >
                              {statusEmoji[s]}
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          aria-label="Marcar como vendida"
                          title="Marcar como vendida"
                          disabled={isPending}
                          className={`${iconBtn} ${
                            bird.status === "SOLD"
                              ? "bg-violet-100 text-violet-700 ring-2 ring-violet-300"
                              : ""
                          }`}
                          onClick={async () => {
                            if (bird.status === "SOLD") return;
                            if (!window.confirm(`Marcar a ave ${bird.ringNumber} como vendida?`)) return;
                            await applyBirdStatus(bird.id, "SOLD" as BirdStatus);
                          }}
                        >
                          <span className="text-base leading-none" aria-hidden>💰</span>
                        </button>

                        <button
                          type="button"
                          aria-label="Histórico de status"
                          title="Histórico de status"
                          className={iconBtn}
                          onClick={() => toggleHistory(bird.id)}
                        >
                          <History className="h-4 w-4" aria-hidden />
                        </button>

                        <Link
                          href={`/plantel?ring=${encodeURIComponent(bird.ringNumber)}`}
                          aria-label="Editar ave no Plantel"
                          title="Editar ave no Plantel"
                          className={iconBtn}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Link>

                        <DeleteActionButton
                          iconOnly
                          onClick={() => removeBird(bird.id)}
                          aria-label="Excluir ave"
                          className="size-8 sm:size-9"
                        />
                      </div>
                    </div>

                    {historyEvents ? (
                      <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                        {historyEvents.length === 0 ? (
                          <p>Sem histórico de status.</p>
                        ) : (
                          <ul className="space-y-1">
                            {historyEvents.map((event) => (
                              <li key={event.id}>
                                {new Date(event.createdAt).toLocaleString("pt-BR")} -{" "}
                                {event.fromStatus ? statusLabel[event.fromStatus] : "-"} para{" "}
                                {statusLabel[event.toStatus]}
                                {event.reason ? ` - ${event.reason}` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
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
