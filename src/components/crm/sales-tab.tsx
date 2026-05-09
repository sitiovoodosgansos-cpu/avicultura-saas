"use client";

import { useEffect, useMemo, useState } from "react";
import { ChannelIcon } from "@/components/crm/channel-icon";
import { CHANNEL_META } from "@/lib/crm/sub-status";
import type { Lead } from "@/components/crm/types";

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function SalesTab() {
  const [sales, setSales] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/crm/sales")
      .then((r) => r.json())
      .then((j) => setSales(j.sales ?? []))
      .catch(() => setSales([]))
      .finally(() => setLoading(false));
  }, []);

  // Conversao por canal (qual canal mais converte / valor)
  const byChannel = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    for (const s of sales) {
      const v = s.financialEntry ? Number(s.financialEntry.amount) : 0;
      const cur = map.get(s.channel) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += v;
      map.set(s.channel, cur);
    }
    return Array.from(map.entries())
      .map(([channel, agg]) => ({ channel, ...agg }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  const totalRevenue = sales.reduce((s, l) => s + (l.financialEntry ? Number(l.financialEntry.amount) : 0), 0);

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 rounded-2xl border border-amber-200 bg-amber-50/40 p-3 sm:grid-cols-3">
        <Stat label="Total de vendas" value={String(sales.length)} />
        <Stat label="Receita total" value={formatBRL(totalRevenue)} />
        <Stat
          label="Ticket médio"
          value={sales.length === 0 ? "—" : formatBRL(totalRevenue / sales.length)}
        />
      </div>

      {byChannel.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Performance por canal
          </p>
          <ul className="grid gap-1">
            {byChannel.map((c) => {
              const meta = CHANNEL_META[c.channel] ?? CHANNEL_META.OUTRO;
              const pct = totalRevenue === 0 ? 0 : (c.revenue / totalRevenue) * 100;
              return (
                <li key={c.channel} className="flex items-center gap-2 text-sm">
                  <span className="w-32 truncate">{meta.emoji} {meta.label}</span>
                  <div className="flex-1 h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-32 text-right text-xs tabular-nums text-zinc-700">
                    {c.count} · {formatBRL(c.revenue)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Carregando vendas...</p>
      ) : sales.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-3 py-6 text-center text-sm text-zinc-500">
          Nenhuma venda concluída ainda. Cards na coluna ✅ Comprou aparecem aqui.
        </p>
      ) : (
        <ul className="grid gap-2">
          {sales.map((l) => (
            <li key={l.id} className="rounded-2xl border border-zinc-200 bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{l.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <ChannelIcon channel={l.channel} channelOther={l.channelOther} />
                    {l.city ? <span>📍 {l.city}{l.state ? `/${l.state}` : ""}</span> : null}
                    {l.financialEntry ? (
                      <span>📅 {new Date(l.financialEntry.date).toLocaleDateString("pt-BR")}</span>
                    ) : null}
                    {l.financialEntry ? (
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px]">{l.financialEntry.category}</span>
                    ) : null}
                  </div>
                  {l.interestText ? <p className="mt-1 text-xs text-slate-600">🎯 {l.interestText}</p> : null}
                </div>
                {l.financialEntry ? (
                  <p className="text-lg font-bold tabular-nums text-amber-900">
                    {formatBRL(Number(l.financialEntry.amount))}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">{label}</p>
      <p className="text-lg font-bold tabular-nums text-amber-900">{value}</p>
    </div>
  );
}
