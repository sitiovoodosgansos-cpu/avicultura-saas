"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CHANNEL_META, INTEREST_META } from "@/lib/crm/sub-status";

const inputClass =
  "h-10 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-sm text-slate-800";

export type CrmFilters = {
  search: string;
  channel: string;
  interest: string;
  temperature: string;
  tag: string;
};

export function FiltersBar({
  filters,
  setFilters,
  allTags
}: {
  filters: CrmFilters;
  setFilters: (f: CrmFilters) => void;
  allTags: string[];
}) {
  // Estado de UI: dropdowns ficam escondidos atras de um botao "Filtros"
  // pra economizar espaco no mobile. Busca por texto fica sempre visivel.
  const [open, setOpen] = useState(false);

  // Quantos filtros (alem da busca) estao ativos — pra mostrar badge
  // no botao Filtros e o usuario saber que tem filtro escondido.
  const activeAdvanced =
    Number(!!filters.channel) +
    Number(!!filters.interest) +
    Number(!!filters.temperature) +
    Number(!!filters.tag);
  const anyActive = activeAdvanced > 0 || !!filters.search;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-2">
      <div className="flex items-center gap-2">
        <Input
          className="min-w-0 flex-1"
          placeholder="🔎 buscar nome, cidade, interesse..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 relative"
        >
          <Filter className="mr-1 inline h-4 w-4" /> Filtros
          {activeAdvanced > 0 ? (
            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeAdvanced}
            </span>
          ) : null}
        </Button>
        {anyActive ? (
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFilters({ search: "", channel: "", interest: "", temperature: "", tag: "" })
            }
            className="shrink-0"
          >
            Limpar
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-2 grid gap-2 border-t border-zinc-100 pt-2 sm:grid-cols-2">
          <select
            className={inputClass}
            value={filters.channel}
            onChange={(e) => setFilters({ ...filters, channel: e.target.value })}
          >
            <option value="">Todos os canais</option>
            {Object.entries(CHANNEL_META).map(([k, m]) => (
              <option key={k} value={k}>
                {m.emoji} {m.label}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={filters.interest}
            onChange={(e) => setFilters({ ...filters, interest: e.target.value })}
          >
            <option value="">Todos os tipos</option>
            {Object.entries(INTEREST_META).map(([k, m]) => (
              <option key={k} value={k}>
                {m.emoji} {m.label}
              </option>
            ))}
          </select>
          <select
            className={inputClass}
            value={filters.temperature}
            onChange={(e) => setFilters({ ...filters, temperature: e.target.value })}
          >
            <option value="">Qualquer temperatura</option>
            <option value="hot">🟢 Quentes</option>
            <option value="warm">🟡 Mornos</option>
            <option value="cold">🔴 Frios</option>
          </select>
          {allTags.length > 0 ? (
            <select
              className={inputClass}
              value={filters.tag}
              onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
            >
              <option value="">Todas as tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  🏷 {t}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
