"use client";

import { useEffect, useMemo, useState } from "react";
import { Egg, Flame, Plus, ShoppingBasket, Trash2, X } from "lucide-react";
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
  flockGroupTitle: string | null;
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

type SelectionMode = "sale" | "transfer" | "discard" | null;

type SelectedItem = {
  entryId: string;
  trayId: string;
  trayLabel: string;
  trayHasFlockGroup: boolean;
  quantity: number;
  available: number;
  unitPrice?: number;
};

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

function trayHeader(tray: Tray) {
  if (tray.flockGroupTitle) return tray.flockGroupTitle;
  const parts = [tray.speciesLabel, tray.breedLabel, tray.varietyLabel].filter(Boolean);
  return parts.join(" · ");
}

function modeLabel(mode: SelectionMode) {
  if (mode === "sale") return "Venda";
  if (mode === "transfer") return "Chocadeira";
  if (mode === "discard") return "Descarte";
  return "";
}

export function PrateleiraManager() {
  const [trays, setTrays] = useState<Tray[]>([]);
  const [incubators, setIncubators] = useState<IncubatorOption[]>([]);
  const [flockGroups, setFlockGroups] = useState<FlockGroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedTrayId, setExpandedTrayId] = useState<string | null>(null);

  const [selectionMode, setSelectionMode] = useState<SelectionMode>(null);
  const [selection, setSelection] = useState<Map<string, SelectedItem>>(new Map());

  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showExternalModal, setShowExternalModal] = useState(false);

  const [saleCustomer, setSaleCustomer] = useState("");
  const [saleSoldAt, setSaleSoldAt] = useState(today);
  const [saleNotes, setSaleNotes] = useState("");

  const [transferIncubatorId, setTransferIncubatorId] = useState<string>("");
  const [transferNotes, setTransferNotes] = useState("");

  const [discardNotes, setDiscardNotes] = useState("");

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
        setIncubators(incData.incubators ?? []);
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

  const selectedCount = selection.size;
  const selectedEggs = useMemo(() => Array.from(selection.values()).reduce((s, it) => s + it.quantity, 0), [selection]);
  const saleTotal = useMemo(() => {
    if (selectionMode !== "sale") return 0;
    return Array.from(selection.values()).reduce((s, it) => s + (it.quantity || 0) * (it.unitPrice || 0), 0);
  }, [selection, selectionMode]);

  function clearSelection() {
    setSelection(new Map());
    setSelectionMode(null);
  }

  function handleEntryAction(entry: TrayEntry, tray: Tray, mode: NonNullable<SelectionMode>) {
    if (entry.available <= 0) return;

    if (selectionMode && selectionMode !== mode && selection.size > 0) {
      setError(`Voce ja tem itens selecionados em "${modeLabel(selectionMode)}". Finalize ou cancele antes de mudar.`);
      return;
    }

    if (!selectionMode) setSelectionMode(mode);

    setSelection((prev) => {
      const next = new Map(prev);
      const existing = next.get(entry.id);
      if (existing) {
        next.delete(entry.id);
      } else {
        next.set(entry.id, {
          entryId: entry.id,
          trayId: tray.id,
          trayLabel: trayHeader(tray),
          trayHasFlockGroup: Boolean(tray.flockGroupId),
          quantity: entry.available,
          available: entry.available,
          unitPrice: 0
        });
      }
      // se ficou vazio, sai do modo
      if (next.size === 0) setSelectionMode(null);
      return next;
    });
    setError(null);
  }

  function updateSelectionQuantity(entryId: string, quantity: number) {
    setSelection((prev) => {
      const next = new Map(prev);
      const item = next.get(entryId);
      if (!item) return next;
      next.set(entryId, { ...item, quantity: Math.max(0, Math.min(item.available, quantity)) });
      return next;
    });
  }

  function updateSelectionPrice(entryId: string, unitPrice: number) {
    setSelection((prev) => {
      const next = new Map(prev);
      const item = next.get(entryId);
      if (!item) return next;
      next.set(entryId, { ...item, unitPrice: Math.max(0, unitPrice) });
      return next;
    });
  }

  function removeFromSelection(entryId: string) {
    setSelection((prev) => {
      const next = new Map(prev);
      next.delete(entryId);
      if (next.size === 0) setSelectionMode(null);
      return next;
    });
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

  function openFinalize() {
    if (!selectionMode || selection.size === 0) return;
    setSaleCustomer("");
    setSaleSoldAt(today);
    setSaleNotes("");
    setTransferIncubatorId(incubators.find((i) => i.status === "ACTIVE")?.id ?? "");
    setTransferNotes("");
    setDiscardNotes("");
    setError(null);
    setShowFinalizeModal(true);
  }

  async function submitFinalize(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const items = Array.from(selection.values()).filter((it) => it.quantity > 0);
    if (items.length === 0) {
      setError("Nenhum item valido para enviar.");
      setSaving(false);
      return;
    }

    let res: Response;

    if (selectionMode === "sale") {
      res = await fetch("/api/eggs/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: saleCustomer || undefined,
          soldAt: saleSoldAt,
          items: items.map((it) => ({
            trayEntryId: it.entryId,
            quantity: it.quantity,
            unitPrice: it.unitPrice ?? 0
          })),
          notes: saleNotes || undefined
        })
      });
    } else if (selectionMode === "transfer") {
      const externalIssue = items.find((it) => !it.trayHasFlockGroup);
      if (externalIssue) {
        setError(`Bandeja "${externalIssue.trayLabel}" e externa sem grupo do plantel. Edite o cadastro antes de incubar.`);
        setSaving(false);
        return;
      }
      if (!transferIncubatorId) {
        setError("Selecione a chocadeira.");
        setSaving(false);
        return;
      }
      res = await fetch("/api/eggs/trays/transfer-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incubatorId: transferIncubatorId,
          items: items.map((it) => ({ trayEntryId: it.entryId, quantity: it.quantity })),
          notes: transferNotes || undefined
        })
      });
    } else if (selectionMode === "discard") {
      res = await fetch("/api/eggs/trays/discard-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((it) => ({ trayEntryId: it.entryId, quantity: it.quantity })),
          notes: discardNotes || undefined
        })
      });
    } else {
      setSaving(false);
      return;
    }

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Falha ao processar.");
      setSaving(false);
      return;
    }

    setShowFinalizeModal(false);
    clearSelection();
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

  function ActionIcon({
    mode,
    selected,
    disabled,
    onClick,
    title
  }: {
    mode: NonNullable<SelectionMode>;
    selected: boolean;
    disabled: boolean;
    onClick: () => void;
    title: string;
  }) {
    const base =
      "inline-flex h-7 w-7 items-center justify-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-30";
    const palette =
      mode === "sale"
        ? selected
          ? "bg-emerald-600 text-white shadow-sm"
          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        : mode === "transfer"
          ? selected
            ? "bg-amber-600 text-white shadow-sm"
            : "bg-amber-50 text-amber-700 hover:bg-amber-100"
          : selected
            ? "bg-rose-600 text-white shadow-sm"
            : "bg-rose-50 text-rose-700 hover:bg-rose-100";
    const Icon = mode === "sale" ? ShoppingBasket : mode === "transfer" ? Flame : Trash2;
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${palette}`} aria-label={title} title={title}>
        <Icon className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <main className="space-y-5 pb-32 sm:space-y-6">
      <PageTitle
        icon="🪺"
        title="Prateleira"
        description="Ovos coletados aguardando destino: venda ou chocadeira. Selecione com os botoes verde / ambar / vermelho de cada data e finalize tudo de uma vez."
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

      {error && !showFinalizeModal && !showExternalModal ? (
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
              Quando voce registrar uma coleta, os ovos aparecerao aqui automaticamente. Tambem da pra adicionar uma
              bandeja externa.
            </p>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {trays.map((tray) => {
          const tone = urgencyTone(tray.oldestRemaining);
          const palette = tonePalette(tone);
          const expanded = expandedTrayId === tray.id;
          const trayLabel = trayHeader(tray);
          return (
            <Card key={tray.id} className={`${palette.border} ${palette.bg}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${palette.chipBg}`}>
                    <Egg className={`h-4 w-4 ${palette.accent}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">{trayLabel}</p>
                    <p className="text-[11px] text-zinc-500">
                      {tray.entries.length} {tray.entries.length === 1 ? "data" : "datas"} · {tray.expiryDays}d
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-400">Disponiveis</p>
                  <p className="text-xl font-semibold text-zinc-900">{tray.totalAvailable}</p>
                </div>
              </div>


              <div className="mt-2 space-y-1.5">
                {(expanded ? tray.entries : tray.entries.slice(0, 3)).map((entry) => {
                  const entryTone = urgencyTone(entry.remainingDays);
                  const entryPalette = tonePalette(entryTone);
                  const progress = entry.initialCount > 0 ? Math.min(100, Math.max(0, (entry.available / entry.initialCount) * 100)) : 0;
                  const selected = selection.get(entry.id);
                  const disabledOther = selectionMode !== null && selection.size > 0;
                  return (
                    <div key={entry.id} className={`rounded-lg border bg-white/80 p-2 ${selected ? "border-emerald-300 ring-1 ring-emerald-200" : "border-white"}`}>
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-zinc-600">{formatDateBr(entry.entryDate)}</span>
                          {entry.source === "EXTERNAL" ? (
                            <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-700">
                              ext
                            </span>
                          ) : null}
                          <span className={`truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${entryPalette.chipBg} ${entryPalette.chipText}`}>
                            {countdownLabel(entry.remainingDays)}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <ActionIcon
                            mode="sale"
                            selected={Boolean(selected) && selectionMode === "sale"}
                            disabled={entry.available <= 0 || (disabledOther && selectionMode !== "sale")}
                            onClick={() => handleEntryAction(entry, tray, "sale")}
                            title="Adicionar a venda"
                          />
                          <ActionIcon
                            mode="transfer"
                            selected={Boolean(selected) && selectionMode === "transfer"}
                            disabled={entry.available <= 0 || (disabledOther && selectionMode !== "transfer")}
                            onClick={() => handleEntryAction(entry, tray, "transfer")}
                            title="Adicionar a chocadeira"
                          />
                          <ActionIcon
                            mode="discard"
                            selected={Boolean(selected) && selectionMode === "discard"}
                            disabled={entry.available <= 0 || (disabledOther && selectionMode !== "discard")}
                            onClick={() => handleEntryAction(entry, tray, "discard")}
                            title="Descartar"
                          />
                        </div>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
                        <span>{entry.available}/{entry.initialCount}</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-200">
                        <div className={`h-full rounded-full ${entryPalette.bar}`} style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  );
                })}
                {tray.entries.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => setExpandedTrayId(expanded ? null : tray.id)}
                    className="w-full rounded-lg border border-dashed border-zinc-300 py-1 text-[11px] font-semibold text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-700"
                  >
                    {expanded ? "Recolher" : `+${tray.entries.length - 3} datas`}
                  </button>
                ) : null}
              </div>

            </Card>
          );
        })}
        <button
          type="button"
          onClick={openExternalModal}
          className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 bg-white/40 p-4 text-zinc-500 transition hover:border-emerald-400 hover:bg-emerald-50/40 hover:text-emerald-700"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 transition group-hover:bg-emerald-100">
            <Plus className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold">Adicionar bandeja externa</span>
          <span className="max-w-[18rem] text-center text-[11px] text-zinc-400">
            Ovos comprados de fora ou de especies que ainda nao estao no plantel
          </span>
        </button>
      </section>

      {selectionMode && selection.size > 0 ? (
        <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xl md:bottom-6 md:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-white ${
                  selectionMode === "sale" ? "bg-emerald-600" : selectionMode === "transfer" ? "bg-amber-600" : "bg-rose-600"
                }`}
              >
                {selectionMode === "sale" ? <ShoppingBasket className="h-5 w-5" /> : selectionMode === "transfer" ? <Flame className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Modo: {modeLabel(selectionMode)}</p>
                <p className="text-xs text-zinc-500">
                  {selectedCount} {selectedCount === 1 ? "data selecionada" : "datas selecionadas"} · {selectedEggs} ovos
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={clearSelection}>
                <X className="mr-1 h-4 w-4" /> Cancelar
              </Button>
              <Button type="button" onClick={openFinalize}>
                Finalizar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <AppModal
        open={showFinalizeModal}
        title={
          selectionMode === "sale"
            ? "Finalizar venda"
            : selectionMode === "transfer"
              ? "Enviar para chocadeira"
              : selectionMode === "discard"
                ? "Confirmar descarte"
                : ""
        }
        error={error}
        onClose={() => setShowFinalizeModal(false)}
      >
        <form className="grid gap-3" onSubmit={submitFinalize}>
          {selectionMode === "sale" ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input placeholder="Cliente (opcional)" value={saleCustomer} onChange={(e) => setSaleCustomer(e.target.value)} />
              <Input type="date" value={saleSoldAt} onChange={(e) => setSaleSoldAt(e.target.value)} />
            </div>
          ) : null}

          {selectionMode === "transfer" ? (
            <>
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Sera criado um lote ativo na chocadeira para cada bandeja. FIFO consume os ovos mais antigos.
              </p>
              <select
                className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
                value={transferIncubatorId}
                onChange={(e) => setTransferIncubatorId(e.target.value)}
              >
                <option value="">Selecione a chocadeira</option>
                {incubators.filter((i) => i.status === "ACTIVE").map((inc) => (
                  <option key={inc.id} value={inc.id}>{inc.name}</option>
                ))}
              </select>
            </>
          ) : null}

          {selectionMode === "discard" ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
              Use para ovos quebrados, contaminados ou inviaveis. Esta acao nao pode ser desfeita.
            </p>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Itens selecionados</p>
            {Array.from(selection.values()).map((item) => {
              const tray = trays.find((t) => t.id === item.trayId);
              const entry = tray?.entries.find((e) => e.id === item.entryId);
              return (
                <div key={item.entryId} className="rounded-xl border border-zinc-200 bg-white p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-800">{item.trayLabel}</p>
                      {entry ? (
                        <p className="text-[11px] text-zinc-500">
                          Coleta de {formatDateBr(entry.entryDate)} · disponiveis: {item.available}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromSelection(item.entryId)}
                      className="text-xs font-semibold text-zinc-400 hover:text-rose-600"
                      aria-label="Remover"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className={`mt-2 grid gap-2 ${selectionMode === "sale" ? "grid-cols-2" : "grid-cols-1"}`}>
                    <Input
                      type="number"
                      min={1}
                      max={item.available}
                      placeholder="Quantidade"
                      value={item.quantity || ""}
                      onChange={(e) => updateSelectionQuantity(item.entryId, Number(e.target.value))}
                    />
                    {selectionMode === "sale" ? (
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="R$ unit."
                        value={item.unitPrice || ""}
                        onChange={(e) => updateSelectionPrice(item.entryId, Number(e.target.value))}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {selectionMode === "sale" ? (
            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm">
              <span className="text-zinc-600">Total: </span>
              <span className="font-semibold text-emerald-800">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(saleTotal)}
              </span>
            </div>
          ) : null}

          <Input
            placeholder={selectionMode === "discard" ? "Motivo (opcional)" : "Observacoes (opcional)"}
            value={selectionMode === "sale" ? saleNotes : selectionMode === "transfer" ? transferNotes : discardNotes}
            onChange={(e) =>
              selectionMode === "sale"
                ? setSaleNotes(e.target.value)
                : selectionMode === "transfer"
                  ? setTransferNotes(e.target.value)
                  : setDiscardNotes(e.target.value)
            }
          />

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando..."
                : selectionMode === "sale"
                  ? "Confirmar venda"
                  : selectionMode === "transfer"
                    ? "Confirmar transferencia"
                    : "Confirmar descarte"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowFinalizeModal(false)}>
              Voltar
            </Button>
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
