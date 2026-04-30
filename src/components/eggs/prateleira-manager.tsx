"use client";

import { useEffect, useMemo, useState } from "react";
import { Egg, Flame, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppModal } from "@/components/ui/app-modal";

type TrayEntry = {
  id: string;
  entryDate: string;
  initialCount: number;
  soldCount: number;
  discardedCount: number;
  transferredCount: number;
  available: number;
  expiresAt: string;
  remainingDays: number;
  source: "COLLECTION" | "EXTERNAL";
  notes: string | null;
};

type Tray = {
  id: string;
  flockGroupId: string | null;
  speciesLabel: string;
  breedLabel: string;
  varietyLabel: string | null;
  expiryDays: number;
  notes: string | null;
  totalAvailable: number;
  oldestRemaining: number | null;
  entries: TrayEntry[];
};

type IncubatorOption = { id: string; name: string; status: string };
type FlockGroupOption = {
  id: string;
  title: string;
  species: { name: string };
  breed: { name: string };
  variety: { name: string } | null;
};

type SaleItem = { trayId: string; quantity: number; unitPrice: number };

const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

function formatDateBr(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function urgencyTone(remainingDays: number | null) {
  if (remainingDays === null) return "neutral";
  if (remainingDays < 0) return "expired";
  if (remainingDays <= 3) return "warning";
  return "fresh";
}

function tonePalette(tone: string) {
  switch (tone) {
    case "expired":
      return {
        border: "border-rose-200",
        bg: "bg-rose-50/40",
        chipBg: "bg-rose-100",
        chipText: "text-rose-700",
        bar: "bg-rose-500",
        accent: "text-rose-700"
      };
    case "warning":
      return {
        border: "border-amber-200",
        bg: "bg-amber-50/40",
        chipBg: "bg-amber-100",
        chipText: "text-amber-700",
        bar: "bg-amber-500",
        accent: "text-amber-700"
      };
    case "fresh":
      return {
        border: "border-emerald-200",
        bg: "bg-emerald-50/30",
        chipBg: "bg-emerald-100",
        chipText: "text-emerald-700",
        bar: "bg-emerald-500",
        accent: "text-emerald-700"
      };
    default:
      return {
        border: "border-zinc-200",
        bg: "bg-white",
        chipBg: "bg-zinc-100",
        chipText: "text-zinc-700",
        bar: "bg-zinc-400",
        accent: "text-zinc-700"
      };
  }
}

function countdownLabel(remainingDays: number) {
  if (remainingDays < 0) return `Vencido ha ${Math.abs(remainingDays)}d`;
  if (remainingDays === 0) return "Vence hoje";
  if (remainingDays === 1) return "1 dia restante";
  return `${remainingDays} dias restantes`;
}

function describeTray(tray: Tray) {
  const parts = [tray.speciesLabel, tray.breedLabel, tray.varietyLabel].filter(Boolean);
  return parts.join(" · ");
}

export function PrateleiraManager() {
  const [trays, setTrays] = useState<Tray[]>([]);
  const [incubators, setIncubators] = useState<IncubatorOption[]>([]);
  const [flockGroups, setFlockGroups] = useState<FlockGroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [expandedTrayId, setExpandedTrayId] = useState<string | null>(null);

  const [saleCustomer, setSaleCustomer] = useState("");
  const [saleSoldAt, setSaleSoldAt] = useState(today);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([{ trayId: "", quantity: 1, unitPrice: 0 }]);
  const [saleNotes, setSaleNotes] = useState("");

  const [transferTrayId, setTransferTrayId] = useState<string>("");
  const [transferIncubatorId, setTransferIncubatorId] = useState<string>("");
  const [transferQuantity, setTransferQuantity] = useState<number>(0);

  const [externalForm, setExternalForm] = useState({
    flockGroupId: "",
    speciesLabel: "",
    breedLabel: "",
    varietyLabel: "",
    entryDate: today,
    initialCount: 0,
    expiryDays: 10,
    notes: ""
  });

  const [discardEntryId, setDiscardEntryId] = useState<string>("");
  const [discardQuantity, setDiscardQuantity] = useState<number>(0);
  const [discardNotes, setDiscardNotes] = useState("");

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [trayRes, incRes, groupRes] = await Promise.all([
        fetch("/api/eggs/trays", { cache: "no-store" }),
        fetch("/api/eggs/incubators", { cache: "no-store" }),
        fetch("/api/eggs/flock-groups", { cache: "no-store" })
      ]);
      if (!trayRes.ok) throw new Error("Falha ao carregar prateleira.");
      const trayData = (await trayRes.json()) as { trays: Tray[] };
      setTrays(trayData.trays);
      if (incRes.ok) {
        const incData = (await incRes.json()) as { incubators: IncubatorOption[] };
        setIncubators((incData.incubators ?? []).filter((i) => i.status === "ACTIVE"));
      }
      if (groupRes.ok) {
        const groupData = (await groupRes.json()) as { groups: FlockGroupOption[] };
        setFlockGroups(groupData.groups ?? []);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const summary = useMemo(() => {
    const totalEggs = trays.reduce((sum, t) => sum + t.totalAvailable, 0);
    const expiringSoon = trays.filter((t) => t.oldestRemaining !== null && t.oldestRemaining <= 3 && t.oldestRemaining >= 0).length;
    const expired = trays.filter((t) => t.oldestRemaining !== null && t.oldestRemaining < 0).length;
    return {
      activeTrays: trays.length,
      totalEggs,
      expiringSoon,
      expired
    };
  }, [trays]);

  const saleTotal = useMemo(
    () => saleItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0),
    [saleItems]
  );

  function openSaleModalForTray(trayId: string) {
    setSaleCustomer("");
    setSaleSoldAt(today);
    setSaleItems([{ trayId, quantity: 1, unitPrice: 0 }]);
    setSaleNotes("");
    setShowSaleModal(true);
  }

  function openSaleModalEmpty() {
    setSaleCustomer("");
    setSaleSoldAt(today);
    setSaleItems([{ trayId: trays[0]?.id ?? "", quantity: 1, unitPrice: 0 }]);
    setSaleNotes("");
    setShowSaleModal(true);
  }

  function openTransferModal(trayId: string) {
    const tray = trays.find((t) => t.id === trayId);
    setTransferTrayId(trayId);
    setTransferIncubatorId(incubators[0]?.id ?? "");
    setTransferQuantity(tray?.totalAvailable ?? 0);
    setShowTransferModal(true);
  }

  function openDiscardModal(entryId: string) {
    const entry = trays.flatMap((t) => t.entries).find((e) => e.id === entryId);
    setDiscardEntryId(entryId);
    setDiscardQuantity(entry?.available ?? 0);
    setDiscardNotes("");
    setShowDiscardModal(true);
  }

  function openExternalModal() {
    setExternalForm({
      flockGroupId: "",
      speciesLabel: "",
      breedLabel: "",
      varietyLabel: "",
      entryDate: today,
      initialCount: 0,
      expiryDays: 10,
      notes: ""
    });
    setShowExternalModal(true);
  }

  function selectFlockGroupForExternal(groupId: string) {
    const group = flockGroups.find((g) => g.id === groupId);
    if (!group) {
      setExternalForm((prev) => ({ ...prev, flockGroupId: "" }));
      return;
    }
    setExternalForm((prev) => ({
      ...prev,
      flockGroupId: group.id,
      speciesLabel: group.species.name,
      breedLabel: group.breed.name,
      varietyLabel: group.variety?.name ?? ""
    }));
  }

  async function submitSale(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      customer: saleCustomer || undefined,
      soldAt: saleSoldAt,
      items: saleItems
        .filter((it) => it.trayId && it.quantity > 0)
        .map((it) => ({ trayId: it.trayId, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) })),
      notes: saleNotes || undefined
    };
    if (body.items.length === 0) {
      setError("Adicione ao menos um item com bandeja e quantidade.");
      setSaving(false);
      return;
    }
    const res = await fetch("/api/eggs/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Falha ao registrar venda.");
      setSaving(false);
      return;
    }
    setShowSaleModal(false);
    setSaving(false);
    await loadData();
  }

  async function submitTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/eggs/trays/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trayId: transferTrayId,
        incubatorId: transferIncubatorId,
        quantity: Number(transferQuantity)
      })
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Falha ao transferir.");
      setSaving(false);
      return;
    }
    setShowTransferModal(false);
    setSaving(false);
    await loadData();
  }

  async function submitDiscard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/eggs/trays/discard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trayEntryId: discardEntryId,
        quantity: Number(discardQuantity),
        notes: discardNotes || undefined
      })
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Falha ao descartar.");
      setSaving(false);
      return;
    }
    setShowDiscardModal(false);
    setSaving(false);
    await loadData();
  }

  async function submitExternal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/eggs/trays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flockGroupId: externalForm.flockGroupId || null,
        speciesLabel: externalForm.speciesLabel,
        breedLabel: externalForm.breedLabel,
        varietyLabel: externalForm.varietyLabel || null,
        entryDate: externalForm.entryDate,
        initialCount: Number(externalForm.initialCount),
        expiryDays: Number(externalForm.expiryDays),
        notes: externalForm.notes || undefined
      })
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Falha ao adicionar bandeja.");
      setSaving(false);
      return;
    }
    setShowExternalModal(false);
    setSaving(false);
    await loadData();
  }

  const canTransfer = (tray: Tray) => Boolean(tray.flockGroupId);

  return (
    <main className="space-y-5 pb-24 sm:space-y-6">
      <PageTitle
        icon="🪺"
        title="Prateleira"
        description="Ovos coletados aguardando destino: venda ou chocadeira. Cada bandeja agrupa por especie e raca, com a data de cada coleta."
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">🪺 Bandejas</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{summary.activeTrays}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">🥚 Ovos disponiveis</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{summary.totalEggs}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-amber-500">⏳ Vencendo (≤3d)</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">{summary.expiringSoon}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-rose-500">⚠️ Bandejas vencidas</p>
          <p className="mt-2 text-2xl font-semibold text-rose-700">{summary.expired}</p>
        </Card>
      </section>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Bandejas ativas</h3>
            <p className="text-sm text-zinc-500">FIFO automatico: ao vender ou transferir, os ovos mais antigos saem primeiro.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={openSaleModalEmpty} disabled={trays.length === 0}>
              <ShoppingBasket className="mr-1 h-4 w-4" /> Nova venda
            </Button>
            <Button type="button" variant="outline" onClick={openExternalModal}>
              <Plus className="mr-1 h-4 w-4" /> Bandeja externa
            </Button>
          </div>
        </div>
      </Card>

      {error && !(showSaleModal || showTransferModal || showExternalModal || showDiscardModal) ? (
        <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      {loading ? (
        <Card>
          <p className="text-sm text-zinc-500">Carregando prateleira...</p>
        </Card>
      ) : null}

      {!loading && trays.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="text-4xl">🪹</span>
            <p className="text-base font-semibold text-zinc-700">Prateleira vazia</p>
            <p className="text-sm text-zinc-500">
              Quando voce registrar uma coleta, os ovos aparecerao aqui automaticamente. Tambem da pra adicionar uma bandeja
              externa (ovos comprados de fora ou de especies novas).
            </p>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        {trays.map((tray) => {
          const tone = urgencyTone(tray.oldestRemaining);
          const palette = tonePalette(tone);
          const expanded = expandedTrayId === tray.id;
          const showTransferLocked = !canTransfer(tray);
          return (
            <Card key={tray.id} className={`${palette.border} ${palette.bg}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${palette.chipBg}`}>
                    <Egg className={`h-6 w-6 ${palette.accent}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-zinc-900">{describeTray(tray)}</p>
                    <p className="text-xs text-zinc-500">
                      {tray.entries.length} {tray.entries.length === 1 ? "data" : "datas"} · validade {tray.expiryDays}d
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Disponiveis</p>
                  <p className="text-2xl font-semibold text-zinc-900">{tray.totalAvailable}</p>
                </div>
              </div>

              {tray.oldestRemaining !== null ? (
                <div className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${palette.chipBg} ${palette.chipText}`}>
                  ⏱ Mais antiga: {countdownLabel(tray.oldestRemaining)}
                </div>
              ) : null}

              <div className="mt-3 space-y-2">
                {(expanded ? tray.entries : tray.entries.slice(0, 3)).map((entry) => {
                  const entryTone = urgencyTone(entry.remainingDays);
                  const entryPalette = tonePalette(entryTone);
                  const progress = entry.initialCount > 0 ? Math.min(100, Math.max(0, (entry.available / entry.initialCount) * 100)) : 0;
                  return (
                    <div key={entry.id} className="rounded-xl border border-white bg-white/80 p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-600">{formatDateBr(entry.entryDate)}</span>
                          {entry.source === "EXTERNAL" ? (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700">
                              externo
                            </span>
                          ) : null}
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${entryPalette.chipBg} ${entryPalette.chipText}`}>
                            {countdownLabel(entry.remainingDays)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openDiscardModal(entry.id)}
                          disabled={entry.available === 0}
                          className="text-xs font-semibold text-rose-600 transition hover:text-rose-800 hover:underline disabled:cursor-not-allowed disabled:text-zinc-300 disabled:no-underline"
                          title="Descartar ovos desta data"
                        >
                          <Trash2 className="inline h-3 w-3" /> Descartar
                        </button>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500">
                        <span>{entry.available} de {entry.initialCount} disponiveis</span>
                        {entry.soldCount + entry.discardedCount + entry.transferredCount > 0 ? (
                          <span className="text-zinc-400">
                            {entry.soldCount > 0 ? `${entry.soldCount} vendidos · ` : ""}
                            {entry.transferredCount > 0 ? `${entry.transferredCount} chocando · ` : ""}
                            {entry.discardedCount > 0 ? `${entry.discardedCount} descartados` : ""}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200">
                        <div className={`h-full rounded-full ${entryPalette.bar}`} style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  );
                })}
                {tray.entries.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => setExpandedTrayId(expanded ? null : tray.id)}
                    className="w-full rounded-xl border border-dashed border-zinc-300 py-1.5 text-xs font-semibold text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-700"
                  >
                    {expanded ? "Recolher" : `Ver as ${tray.entries.length} datas`}
                  </button>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button type="button" onClick={() => openSaleModalForTray(tray.id)} disabled={tray.totalAvailable === 0}>
                  <ShoppingBasket className="mr-1 h-4 w-4" /> Vender
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openTransferModal(tray.id)}
                  disabled={tray.totalAvailable === 0 || showTransferLocked}
                  title={showTransferLocked ? "Bandeja externa precisa de grupo no plantel" : undefined}
                >
                  <Flame className="mr-1 h-4 w-4" /> Para chocadeira
                </Button>
              </div>
              {showTransferLocked ? (
                <p className="mt-2 text-[11px] text-zinc-500">
                  Esta bandeja e externa e nao esta vinculada a um grupo. Edite o cadastro para escolher o grupo no plantel
                  antes de incubar.
                </p>
              ) : null}
            </Card>
          );
        })}
      </section>

      <AppModal
        open={showSaleModal}
        title="Nova venda de ovos"
        error={error}
        onClose={() => setShowSaleModal(false)}
      >
        <form className="grid gap-3" onSubmit={submitSale}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input placeholder="Cliente (opcional)" value={saleCustomer} onChange={(e) => setSaleCustomer(e.target.value)} />
            <Input type="date" value={saleSoldAt} onChange={(e) => setSaleSoldAt(e.target.value)} />
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Itens</p>
            {saleItems.map((item, index) => {
              const tray = trays.find((t) => t.id === item.trayId);
              const max = tray?.totalAvailable ?? 0;
              return (
                <div key={index} className="grid grid-cols-12 gap-2 rounded-xl border border-zinc-200 bg-white p-2">
                  <select
                    className="col-span-5 h-10 rounded-md border border-zinc-300 bg-white px-2 text-sm"
                    value={item.trayId}
                    onChange={(e) => {
                      const next = [...saleItems];
                      next[index] = { ...next[index], trayId: e.target.value };
                      setSaleItems(next);
                    }}
                  >
                    <option value="">Bandeja</option>
                    {trays.filter((t) => t.totalAvailable > 0).map((t) => (
                      <option key={t.id} value={t.id}>
                        {describeTray(t)} ({t.totalAvailable})
                      </option>
                    ))}
                  </select>
                  <Input
                    className="col-span-3"
                    type="number"
                    min={1}
                    max={max || undefined}
                    placeholder="Qtde"
                    value={item.quantity || ""}
                    onChange={(e) => {
                      const next = [...saleItems];
                      next[index] = { ...next[index], quantity: Math.min(Number(e.target.value) || 0, max || Number(e.target.value) || 0) };
                      setSaleItems(next);
                    }}
                  />
                  <Input
                    className="col-span-3"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="R$ unit."
                    value={item.unitPrice || ""}
                    onChange={(e) => {
                      const next = [...saleItems];
                      next[index] = { ...next[index], unitPrice: Number(e.target.value) };
                      setSaleItems(next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="col-span-1 px-0"
                    disabled={saleItems.length <= 1}
                    onClick={() => setSaleItems(saleItems.filter((_, i) => i !== index))}
                    aria-label="Remover item"
                  >
                    ×
                  </Button>
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaleItems([...saleItems, { trayId: "", quantity: 1, unitPrice: 0 }])}
            >
              + Adicionar item
            </Button>
          </div>

          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm">
            <span className="text-zinc-600">Total da venda: </span>
            <span className="font-semibold text-emerald-800">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(saleTotal)}
            </span>
          </div>

          <Input placeholder="Observacoes (opcional)" value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} />

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Registrando..." : "Confirmar venda"}</Button>
            <Button type="button" variant="outline" onClick={() => setShowSaleModal(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={showTransferModal}
        title="Enviar para chocadeira"
        error={error}
        onClose={() => setShowTransferModal(false)}
      >
        <form className="grid gap-3" onSubmit={submitTransfer}>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Os ovos saem da bandeja em ordem FIFO (mais antigos primeiro) e formam um novo lote ativo na chocadeira escolhida.
          </p>
          <select
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
            value={transferIncubatorId}
            onChange={(e) => setTransferIncubatorId(e.target.value)}
          >
            <option value="">Selecione a chocadeira</option>
            {incubators.map((inc) => (
              <option key={inc.id} value={inc.id}>{inc.name}</option>
            ))}
          </select>
          <Input
            type="number"
            min={1}
            placeholder="Quantidade de ovos"
            value={transferQuantity || ""}
            onChange={(e) => setTransferQuantity(Number(e.target.value))}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving || !transferIncubatorId}>
              {saving ? "Transferindo..." : "Confirmar transferencia"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowTransferModal(false)}>Cancelar</Button>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={showDiscardModal}
        title="Descartar ovos"
        error={error}
        onClose={() => setShowDiscardModal(false)}
      >
        <form className="grid gap-3" onSubmit={submitDiscard}>
          <p className="text-xs text-zinc-500">Use para ovos quebrados, contaminados ou inviaveis.</p>
          <Input
            type="number"
            min={1}
            placeholder="Quantidade"
            value={discardQuantity || ""}
            onChange={(e) => setDiscardQuantity(Number(e.target.value))}
          />
          <Input placeholder="Motivo (opcional)" value={discardNotes} onChange={(e) => setDiscardNotes(e.target.value)} />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Descartando..." : "Confirmar descarte"}</Button>
            <Button type="button" variant="outline" onClick={() => setShowDiscardModal(false)}>Cancelar</Button>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={showExternalModal}
        title="Adicionar bandeja externa"
        error={error}
        onClose={() => setShowExternalModal(false)}
      >
        <form className="grid gap-3" onSubmit={submitExternal}>
          <p className="text-xs text-zinc-500">
            Use quando os ovos nao vieram de uma coleta sua (ex.: ovos ferteis comprados, brindes, especie nova).
          </p>
          <select
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
            value={externalForm.flockGroupId}
            onChange={(e) => selectFlockGroupForExternal(e.target.value)}
          >
            <option value="">Sem grupo do plantel (preenchimento manual)</option>
            {flockGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title} — {g.species.name} {g.breed.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              placeholder="Especie"
              value={externalForm.speciesLabel}
              onChange={(e) => setExternalForm((p) => ({ ...p, speciesLabel: e.target.value }))}
            />
            <Input
              placeholder="Raca"
              value={externalForm.breedLabel}
              onChange={(e) => setExternalForm((p) => ({ ...p, breedLabel: e.target.value }))}
            />
            <Input
              placeholder="Variedade (opcional)"
              value={externalForm.varietyLabel}
              onChange={(e) => setExternalForm((p) => ({ ...p, varietyLabel: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              type="date"
              value={externalForm.entryDate}
              onChange={(e) => setExternalForm((p) => ({ ...p, entryDate: e.target.value }))}
            />
            <Input
              type="number"
              min={1}
              placeholder="Quantidade"
              value={externalForm.initialCount || ""}
              onChange={(e) => setExternalForm((p) => ({ ...p, initialCount: Number(e.target.value) }))}
            />
            <Input
              type="number"
              min={1}
              max={60}
              placeholder="Validade (dias)"
              value={externalForm.expiryDays || ""}
              onChange={(e) => setExternalForm((p) => ({ ...p, expiryDays: Number(e.target.value) }))}
            />
          </div>
          <Input
            placeholder="Observacoes (opcional)"
            value={externalForm.notes}
            onChange={(e) => setExternalForm((p) => ({ ...p, notes: e.target.value }))}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Adicionar bandeja"}</Button>
            <Button type="button" variant="outline" onClick={() => setShowExternalModal(false)}>Cancelar</Button>
          </div>
        </form>
      </AppModal>
    </main>
  );
}
