"use client";

import { useEffect, useMemo, useState } from "react";
import { Egg, Plus, X } from "lucide-react";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppModal } from "@/components/ui/app-modal";
import { EggPriceManager } from "@/components/eggs/egg-price-manager";

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
  const [showPriceModal, setShowPriceModal] = useState(false);
  // Map<flockGroupId, unitPrice> usado pra pre-preencher unitPrice ao
  // adicionar bandeja no carrinho de venda (selectionMode === "sale").
  const [eggPrices, setEggPrices] = useState<Map<string, number>>(new Map());

  const [saleCustomer, setSaleCustomer] = useState("");
  const [saleSoldAt, setSaleSoldAt] = useState(today);
  const [salePaymentMethod, setSalePaymentMethod] = useState<"PIX" | "CARD" | "CASH">("PIX");
  const [saleDeliveryType, setSaleDeliveryType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [saleShippingFee, setSaleShippingFee] = useState(0);
  const [saleNotes, setSaleNotes] = useState("");

  const [transferIncubatorId, setTransferIncubatorId] = useState<string>("");
  const [transferNotes, setTransferNotes] = useState("");

  const [discardNotes, setDiscardNotes] = useState("");

  // Filtros: busca livre por nome do grupo/raca + dropdown com grupo especifico.
  // groupFilter "" = todos.
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("");

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
      const [trayRes, incRes, groupRes, priceRes] = await Promise.all([
        fetch("/api/eggs/trays", { cache: "no-store" }),
        fetch("/api/eggs/incubators", { cache: "no-store" }),
        fetch("/api/eggs/flock-groups", { cache: "no-store" }),
        fetch("/api/eggs/prices", { cache: "no-store" })
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
      if (priceRes.ok) {
        const priceData = (await priceRes.json()) as {
          rows: Array<{ flockGroupId: string; unitPrice: number | null }>;
        };
        const map = new Map<string, number>();
        for (const row of priceData.rows) {
          if (row.unitPrice !== null && row.unitPrice > 0) {
            map.set(row.flockGroupId, row.unitPrice);
          }
        }
        setEggPrices(map);
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

  // Aplica busca + filtro de grupo nas bandejas. Mantemos summary nos numeros
  // totais (panorama da prateleira) e so filtramos a grade visivel.
  const visibleTrays = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return trays.filter((tray) => {
      if (groupFilter && tray.flockGroupId !== groupFilter) return false;
      if (!q) return true;
      const haystack = [
        tray.flockGroupTitle,
        tray.speciesLabel,
        tray.breedLabel,
        tray.varietyLabel
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [trays, searchQuery, groupFilter]);

  // Lista de grupos pro dropdown: prefere os que ja tem bandeja na prateleira
  // (ordenado), com fallback pros demais cadastrados pra possibilitar pre-filtro
  // mesmo sem bandeja ainda.
  const dropdownGroups = useMemo(() => {
    const fromTrays = new Map<string, string>();
    for (const t of trays) {
      if (t.flockGroupId && t.flockGroupTitle) fromTrays.set(t.flockGroupId, t.flockGroupTitle);
    }
    const fromCatalog = flockGroups.map((g) => ({ id: g.id, title: g.title }));
    const merged = new Map<string, string>(fromTrays);
    for (const g of fromCatalog) if (!merged.has(g.id)) merged.set(g.id, g.title);
    return Array.from(merged, ([id, title]) => ({ id, title })).sort((a, b) =>
      a.title.localeCompare(b.title, "pt-BR")
    );
  }, [trays, flockGroups]);

  const saleSubtotal = useMemo(() => {
    if (selectionMode !== "sale") return 0;
    return Array.from(selection.values()).reduce((s, it) => s + (it.quantity || 0) * (it.unitPrice || 0), 0);
  }, [selection, selectionMode]);
  const saleTotal = saleSubtotal + (saleDeliveryType === "DELIVERY" ? (saleShippingFee || 0) : 0);

  function clearSelection() {
    setSelection(new Map());
    setSelectionMode(null);
  }

  // Carrinho incremental: cada clique no icone ADICIONA 1 ovo na selecao.
  // Antes adicionava TODOS os ovos disponiveis e o user tinha que abrir o
  // modal pra subtrair — fluxo dificil de lembrar quando tem muitos ovos.
  // Agora cliques sucessivos no mesmo icone incrementam +1 (ate o
  // available). O botao [-] na celula -/+/numero (ou no balde lateral)
  // decrementa. Mode locking continua: so 1 modo ativo por vez.
  function handleEntryAction(entry: TrayEntry, tray: Tray, mode: NonNullable<SelectionMode>) {
    if (entry.available <= 0) return;

    // Se ja tem itens selecionados em outro modo, ignora — visualmente o
    // icone aparece desabilitado, mas garantia extra aqui.
    if (selectionMode && selectionMode !== mode) return;

    setSelection((prev) => {
      const next = new Map(prev);
      const existing = next.get(entry.id);
      if (existing) {
        // Incrementa +1, capado em available
        const newQty = Math.min(existing.available, existing.quantity + 1);
        next.set(entry.id, { ...existing, quantity: newQty });
      } else {
        // Pre-preenche unitPrice da tabela de precos por raca (modo "sale").
        // Pra outros modos (transfer/discard) deixa 0 — campo nao eh usado.
        const presetPrice =
          mode === "sale" && tray.flockGroupId
            ? (eggPrices.get(tray.flockGroupId) ?? 0)
            : 0;
        next.set(entry.id, {
          entryId: entry.id,
          trayId: tray.id,
          trayLabel: trayHeader(tray),
          trayHasFlockGroup: Boolean(tray.flockGroupId),
          quantity: 1,
          available: entry.available,
          unitPrice: presetPrice
        });
      }
      return next;
    });

    if (selectionMode !== mode) setSelectionMode(mode);
    setError(null);
  }

  // Decrementa 1 ovo da selecao. Quando chega a 0, remove o entry inteiro.
  // Se foi o ultimo entry da selecao, libera o mode tambem.
  function decrementEntry(entryId: string) {
    setSelection((prev) => {
      const next = new Map(prev);
      const existing = next.get(entryId);
      if (!existing) return next;
      if (existing.quantity <= 1) {
        next.delete(entryId);
      } else {
        next.set(entryId, { ...existing, quantity: existing.quantity - 1 });
      }
      if (next.size === 0) setSelectionMode(null);
      return next;
    });
  }

  // Incrementa 1 ovo direto pelo balde lateral (sem precisar voltar pra
  // celula da bandeja). Usado nos botoes + do panel suspenso.
  function incrementEntry(entryId: string) {
    setSelection((prev) => {
      const next = new Map(prev);
      const existing = next.get(entryId);
      if (!existing) return next;
      const newQty = Math.min(existing.available, existing.quantity + 1);
      next.set(entryId, { ...existing, quantity: newQty });
      return next;
    });
  }

  // Abre o modal de finalizacao com os campos default preenchidos.
  // Acionado pelo botao "Finalizar" da barra de carrinho.
  function openFinalizeModal() {
    if (selection.size === 0 || !selectionMode) return;
    if (selectionMode === "sale") {
      setSaleCustomer("");
      setSaleSoldAt(today);
      setSalePaymentMethod("PIX");
      setSaleDeliveryType("PICKUP");
      setSaleShippingFee(0);
      setSaleNotes("");
    } else if (selectionMode === "transfer") {
      setTransferIncubatorId(incubators.find((i) => i.status === "ACTIVE")?.id ?? "");
      setTransferNotes("");
    } else {
      setDiscardNotes("");
    }
    setError(null);
    setShowFinalizeModal(true);
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

  async function submitFinalize(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const items = Array.from(selection.values()).filter((it) => it.quantity > 0);
      if (items.length === 0) {
        setError("Nenhum item valido para enviar.");
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
            paymentMethod: salePaymentMethod,
            shippingFee:
              saleDeliveryType === "DELIVERY" && saleShippingFee > 0 ? saleShippingFee : undefined,
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
          setError(
            `Bandeja "${externalIssue.trayLabel}" e externa sem grupo do plantel. Edite o cadastro antes de incubar.`
          );
          return;
        }
        if (!transferIncubatorId) {
          setError("Selecione a chocadeira.");
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
        return;
      }

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "Falha ao processar.");
        return;
      }

      setShowFinalizeModal(false);
      clearSelection();
      await loadData();
    } catch (err) {
      // Captura network errors / aborts / fetch exceptions — antes o
      // botao ficava preso em "Salvando..." se o fetch jogasse erro
      // (ex: timeout serverless, perda de conexao).
      console.error("submitFinalize falhou", err);
      setError(
        err instanceof Error
          ? `Erro ao salvar: ${err.message}. Tente novamente.`
          : "Erro inesperado ao salvar. Tente novamente."
      );
    } finally {
      setSaving(false);
    }
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
    const emoji = mode === "sale" ? "🛒" : mode === "transfer" ? "🐣" : "🗑️";
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${palette}`} aria-label={title} title={title}>
        <span className="text-xs leading-none" aria-hidden>{emoji}</span>
      </button>
    );
  }

  return (
    <main className="space-y-5 pb-32 sm:space-y-6">
      <PageTitle
        icon="🪺"
        title="Prateleira"
        description="Ovos coletados aguardando destino: venda ou chocadeira. Toque 🛒 / 🐣 / 🗑️ pra adicionar 1 ovo ao balde lateral; use − e + pra ajustar a quantidade. Finalize tudo numa operação só."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={() => setShowPriceModal(true)}>
          💰 Tabela de preços
        </Button>
        <span className="text-xs text-zinc-500">
          Pré-fixe o preço do ovo por raça pra economizar tempo na venda
        </span>
      </div>

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

      {!loading && trays.length > 0 ? (
        <Card className="bg-white/90">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="🔎 Buscar por raça, espécie ou variedade..."
              />
            </div>
            <div className="md:w-72">
              <select
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value)}
                className="h-11 w-full rounded-2xl border border-[color:var(--line)] bg-white px-3 text-sm text-zinc-700 shadow-sm focus:border-[color:var(--brand)] focus:outline-none"
              >
                <option value="">Todos os grupos</option>
                {dropdownGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
            {searchQuery || groupFilter ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setGroupFilter("");
                }}
                className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Limpar
              </button>
            ) : null}
          </div>
          {searchQuery || groupFilter ? (
            <p className="mt-3 text-xs text-zinc-500">
              Mostrando <span className="font-semibold text-zinc-800">{visibleTrays.length}</span> de {trays.length}{" "}
              bandejas.
            </p>
          ) : null}
        </Card>
      ) : null}

      {!loading && trays.length > 0 && visibleTrays.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-500">
            Nenhuma bandeja casa com esse filtro. Ajuste a busca ou escolha outro grupo.
          </p>
        </Card>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleTrays.map((tray) => {
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
                  // Barra mostra IDADE do ovo (% do tempo de validade decorrido).
                  // Verde quando novo, amarela conforme se aproxima do vencimento, vermelha vencido.
                  const entryDateMs = new Date(entry.entryDate).getTime();
                  const expiresAtMs = new Date(entry.expiresAt).getTime();
                  const totalMs = Math.max(1, expiresAtMs - entryDateMs);
                  const elapsedMs = Date.now() - entryDateMs;
                  const ageProgress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
                  const progress = ageProgress;
                  return (
                    <div key={entry.id} className="rounded-lg border border-white bg-white/80 p-2">
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
                          {(() => {
                            const selectedItem = selection.get(entry.id);
                            const inBasket = Boolean(selectedItem);
                            // Quando esta no carrinho, troca os 3 icones por
                            // um controle compacto [- N +] na cor do modo.
                            if (inBasket && selectionMode) {
                              const modeColor =
                                selectionMode === "sale"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : selectionMode === "transfer"
                                    ? "bg-amber-100 text-amber-800 border-amber-300"
                                    : "bg-rose-100 text-rose-800 border-rose-300";
                              const btnBase =
                                "inline-flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40";
                              const atMax = selectedItem!.quantity >= entry.available;
                              return (
                                <div className={`inline-flex items-center gap-0.5 rounded-lg border px-1 py-0.5 ${modeColor}`}>
                                  <button
                                    type="button"
                                    aria-label="Remover 1 ovo"
                                    onClick={() => decrementEntry(entry.id)}
                                    className={btnBase}
                                  >
                                    −
                                  </button>
                                  <span className="min-w-[1.5rem] text-center text-xs font-semibold">
                                    {selectedItem!.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    aria-label="Adicionar 1 ovo"
                                    onClick={() => handleEntryAction(entry, tray, selectionMode)}
                                    disabled={atMax}
                                    className={btnBase}
                                  >
                                    +
                                  </button>
                                </div>
                              );
                            }
                            return (
                              <>
                                <ActionIcon
                                  mode="sale"
                                  selected={false}
                                  disabled={
                                    entry.available <= 0 ||
                                    (selectionMode !== null && selectionMode !== "sale")
                                  }
                                  onClick={() => handleEntryAction(entry, tray, "sale")}
                                  title="Adicionar 1 ovo ao carrinho de venda"
                                />
                                <ActionIcon
                                  mode="transfer"
                                  selected={false}
                                  disabled={
                                    entry.available <= 0 ||
                                    (selectionMode !== null && selectionMode !== "transfer")
                                  }
                                  onClick={() => handleEntryAction(entry, tray, "transfer")}
                                  title="Adicionar 1 ovo pra chocadeira"
                                />
                                <ActionIcon
                                  mode="discard"
                                  selected={false}
                                  disabled={
                                    entry.available <= 0 ||
                                    (selectionMode !== null && selectionMode !== "discard")
                                  }
                                  onClick={() => handleEntryAction(entry, tray, "discard")}
                                  title="Adicionar 1 ovo ao descarte"
                                />
                              </>
                            );
                          })()}
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
        onClose={() => { setShowFinalizeModal(false); clearSelection(); }}
      >
        <form className="grid gap-3" onSubmit={submitFinalize}>
          {selectionMode === "sale" ? (
            <div className="grid gap-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input placeholder="Cliente (opcional)" value={saleCustomer} onChange={(e) => setSaleCustomer(e.target.value)} />
                <Input type="date" value={saleSoldAt} onChange={(e) => setSaleSoldAt(e.target.value)} />
              </div>

              {/* Método de pagamento */}
              <div className="grid gap-1.5">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">Pagamento</p>
                <div className="flex gap-2">
                  {(["PIX", "CARD", "CASH"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSalePaymentMethod(m)}
                      className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${
                        salePaymentMethod === m
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                      }`}
                    >
                      {m === "PIX" ? "PIX" : m === "CARD" ? "Cartão" : "Dinheiro"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Entrega ou retirada */}
              <div className="grid gap-1.5">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">Entrega</p>
                <div className="flex gap-2">
                  {(["PICKUP", "DELIVERY"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => { setSaleDeliveryType(d); if (d === "PICKUP") setSaleShippingFee(0); }}
                      className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${
                        saleDeliveryType === d
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                      }`}
                    >
                      {d === "PICKUP" ? "Retirada no sitio" : "Enviado"}
                    </button>
                  ))}
                </div>
              </div>

              {saleDeliveryType === "DELIVERY" ? (
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Taxa de frete (R$)"
                  value={saleShippingFee || ""}
                  onChange={(e) => setSaleShippingFee(Math.max(0, Number(e.target.value)))}
                />
              ) : null}
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
            <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm space-y-1">
              {saleDeliveryType === "DELIVERY" && (saleShippingFee || 0) > 0 ? (
                <>
                  <div className="flex justify-between text-zinc-500">
                    <span>Subtotal</span>
                    <span>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(saleSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Frete</span>
                    <span>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(saleShippingFee)}</span>
                  </div>
                  <div className="border-t border-emerald-200 pt-1 flex justify-between font-semibold text-emerald-800">
                    <span>Total</span>
                    <span>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(saleTotal)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-zinc-600">Total</span>
                  <span className="font-semibold text-emerald-800">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(saleTotal)}
                  </span>
                </div>
              )}
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
            <Button type="button" variant="outline" onClick={() => { setShowFinalizeModal(false); clearSelection(); }}>
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

      {/* Balde suspenso lateral — substitui a barra de baixo. No mobile fica
          no rodape (drawer compacto), no desktop ancora no canto direito
          como painel vertical. Cada item tem -/+ proprios pra refinar a
          quantidade sem voltar pra celula da bandeja. */}
      {selection.size > 0 && selectionMode ? (
        <div
          className={
            "cart-floating-bar fixed bottom-3 left-3 right-3 z-40 flex max-h-[70vh] flex-col rounded-2xl border border-zinc-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] " +
            "md:bottom-auto md:left-auto md:right-3 md:top-1/2 md:w-80 md:-translate-y-1/2 md:max-h-[80vh]"
          }
        >
          {/* Cabecalho do balde */}
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-2xl" aria-hidden>
                {selectionMode === "sale" ? "🛒" : selectionMode === "transfer" ? "🐣" : "🗑️"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {selectionMode === "sale"
                    ? "Venda"
                    : selectionMode === "transfer"
                      ? "Chocadeira"
                      : "Descarte"}
                </p>
                <p className="truncate text-[11px] text-zinc-500">
                  {Array.from(selection.values()).reduce((s, it) => s + it.quantity, 0)} ovo
                  {Array.from(selection.values()).reduce((s, it) => s + it.quantity, 0) === 1 ? "" : "s"}
                  {" · "}
                  {selection.size} {selection.size === 1 ? "item" : "itens"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              Limpar
            </button>
          </div>

          {/* Lista de itens com -/+ por entry (so visivel no desktop;
              no mobile ficaria muito alto, ai ficamos so com totals
              + botao de finalizar) */}
          <div className="hidden flex-1 overflow-y-auto px-3 py-2 md:block">
            <ul className="space-y-1.5">
              {Array.from(selection.values()).map((item) => {
                const modeColor =
                  selectionMode === "sale"
                    ? "border-emerald-200 bg-emerald-50/40"
                    : selectionMode === "transfer"
                      ? "border-amber-200 bg-amber-50/40"
                      : "border-rose-200 bg-rose-50/40";
                return (
                  <li
                    key={item.entryId}
                    className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${modeColor}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-zinc-800">
                        {item.trayLabel}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {item.quantity}/{item.available}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-zinc-200 bg-white px-1 py-0.5">
                      <button
                        type="button"
                        aria-label="Remover 1"
                        onClick={() => decrementEntry(item.entryId)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-sm font-bold text-zinc-700 hover:bg-zinc-100"
                      >
                        −
                      </button>
                      <span className="min-w-[1.25rem] text-center text-xs font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Adicionar 1"
                        onClick={() => incrementEntry(item.entryId)}
                        disabled={item.quantity >= item.available}
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Rodape com botao de finalizar */}
          <div className="border-t border-zinc-100 px-3 py-2">
            <Button type="button" onClick={openFinalizeModal} className="w-full">
              {selectionMode === "sale"
                ? "Finalizar venda"
                : selectionMode === "transfer"
                  ? "Enviar para chocadeira"
                  : "Descartar"}
            </Button>
          </div>
        </div>
      ) : null}

      <EggPriceManager
        open={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        onSaved={() => {
          // Re-carrega trays + precos pra que selecionar bandeja ja pegue
          // o preco novo
          void loadData();
        }}
      />
    </main>
  );
}
