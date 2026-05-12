"use client";

import { useEffect, useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const inputClass =
  "h-10 w-full rounded-xl border border-[color:var(--line)] bg-white/90 px-3 text-[13px] text-slate-800 outline-none focus:ring-4 focus:ring-[color:var(--brand)]/20 sm:h-11 sm:rounded-2xl sm:px-4 sm:text-sm";

type EggPriceRow = {
  flockGroupId: string;
  title: string;
  species: string;
  breed: string;
  variety: string | null;
  unitPrice: number | null;
};

type EggPricesResponse = {
  rows: EggPriceRow[];
};

export function EggPriceManager({
  open,
  onClose,
  onSaved
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<EggPriceRow[]>([]);
  // Inputs como string pra permitir vazio + edicao incremental
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/eggs/prices", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Erro ao carregar preços.");
      }
      const data = (await res.json()) as EggPricesResponse;
      setRows(data.rows);
      // Popula drafts com valores atuais (string vazia = sem preco)
      const initial: Record<string, string> = {};
      for (const row of data.rows) {
        initial[row.flockGroupId] =
          row.unitPrice !== null ? row.unitPrice.toFixed(2).replace(".", ",") : "";
      }
      setDrafts(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar preços.");
    } finally {
      setLoading(false);
    }
  }

  function setDraft(flockGroupId: string, value: string) {
    // Aceita digitos + virgula/ponto. Limpa outros chars na hora.
    const clean = value.replace(/[^0-9.,]/g, "");
    setDrafts((d) => ({ ...d, [flockGroupId]: clean }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      // Converte drafts em payload: string vazia / '0' = null (deleta)
      const prices = rows.map((row) => {
        const raw = (drafts[row.flockGroupId] ?? "").trim().replace(",", ".");
        const parsed = raw === "" ? null : Number(raw);
        return {
          flockGroupId: row.flockGroupId,
          unitPrice: parsed !== null && Number.isFinite(parsed) && parsed > 0 ? parsed : null
        };
      });

      const res = await fetch("/api/eggs/prices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Erro ao salvar.");
      }
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal open={open} title="Tabela de preços dos ovos" onClose={onClose} error={error}>
      <div className="grid gap-4">
        <p className="rounded-xl bg-blue-50 px-3 py-2 text-[11px] leading-relaxed text-blue-800">
          Defina o preço por unidade do ovo de cada raça. Deixe em branco pra
          remover. Esses preços vão pré-preencher o carrinho quando você
          selecionar bandejas pra venda (você pode editar individualmente
          antes de finalizar).
        </p>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhuma raça cadastrada ainda. Crie cards no Plantel primeiro.
          </p>
        ) : (
          <div className="grid gap-2">
            {rows.map((row) => (
              <div
                key={row.flockGroupId}
                className="grid grid-cols-[1fr_120px] items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-white/70 px-3 py-2 sm:px-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {row.title}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {row.species}
                    {row.breed ? ` · ${row.breed}` : ""}
                    {row.variety ? ` · ${row.variety}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-semibold text-slate-500">R$</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    className={inputClass}
                    value={drafts[row.flockGroupId] ?? ""}
                    onChange={(e) => setDraft(row.flockGroupId, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || loading}>
            {saving ? "Salvando..." : "Salvar tabela"}
          </Button>
        </div>
      </div>
    </AppModal>
  );
}
