
"use client";

import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteActionButton } from "@/components/ui/delete-action-button";
import { Input } from "@/components/ui/input";
import { AppModal } from "@/components/ui/app-modal";

type Incubator = {
  id: string;
  name: string;
  description: string | null;
  notes: string | null;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
};

type FlockGroup = { id: string; title: string };

type BatchEvent = {
  id: string;
  type: string;
  quantity: number;
  eventDate: string;
  notes: string | null;
};

type Batch = {
  id: string;
  incubatorId: string;
  flockGroupId: string;
  entryDate: string;
  eggsSet: number;
  expectedHatchDate: string | null;
  notes: string | null;
  status: "ACTIVE" | "HATCHED" | "FAILED" | "CANCELED";
  incubator: { id: string; name: string; status: string };
  flockGroup: { id: string; title: string; species?: { name: string } | null };
  events: BatchEvent[];
  stats: {
    hatched: number;
    infertile: number;
    embryoLoss: number;
    pippedDied: number;
    inProgress: number;
    hatchRate: number;
    infertilityRate: number;
    embryoLossRate: number;
    pippedDiedRate: number;
  };
};

type LotGroup = {
  key: string;
  lotCode: string | null;
  entryDate: string;
  status: Batch["status"];
  incubatorName: string;
  lines: Batch[];
};

type Metrics = {
  summary: {
    activeIncubators: number;
    activeBatches: number;
    finalizedBatches: number;
    hatchRate: number;
    infertilityRate: number;
    embryoLossRate: number;
    pippedDiedRate: number;
  };
  performanceByIncubator: Array<{ label: string; hatchRate: number; infertilityRate: number }>;
};

type DeviceForm = {
  name: string;
  capacityEggs: number;
  notes: string;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
};

type BatchForm = {
  incubatorId: string;
  entryDate: string;
  lockdownDate: string;
  expectedHatchDate: string;
  notes: string;
  status: "ACTIVE" | "HATCHED" | "FAILED" | "CANCELED";
};

type BatchSourceLine = {
  lineId: string;
  flockGroupId: string;
  eggsSet: number;
};

type EventForm = {
  batchId: string;
  type: "HATCHED" | "INFERTILE" | "EMBRYO_LOSS" | "PIPPED_DIED" | "IN_PROGRESS" | "OTHER";
  quantity: number;
  eventDate: string;
  notes: string;
};

const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

const emptyDevice: DeviceForm = { name: "", capacityEggs: 0, notes: "", status: "ACTIVE" };
const emptyBatch: BatchForm = {
  incubatorId: "",
  entryDate: today,
  lockdownDate: "",
  expectedHatchDate: "",
  notes: "",
  status: "ACTIVE"
};
const emptyEvent: EventForm = { batchId: "", type: "HATCHED", quantity: 0, eventDate: today, notes: "" };

function formatPercent(v: number) {
  return `${v.toFixed(2)}%`;
}

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(base: string, days: number) {
  const [year, month, day] = base.split("-").map(Number);
  const d = new Date(year, (month || 1) - 1, day || 1);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseCapacityFromDescription(description: string | null) {
  if (!description) return 0;
  const match = description.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

type SpeciesIncubationRule = { label: string; days: number; keywords: string[] };

const SPECIES_INCUBATION_RULES: SpeciesIncubationRule[] = [
  { label: "Galinha", days: 21, keywords: ["galinha"] },
  { label: "Codorna", days: 18, keywords: ["codorna", "quail"] },
  { label: "Faisao", days: 27, keywords: ["faisao", "pheasant"] },
  { label: "Pavao", days: 28, keywords: ["pavao", "peafowl", "peacock"] },
  { label: "Peru", days: 28, keywords: ["peru", "turkey"] },
  { label: "Pato", days: 28, keywords: ["pato", "duck"] },
  { label: "Marreco mandarim", days: 29, keywords: ["mandarim", "mandarin"] },
  { label: "Marreco carolina", days: 30, keywords: ["carolina", "wood duck"] },
  { label: "Marreco", days: 28, keywords: ["marreco"] },
  { label: "Ganso", days: 30, keywords: ["ganso", "goose"] },
  { label: "Cisne", days: 36, keywords: ["cisne", "swan"] },
  { label: "Avestruz", days: 42, keywords: ["avestruz", "ostrich"] },
  { label: "Emu", days: 52, keywords: ["emu"] }
];

function normalizeSpeciesText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function inferSpeciesRuleFromText(text: string) {
  const normalized = normalizeSpeciesText(text);
  const found = SPECIES_INCUBATION_RULES.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)));
  return found ?? { label: "Especie nao informada", days: 21, keywords: [] };
}

function toDateStart(value: string) {
  const parsed = new Date(value);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function addDaysToDate(base: Date, days: number) {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getDaysUntil(targetDate: Date) {
  const todayDate = new Date();
  const todayStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
  return Math.max(0, Math.ceil((targetDate.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000)));
}

const LOT_MARKER_REGEX = /\[LOT:(.+?)\]/i;

function extractLotCode(notes: string | null | undefined) {
  if (!notes) return null;
  const match = notes.match(LOT_MARKER_REGEX);
  return match?.[1]?.trim() || null;
}

function stripLotMetadata(notes: string | null | undefined) {
  if (!notes) return "";
  return notes.replace(LOT_MARKER_REGEX, "").replace(/\s{2,}/g, " ").trim();
}

function withLotMetadata(notes: string, lotCode: string | null) {
  const cleanNotes = stripLotMetadata(notes);
  if (!lotCode) return cleanNotes;
  const marker = `[LOT:${lotCode}]`;
  return cleanNotes ? `${cleanNotes} ${marker}` : marker;
}

function batchStatusLabel(status: Batch["status"]) {
  if (status === "ACTIVE") return "Ativo";
  if (status === "HATCHED") return "Finalizado com eclosao";
  if (status === "FAILED") return "Falhou";
  return "Cancelado";
}

export function IncubatorsManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [devices, setDevices] = useState<Incubator[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [flockGroups, setFlockGroups] = useState<FlockGroup[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const [deviceForm, setDeviceForm] = useState<DeviceForm>(emptyDevice);
  const [batchForm, setBatchForm] = useState<BatchForm>(emptyBatch);
  const [batchLines, setBatchLines] = useState<BatchSourceLine[]>([{ lineId: "line-1", flockGroupId: "", eggsSet: 1 }]);
  const [eventForm, setEventForm] = useState<EventForm>(emptyEvent);
  const [batchFilter, setBatchFilter] = useState<"ACTIVE" | "FINALIZED">("ACTIVE");

  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editingBatchLotCode, setEditingBatchLotCode] = useState<string | null>(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const activeBatches = useMemo(() => batches.filter((batch) => batch.status === "ACTIVE"), [batches]);
  const finalizedBatches = useMemo(() => batches.filter((batch) => batch.status !== "ACTIVE"), [batches]);
  const visibleBatches = batchFilter === "ACTIVE" ? activeBatches : finalizedBatches;
  const lotGroups = useMemo(() => {
    const groups = new Map<string, LotGroup>();

    for (const batch of visibleBatches) {
      const lotCode = extractLotCode(batch.notes);
      const fallbackKey = `legacy:${batch.incubatorId}:${toDateInput(batch.entryDate)}:${batch.status}:${stripLotMetadata(batch.notes)}`;
      const key = lotCode ? `code:${lotCode}` : fallbackKey;
      const existing = groups.get(key);
      if (existing) {
        existing.lines.push(batch);
        continue;
      }
      groups.set(key, {
        key,
        lotCode,
        entryDate: batch.entryDate,
        status: batch.status,
        incubatorName: batch.incubator.name,
        lines: [batch]
      });
    }

    return Array.from(groups.values()).sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
  }, [visibleBatches]);

  const totalBatchEggs = useMemo(
    () => batchLines.reduce((sum, line) => sum + (Number.isFinite(line.eggsSet) ? line.eggsSet : 0), 0),
    [batchLines]
  );
  const selectedEventBatch = useMemo(
    () => activeBatches.find((batch) => batch.id === eventForm.batchId) ?? null,
    [activeBatches, eventForm.batchId]
  );
  const maxEventQuantity = selectedEventBatch?.eggsSet ?? 0;

  const incubatorStats = useMemo(() => {
    return devices.map((device) => {
      const byDevice = batches.filter((batch) => batch.incubatorId === device.id);
      const activeByDevice = byDevice.filter((batch) => batch.status === "ACTIVE");
      const totalEggs = byDevice.reduce((sum, batch) => sum + batch.eggsSet, 0);
      const hatched = byDevice.reduce((sum, batch) => sum + batch.stats.hatched, 0);
      const active = activeByDevice.length;

      const speciesMap = new Map<
        string,
        { species: string; eggs: number; remainingDays: number; hatchDate: Date; lineCount: number }
      >();
      for (const batch of activeByDevice) {
        const speciesName = batch.flockGroup.species?.name?.trim() || "";
        const rule = inferSpeciesRuleFromText(speciesName || batch.flockGroup.title);
        const speciesLabel = speciesName || rule.label;
        const speciesKey = normalizeSpeciesText(speciesLabel);
        const entryDate = toDateStart(batch.entryDate);
        const hatchDate = addDaysToDate(entryDate, rule.days);
        const remainingDays = getDaysUntil(hatchDate);
        const existing = speciesMap.get(speciesKey);
        if (existing) {
          existing.eggs += batch.eggsSet;
          existing.lineCount += 1;
          if (remainingDays < existing.remainingDays) {
            existing.remainingDays = remainingDays;
            existing.hatchDate = hatchDate;
          }
          continue;
        }
        speciesMap.set(speciesKey, {
          species: speciesLabel,
          eggs: batch.eggsSet,
          remainingDays,
          hatchDate,
          lineCount: 1
        });
      }

      const speciesCountdowns = Array.from(speciesMap.values())
        .sort((a, b) => a.remainingDays - b.remainingDays || b.eggs - a.eggs)
        .map((item) => ({
          ...item,
          hatchDateLabel: item.hatchDate.toLocaleDateString("pt-BR")
        }));

      return {
        ...device,
        active,
        hatched,
        hatchRate: totalEggs ? (hatched / totalEggs) * 100 : 0,
        speciesCountdowns
      };
    });
  }, [batches, devices]);

  async function loadData() {
    setLoading(true);
    setError(null);

    const [deviceRes, metricRes] = await Promise.all([
      fetch("/api/incubators/devices", { cache: "no-store" }),
      fetch("/api/incubators/metrics", { cache: "no-store" })
    ]);

    if (!deviceRes.ok || !metricRes.ok) {
      setError("Nao foi possivel carregar os dados de chocadeiras.");
      setLoading(false);
      return;
    }

    const deviceData = (await deviceRes.json()) as { incubators: Incubator[]; batches: Batch[]; flockGroups: FlockGroup[] };
    const metricData = (await metricRes.json()) as Metrics;

    setDevices(deviceData.incubators);
    setBatches(deviceData.batches);
    setFlockGroups(deviceData.flockGroups);
    setMetrics(metricData);

    if (!batchForm.incubatorId && deviceData.incubators.length > 0) {
      setBatchForm((prev) => ({ ...prev, incubatorId: deviceData.incubators[0].id }));
    }
    if (!batchLines[0]?.flockGroupId && deviceData.flockGroups.length > 0) {
      setBatchLines([{ lineId: `line-${Date.now()}`, flockGroupId: deviceData.flockGroups[0].id, eggsSet: 1 }]);
    }
    if (!eventForm.batchId && deviceData.batches.length > 0) {
      setEventForm((prev) => ({ ...prev, batchId: deviceData.batches[0].id }));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!batchForm.entryDate && !batchForm.lockdownDate) return;
    const expected = batchForm.lockdownDate
      ? addDays(batchForm.lockdownDate, 3)
      : addDays(batchForm.entryDate, 21);
    setBatchForm((prev) => ({ ...prev, expectedHatchDate: expected }));
  }, [batchForm.entryDate, batchForm.lockdownDate]);

  async function saveDevice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const endpoint = editingDeviceId ? `/api/incubators/devices/${editingDeviceId}` : "/api/incubators/devices";
    const method = editingDeviceId ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: deviceForm.name,
        description: deviceForm.capacityEggs > 0 ? `Capacidade: ${deviceForm.capacityEggs} ovos` : "",
        notes: deviceForm.notes,
        status: deviceForm.status
      })
    });

    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      setError(payload.error ?? "Falha ao salvar chocadeira.");
      setSaving(false);
      return;
    }

    setShowDeviceModal(false);
    setEditingDeviceId(null);
    setDeviceForm(emptyDevice);
    setSaving(false);
    await loadData();
  }

  async function removeDevice(id: string) {
    if (!window.confirm("Excluir chocadeira?")) return;
    const res = await fetch(`/api/incubators/devices/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Nao foi possivel excluir a chocadeira.");
      return;
    }
    await loadData();
  }

  async function saveBatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    if (editingBatchId) {
      const line = batchLines[0];
      if (!line?.flockGroupId) {
        setError("Selecione um grupo de ave.");
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/incubators/batches/${editingBatchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incubatorId: batchForm.incubatorId,
          flockGroupId: line.flockGroupId,
          entryDate: batchForm.entryDate,
          eggsSet: line.eggsSet,
          expectedHatchDate: batchForm.expectedHatchDate,
          notes: withLotMetadata(batchForm.notes, editingBatchLotCode),
          status: batchForm.status
        })
      });

      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        setError(payload.error ?? "Falha ao atualizar lote.");
        setSaving(false);
        return;
      }
    } else {
      const lines = batchLines.filter((line) => line.flockGroupId && line.eggsSet > 0);
      if (!lines.length) {
        setError("Adicione pelo menos uma ave com ovos.");
        setSaving(false);
        return;
      }

      const numericLotCodes = batches
        .map((batch) => extractLotCode(batch.notes))
        .map((code) => (code ? Number(code) : NaN))
        .filter((value) => Number.isFinite(value) && value > 0);
      const nextLotCode = String(numericLotCodes.length ? Math.max(...numericLotCodes) + 1 : 1);

      for (const line of lines) {
        const res = await fetch("/api/incubators/batches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            incubatorId: batchForm.incubatorId,
            flockGroupId: line.flockGroupId,
            entryDate: batchForm.entryDate,
            eggsSet: line.eggsSet,
            expectedHatchDate: batchForm.expectedHatchDate,
            notes: withLotMetadata(batchForm.notes, nextLotCode),
            status: batchForm.status
          })
        });

        if (!res.ok) {
          const payload = (await res.json()) as { error?: string };
          setError(payload.error ?? "Falha ao criar lote.");
          setSaving(false);
          return;
        }
      }
    }

    setBatchForm((prev) => ({ ...emptyBatch, incubatorId: prev.incubatorId, entryDate: today }));
    setBatchLines([{ lineId: `line-${Date.now()}`, flockGroupId: flockGroups[0]?.id ?? "", eggsSet: 1 }]);
    setEditingBatchId(null);
    setEditingBatchLotCode(null);
    setShowBatchModal(false);
    setSaving(false);
    await loadData();
  }

  async function removeBatch(id: string) {
    if (!window.confirm("Excluir lote?")) return;
    const res = await fetch(`/api/incubators/batches/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Nao foi possivel excluir o lote.");
      return;
    }
    await loadData();
  }

  function openEventModalForIncubator(incubatorId: string) {
    const firstActiveBatch = activeBatches.find((batch) => batch.incubatorId === incubatorId) ?? null;
    if (!firstActiveBatch) {
      setError("Essa chocadeira nao tem lote ativo para registrar evento.");
      return;
    }
    setError(null);
    setEventForm((prev) => ({ ...prev, batchId: firstActiveBatch.id }));
    setShowEventModal(true);
  }

  async function createEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    if (maxEventQuantity > 0 && eventForm.quantity > maxEventQuantity) {
      setError(`Quantidade invalida. O lote tem no maximo ${maxEventQuantity} ovos.`);
      setSaving(false);
      return;
    }

    const res = await fetch(`/api/incubators/batches/${eventForm.batchId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: eventForm.type,
        quantity: eventForm.quantity,
        eventDate: eventForm.eventDate,
        notes: eventForm.notes
      })
    });

    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      setError(payload.error ?? "Falha ao registrar evento.");
      setSaving(false);
      return;
    }

    setEventForm((prev) => ({ ...emptyEvent, batchId: prev.batchId }));
    setShowEventModal(false);
    setSaving(false);
    await loadData();
  }

  function addBatchLine() {
    setBatchLines((prev) => [...prev, { lineId: `line-${Date.now()}-${prev.length}`, flockGroupId: flockGroups[0]?.id ?? "", eggsSet: 1 }]);
  }

  function removeBatchLine(lineId: string) {
    setBatchLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((line) => line.lineId !== lineId);
    });
  }

  function updateBatchLine(lineId: string, patch: Partial<BatchSourceLine>) {
    setBatchLines((prev) => prev.map((line) => (line.lineId === lineId ? { ...line, ...patch } : line)));
  }

  return (
    <main className="space-y-6">
      <PageTitle
        title="Chocadeiras"
        description="Layout moderno para maquinas, lotes e eventos de incubacao."
        icon="🐣"
      />

      {error && !(showDeviceModal || showBatchModal || showEventModal) ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : null}

      <section className="mobile-kpi-grid grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">🐣 Ativas</p><p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.activeIncubators ?? 0}</p></Card>
        <Card><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">🥚 Lotes ativos</p><p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.activeBatches ?? 0}</p></Card>
        <Card><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">📦 Finalizados</p><p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.finalizedBatches ?? 0}</p></Card>
        <Card><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">📈 Taxa eclosao</p><p className="mt-2 text-2xl font-semibold text-zinc-900">{formatPercent(metrics?.summary.hatchRate ?? 0)}</p></Card>
      </section>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Painel de chocadeiras</h3>
            <p className="text-sm text-zinc-500">Cards por maquina e registro separado entre lotes ativos e inativos.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => { setEditingDeviceId(null); setDeviceForm(emptyDevice); setShowDeviceModal(true); }}>Nova chocadeira</Button>
            <Button type="button" variant="outline" onClick={() => { setEditingBatchId(null); setShowBatchModal(true); }}>Novo lote</Button>
            <Button type="button" variant="outline" onClick={() => setShowEventModal(true)}>Registrar evento</Button>
          </div>
        </div>
      </Card>

      <section className="grid gap-3 md:grid-cols-2">
        {loading ? <Card><p className="text-sm text-zinc-500">Carregando chocadeiras...</p></Card> : null}
        {!loading && incubatorStats.length === 0 ? <Card><p className="text-sm text-zinc-500">Nenhuma chocadeira cadastrada.</p></Card> : null}
        {!loading && incubatorStats.map((device) => (
          <Card key={device.id} className="border border-amber-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="relative mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-base">
                  <span>{device.active > 0 ? "♨️" : "🥚"}</span>
                  {device.active > 0 ? <span className="absolute -top-1 -right-1 text-[10px] animate-bounce">💨</span> : null}
                </div>
                <div>
                  <p className="text-lg font-semibold text-zinc-900">{device.name}</p>
                  <p className="text-sm text-zinc-500">
                    {parseCapacityFromDescription(device.description) > 0
                      ? `Capacidade: ${parseCapacityFromDescription(device.description)} ovos`
                      : "Capacidade nao informada"}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-400">Status: {batchStatusLabel(device.status as Batch["status"])}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setEditingDeviceId(device.id);
                    setDeviceForm({
                      name: device.name,
                      capacityEggs: parseCapacityFromDescription(device.description),
                      notes: device.notes ?? "",
                      status: device.status
                    });
                    setShowDeviceModal(true);
                  }}
                >
                  Editar
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  disabled={device.active === 0}
                  onClick={() => openEventModalForIncubator(device.id)}
                >
                  Evento
                </Button>
                <DeleteActionButton iconOnly onClick={() => removeDevice(device.id)} aria-label="Excluir chocadeira" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-zinc-50 p-3 text-sm">
              <div><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Chocagens</p><p className="text-xl font-semibold text-zinc-900">{device.active}</p></div>
              <div><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Nascidos</p><p className="text-xl font-semibold text-zinc-900">{device.hatched}</p></div>
              <div><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Taxa</p><p className="text-xl font-semibold text-zinc-900">{formatPercent(device.hatchRate)}</p></div>
            </div>
            {device.speciesCountdowns.length > 0 ? (
              <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Contagem por especie</p>
                <div className="mt-2 space-y-2">
                  {device.speciesCountdowns.slice(0, 6).map((item) => (
                    <div key={`${device.id}-${item.species}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                      <p className="truncate text-sm font-medium text-zinc-800">{item.species}</p>
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">{item.eggs} ovos</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                        {item.remainingDays === 0 ? "Eclodindo" : `${item.remainingDays}d`}
                      </span>
                      <p className="col-span-3 text-[11px] text-zinc-500">Eclosao prevista: {item.hatchDateLabel}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>
        ))}
      </section>

      <section>
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-zinc-900">Registro de lotes</h3>
            <div className="rounded-full bg-zinc-100 p-1 text-xs">
              <button type="button" className={`rounded-full px-3 py-1 ${batchFilter === "ACTIVE" ? "bg-white text-zinc-900 shadow" : "text-zinc-500"}`} onClick={() => setBatchFilter("ACTIVE")}>Ativos ({activeBatches.length})</button>
              <button type="button" className={`rounded-full px-3 py-1 ${batchFilter === "FINALIZED" ? "bg-white text-zinc-900 shadow" : "text-zinc-500"}`} onClick={() => setBatchFilter("FINALIZED")}>Inativos ({finalizedBatches.length})</button>
            </div>
          </div>

          <div className="mt-3 grid gap-3">
            {lotGroups.length === 0 ? <p className="text-sm text-zinc-500">Nenhum lote nesse filtro.</p> : null}
            {lotGroups.map((lot, lotIndex) => (
              <div key={lot.key} className="rounded-2xl border border-zinc-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Lote #{lot.lotCode ?? lotGroups.length - lotIndex}</p>
                    <p className="text-xs text-zinc-500">{lot.incubatorName} | Entrada: {new Date(lot.entryDate).toLocaleDateString("pt-BR")}</p>
                    <p className="text-xs text-zinc-500">Status: {batchStatusLabel(lot.status)}</p>
                  </div>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                        <th className="w-[22%] py-2 pr-2 text-left font-semibold">Especie</th>
                        <th className="w-[11%] py-2 px-1 text-center font-semibold">Ovos</th>
                        <th className="w-[11%] py-2 px-1 text-center font-semibold">Nascidos</th>
                        <th className="w-[11%] py-2 px-1 text-center font-semibold">Infertis</th>
                        <th className="w-[14%] py-2 px-1 text-center font-semibold">Nao desenvolveu</th>
                        <th className="w-[14%] py-2 px-1 text-center font-semibold">Morreu na casca</th>
                        <th className="w-[17%] py-2 pl-2 text-center font-semibold">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lot.lines.map((batch) => (
                        <tr key={batch.id} className="border-b border-zinc-100 last:border-b-0">
                          <td className="py-2 pr-2 text-zinc-900">{batch.flockGroup.title}</td>
                          <td className="py-2 px-1 text-center font-semibold text-zinc-900">{batch.eggsSet}</td>
                          <td className="py-2 px-1 text-center text-zinc-900">{batch.stats.hatched}</td>
                          <td className="py-2 px-1 text-center text-zinc-900">{batch.stats.infertile}</td>
                          <td className="py-2 px-1 text-center text-zinc-900">{batch.stats.embryoLoss}</td>
                          <td className="py-2 px-1 text-center text-zinc-900">{batch.stats.pippedDied}</td>
                          <td className="py-2 pl-2">
                            <div className="flex items-center justify-center gap-2">
                              <Button variant="outline" type="button" onClick={() => {
                                setEditingBatchId(batch.id);
                                setEditingBatchLotCode(extractLotCode(batch.notes));
                                setBatchForm({
                                  incubatorId: batch.incubatorId,
                                  entryDate: toDateInput(batch.entryDate),
                                  lockdownDate: "",
                                  expectedHatchDate: toDateInput(batch.expectedHatchDate),
                                  notes: stripLotMetadata(batch.notes),
                                  status: batch.status
                                });
                                setBatchLines([{ lineId: `line-${Date.now()}`, flockGroupId: batch.flockGroupId, eggsSet: batch.eggsSet }]);
                                setShowBatchModal(true);
                              }}>
                                Editar
                              </Button>
                              <DeleteActionButton iconOnly onClick={() => removeBatch(batch.id)} aria-label="Excluir linha do lote" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <AppModal open={showDeviceModal} title={editingDeviceId ? "Editar chocadeira" : "Nova chocadeira"} error={error} onClose={() => { setShowDeviceModal(false); setEditingDeviceId(null); setDeviceForm(emptyDevice); }}>
        <form className="grid gap-3" onSubmit={saveDevice}>
          <Input placeholder="Nome da chocadeira" value={deviceForm.name} onChange={(e) => setDeviceForm((p) => ({ ...p, name: e.target.value }))} />
          <Input type="number" min={1} placeholder="Capacidade de ovos" value={deviceForm.capacityEggs || ""} onChange={(e) => setDeviceForm((p) => ({ ...p, capacityEggs: Number(e.target.value) || 0 }))} />
          <Input placeholder="Observacoes" value={deviceForm.notes} onChange={(e) => setDeviceForm((p) => ({ ...p, notes: e.target.value }))} />
          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={deviceForm.status} onChange={(e) => setDeviceForm((p) => ({ ...p, status: e.target.value as DeviceForm["status"] }))}>
            <option value="ACTIVE">Ativa</option><option value="INACTIVE">Inativa</option><option value="MAINTENANCE">Manutencao</option>
          </select>
          <div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingDeviceId ? "Atualizar" : "Cadastrar"}</Button><Button type="button" variant="outline" onClick={() => { setShowDeviceModal(false); setEditingDeviceId(null); setDeviceForm(emptyDevice); }}>Cancelar</Button></div>
        </form>
      </AppModal>

      <AppModal open={showBatchModal} title={editingBatchId ? "Editar lote" : "Novo lote"} error={error} onClose={() => { setShowBatchModal(false); setEditingBatchId(null); setEditingBatchLotCode(null); }}>
        <form className="grid gap-3" onSubmit={saveBatch}>
          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={batchForm.incubatorId} onChange={(e) => setBatchForm((p) => ({ ...p, incubatorId: e.target.value }))}>
            <option value="">Selecione a chocadeira</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
          </select>
          <div className="grid gap-2">
            <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Aves no lote</p>
            {batchLines.map((line, index) => (
              <div key={line.lineId} className="grid grid-cols-12 gap-2">
                <select className="col-span-7 h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={line.flockGroupId} onChange={(e) => updateBatchLine(line.lineId, { flockGroupId: e.target.value })}>
                  <option value="">Selecione a ave/grupo</option>{flockGroups.map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}
                </select>
                <Input className="col-span-3" type="number" min={1} value={line.eggsSet} onChange={(e) => updateBatchLine(line.lineId, { eggsSet: Number(e.target.value) || 0 })} placeholder="Ovos" />
                <Button type="button" variant="outline" className="col-span-2" onClick={() => removeBatchLine(line.lineId)} disabled={batchLines.length <= 1 && index === 0}>Remover</Button>
              </div>
            ))}
            {!editingBatchId ? <Button type="button" variant="outline" onClick={addBatchLine}>+ Adicionar ave</Button> : null}
            <p className="text-sm font-medium text-zinc-700">Total de ovos no lote: {totalBatchEggs}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input type="date" value={batchForm.entryDate} onChange={(e) => setBatchForm((p) => ({ ...p, entryDate: e.target.value }))} />
            <Input type="date" value={batchForm.lockdownDate} onChange={(e) => setBatchForm((p) => ({ ...p, lockdownDate: e.target.value }))} />
          </div>
          <Input placeholder="Observacoes do lote" value={batchForm.notes} onChange={(e) => setBatchForm((p) => ({ ...p, notes: e.target.value }))} />
          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={batchForm.status} onChange={(e) => setBatchForm((p) => ({ ...p, status: e.target.value as BatchForm["status"] }))}>
            <option value="ACTIVE">Ativo</option><option value="HATCHED">Finalizado com eclosao</option><option value="FAILED">Falhou</option><option value="CANCELED">Cancelado</option>
          </select>
          <div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingBatchId ? "Atualizar" : "Cadastrar lote(s)"}</Button><Button type="button" variant="outline" onClick={() => { setShowBatchModal(false); setEditingBatchId(null); setEditingBatchLotCode(null); }}>Cancelar</Button></div>
        </form>
      </AppModal>

      <AppModal open={showEventModal} title="Registrar evento do lote" error={error} onClose={() => setShowEventModal(false)}>
        <form className="grid gap-3" onSubmit={createEvent}>
          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={eventForm.batchId} onChange={(e) => setEventForm((p) => ({ ...p, batchId: e.target.value }))}>
            <option value="">Selecione o lote</option>{activeBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.incubator.name} - {batch.flockGroup.title} - {new Date(batch.entryDate).toLocaleDateString("pt-BR")} - {batch.eggsSet} ovos</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={eventForm.type} onChange={(e) => setEventForm((p) => ({ ...p, type: e.target.value as EventForm["type"] }))}>
              <option value="HATCHED">Nasceram</option><option value="INFERTILE">Infertis</option><option value="EMBRYO_LOSS">Nao desenvolveram</option><option value="PIPPED_DIED">Bicaram e morreram</option><option value="IN_PROGRESS">Em andamento</option><option value="OTHER">Outro</option>
            </select>
            <Input type="number" min={0} max={maxEventQuantity || undefined} value={eventForm.quantity} onChange={(e) => setEventForm((p) => ({ ...p, quantity: Math.min(Number(e.target.value) || 0, maxEventQuantity || Number(e.target.value) || 0) }))} />
          </div>
          <Input type="date" value={eventForm.eventDate} onChange={(e) => setEventForm((p) => ({ ...p, eventDate: e.target.value }))} />
          <Input placeholder="Observacoes" value={eventForm.notes} onChange={(e) => setEventForm((p) => ({ ...p, notes: e.target.value }))} />
          <Button type="submit" disabled={saving}>{saving ? "Registrando..." : "Registrar evento"}</Button>
        </form>
      </AppModal>
    </main>
  );
}
