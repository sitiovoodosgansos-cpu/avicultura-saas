"use client";

import { useEffect, useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Lead } from "@/components/crm/types";

const inputClass =
  "h-10 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 text-sm text-slate-800";

type Tab = "eggs" | "vitrine" | "raw";

type TrayEntryOption = {
  id: string;
  trayLabel: string;
  entryDate: string;
  available: number;
};

type ListingOption = {
  id: string;
  label: string;
  available: number;
  currentPrice: number | null;
};

type EggCartItem = { trayEntryId: string; quantity: number; unitPrice: number };
type VitrineCartItem = { listingId: string; quantity: number; unitPrice: number };

const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

export function LeadSaleModal({
  lead,
  open,
  onClose,
  onSubmit,
  error
}: {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: unknown) => Promise<void>;
  error: string | null;
}) {
  const [tab, setTab] = useState<Tab>("eggs");
  const [submitting, setSubmitting] = useState(false);

  // Estoques carregados do servidor
  const [trayEntries, setTrayEntries] = useState<TrayEntryOption[]>([]);
  const [listings, setListings] = useState<ListingOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Carrinho
  const [eggCart, setEggCart] = useState<EggCartItem[]>([]);
  const [vitrineCart, setVitrineCart] = useState<VitrineCartItem[]>([]);

  // Avulso
  const [rawCategory, setRawCategory] = useState("OUTRA_VENDA");
  const [rawItem, setRawItem] = useState("");
  const [rawAmount, setRawAmount] = useState(0);

  // Comum
  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CARD" | "CASH">("PIX");
  const [notes, setNotes] = useState("");
  const [shippingFee, setShippingFee] = useState(0);
  const [soldAt, setSoldAt] = useState(today);

  useEffect(() => {
    if (!open) return;
    setTab("eggs");
    setEggCart([]);
    setVitrineCart([]);
    setRawCategory("OUTRA_VENDA");
    setRawItem("");
    setRawAmount(0);
    setPaymentMethod("PIX");
    setNotes("");
    setShippingFee(0);
    setSoldAt(today);
    void loadStocks();
  }, [open]);

  async function loadStocks() {
    setLoading(true);
    try {
      // Trays (Prateleira)
      const trayRes = await fetch("/api/eggs/trays").then((r) => r.json()).catch(() => ({ trays: [] }));
      const traysFlat: TrayEntryOption[] = [];
      for (const t of trayRes.trays ?? []) {
        const trayLabel = t.flockGroupTitle || `${t.speciesLabel ?? ""} ${t.breedLabel ?? ""}`.trim() || "Bandeja";
        for (const e of t.entries ?? []) {
          if (e.available > 0) {
            traysFlat.push({
              id: e.id,
              trayLabel,
              entryDate: e.entryDate,
              available: e.available
            });
          }
        }
      }
      setTrayEntries(traysFlat);

      // Listings (Vitrine)
      const vitrineRes = await fetch("/api/vitrine").then((r) => r.json()).catch(() => ({ listings: [] }));
      const lists: ListingOption[] = (vitrineRes.listings ?? [])
        .filter((l: { status: string; availableQuantity: number }) => l.status === "AVAILABLE" && l.availableQuantity > 0)
        .map((l: { id: string; title?: string | null; flockGroup: { title: string }; availableQuantity: number; currentPrice: number | null }) => ({
          id: l.id,
          label: l.title?.trim() || l.flockGroup.title,
          available: l.availableQuantity,
          currentPrice: l.currentPrice
        }));
      setListings(lists);
    } finally {
      setLoading(false);
    }
  }

  function addEgg(trayEntryId: string) {
    if (eggCart.find((c) => c.trayEntryId === trayEntryId)) return;
    setEggCart((p) => [...p, { trayEntryId, quantity: 1, unitPrice: 0 }]);
  }
  function patchEgg(trayEntryId: string, patch: Partial<EggCartItem>) {
    setEggCart((p) => p.map((c) => (c.trayEntryId === trayEntryId ? { ...c, ...patch } : c)));
  }
  function rmEgg(trayEntryId: string) {
    setEggCart((p) => p.filter((c) => c.trayEntryId !== trayEntryId));
  }
  function addListing(listingId: string) {
    if (vitrineCart.find((c) => c.listingId === listingId)) return;
    const l = listings.find((x) => x.id === listingId);
    setVitrineCart((p) => [...p, { listingId, quantity: 1, unitPrice: l?.currentPrice ?? 0 }]);
  }
  function patchListing(listingId: string, patch: Partial<VitrineCartItem>) {
    setVitrineCart((p) => p.map((c) => (c.listingId === listingId ? { ...c, ...patch } : c)));
  }
  function rmListing(listingId: string) {
    setVitrineCart((p) => p.filter((c) => c.listingId !== listingId));
  }

  async function handleSubmit() {
    if (!lead) return;
    setSubmitting(true);
    try {
      let payload: unknown;
      if (tab === "eggs") {
        if (eggCart.length === 0) return;
        payload = {
          type: "eggs",
          paymentMethod,
          soldAt,
          shippingFee: shippingFee || undefined,
          notes: notes || undefined,
          items: eggCart
        };
      } else if (tab === "vitrine") {
        if (vitrineCart.length === 0) return;
        payload = {
          type: "vitrine",
          paymentMethod,
          notes: notes || undefined,
          items: vitrineCart
        };
      } else {
        if (!rawItem.trim() || rawAmount <= 0) return;
        payload = {
          type: "raw",
          paymentMethod,
          category: rawCategory,
          item: rawItem,
          amount: rawAmount,
          notes: notes || undefined
        };
      }
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  }

  if (!lead) return null;

  const eggTotal = eggCart.reduce((s, c) => s + c.quantity * c.unitPrice, 0) + shippingFee;
  const vitrineTotal = vitrineCart.reduce((s, c) => s + c.quantity * c.unitPrice, 0);

  return (
    <AppModal open={open} title={`💰 Registrar venda — ${lead.name}`} onClose={onClose} error={error}>
      <div className="grid gap-3">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-zinc-100 p-1">
          {(
            [
              { key: "eggs" as Tab, label: "🥚 Ovos (Prateleira)" },
              { key: "vitrine" as Tab, label: "🐦 Aves (Vitrine)" },
              { key: "raw" as Tab, label: "➕ Avulso" }
            ]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold ${tab === t.key ? "bg-white text-slate-900 shadow" : "text-zinc-600 hover:bg-zinc-200"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-xs text-zinc-500">Carregando estoque...</p>
        ) : null}

        {tab === "eggs" ? (
          <div className="grid gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Adicionar do estoque</label>
              <select
                className={inputClass}
                value=""
                onChange={(e) => {
                  if (e.target.value) addEgg(e.target.value);
                  e.currentTarget.value = "";
                }}
              >
                <option value="">— escolher bandeja/data —</option>
                {trayEntries.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.trayLabel} · {new Date(e.entryDate).toLocaleDateString("pt-BR")} · {e.available} disp.
                  </option>
                ))}
              </select>
              {trayEntries.length === 0 && !loading ? (
                <p className="mt-1 text-[11px] text-zinc-500">Nenhuma bandeja com ovos disponíveis na Prateleira.</p>
              ) : null}
            </div>
            {eggCart.map((c) => {
              const e = trayEntries.find((x) => x.id === c.trayEntryId);
              return (
                <div key={c.trayEntryId} className="rounded-xl border border-zinc-200 bg-white p-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800">
                      {e?.trayLabel} · {e ? new Date(e.entryDate).toLocaleDateString("pt-BR") : ""}
                    </span>
                    <button type="button" className="text-xs text-rose-600" onClick={() => rmEgg(c.trayEntryId)}>
                      remover
                    </button>
                  </div>
                  <div className="mt-1 grid gap-2 sm:grid-cols-2">
                    <Input
                      type="number"
                      min={1}
                      max={e?.available ?? 99}
                      value={c.quantity}
                      onChange={(ev) => patchEgg(c.trayEntryId, { quantity: Math.max(1, Number(ev.target.value || 0)) })}
                      placeholder="Qtd"
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={c.unitPrice}
                      onChange={(ev) => patchEgg(c.trayEntryId, { unitPrice: Math.max(0, Number(ev.target.value || 0)) })}
                      placeholder="R$ unit"
                    />
                  </div>
                </div>
              );
            })}
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-700">Data da venda</span>
                <Input type="date" value={soldAt} onChange={(e) => setSoldAt(e.target.value)} />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-700">Frete (opcional)</span>
                <Input type="number" min={0} step="0.01" value={shippingFee} onChange={(e) => setShippingFee(Number(e.target.value || 0))} />
              </label>
            </div>
          </div>
        ) : null}

        {tab === "vitrine" ? (
          <div className="grid gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Adicionar do estoque</label>
              <select
                className={inputClass}
                value=""
                onChange={(e) => {
                  if (e.target.value) addListing(e.target.value);
                  e.currentTarget.value = "";
                }}
              >
                <option value="">— escolher anúncio —</option>
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label} · {l.available} disp. {l.currentPrice ? `· R$ ${l.currentPrice.toFixed(2)}` : ""}
                  </option>
                ))}
              </select>
              {listings.length === 0 && !loading ? (
                <p className="mt-1 text-[11px] text-zinc-500">Nenhum anúncio disponível na Vitrine.</p>
              ) : null}
            </div>
            {vitrineCart.map((c) => {
              const l = listings.find((x) => x.id === c.listingId);
              return (
                <div key={c.listingId} className="rounded-xl border border-zinc-200 bg-white p-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800">{l?.label}</span>
                    <button type="button" className="text-xs text-rose-600" onClick={() => rmListing(c.listingId)}>
                      remover
                    </button>
                  </div>
                  <div className="mt-1 grid gap-2 sm:grid-cols-2">
                    <Input
                      type="number"
                      min={1}
                      max={l?.available ?? 99}
                      value={c.quantity}
                      onChange={(ev) => patchListing(c.listingId, { quantity: Math.max(1, Number(ev.target.value || 0)) })}
                      placeholder="Qtd"
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={c.unitPrice}
                      onChange={(ev) => patchListing(c.listingId, { unitPrice: Math.max(0, Number(ev.target.value || 0)) })}
                      placeholder="R$ unit"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {tab === "raw" ? (
          <div className="grid gap-2">
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-700">Categoria</span>
              <Input value={rawCategory} onChange={(e) => setRawCategory(e.target.value)} placeholder="Ex: OUTRA_VENDA, CONSULTORIA, FRETE_AVULSO" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-700">Descrição do item</span>
              <Input value={rawItem} onChange={(e) => setRawItem(e.target.value)} placeholder="Ex: Casal de canários (espécie nova)" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-700">Valor (R$)</span>
              <Input type="number" min={0.01} step="0.01" value={rawAmount} onChange={(e) => setRawAmount(Number(e.target.value || 0))} />
            </label>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-slate-700">Pagamento</span>
            <select className={inputClass} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "PIX" | "CARD" | "CASH")}>
              <option value="PIX">PIX</option>
              <option value="CARD">Cartão</option>
              <option value="CASH">Dinheiro</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-slate-700">Observações</span>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        <div className="rounded-2xl bg-amber-50 px-3 py-2 text-sm">
          <strong>Total:</strong>{" "}
          <span className="text-lg font-bold text-amber-900 tabular-nums">
            R$ {tab === "eggs" ? eggTotal.toFixed(2) : tab === "vitrine" ? vitrineTotal.toFixed(2) : rawAmount.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Registrando..." : "Confirmar venda"}
          </Button>
        </div>
      </div>
    </AppModal>
  );
}
