"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CHANNEL_META, INTEREST_META } from "@/lib/crm/sub-status";

const inputClass =
  "h-10 rounded-xl border border-[color:var(--line)] bg-white px-3 text-sm text-slate-800";

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
  const active =
    !!filters.search ||
    !!filters.channel ||
    !!filters.interest ||
    !!filters.temperature ||
    !!filters.tag;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-2">
      <Input
        className="min-w-[160px] flex-1"
        placeholder="🔎 buscar nome, cidade, interesse..."
        value={filters.search}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
      />
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
      {active ? (
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setFilters({ search: "", channel: "", interest: "", temperature: "", tag: "" })
          }
        >
          Limpar
        </Button>
      ) : null}
    </div>
  );
}
