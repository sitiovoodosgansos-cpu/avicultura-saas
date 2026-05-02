
"use client";

import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteActionButton } from "@/components/ui/delete-action-button";
import { Input } from "@/components/ui/input";
import { AppModal } from "@/components/ui/app-modal";
import { Check, Clock3, Info, Pencil } from "lucide-react";

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

type BatchSource = {
  id: string;
  trayEntryId: string | null;
  collectionDate: string;
  quantity: number;
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
  sources?: BatchSource[];
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
  return Math.ceil((targetDate.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000));
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

function IncubatorIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-700" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="white" />
      <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="14" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <ellipse cx="12" cy="14" rx="1.3" ry="1.7" fill="currentColor" opacity="0.55" />
      <circle cx="18" cy="7" r="0.9" className={active ? "fill-emerald-500 animate-pulse" : "fill-zinc-300"} />
    </svg>
  );
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
  const [vitrineInfo, setVitrineInfo] = useState<string | null>(null);

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
  const [finalizeBatchOnSubmit, setFinalizeBatchOnSubmit] = useState(false);
  const [sourcesModal, setSourcesModal] = useState<{ title: string; sources: BatchSource[] } | null>(null);
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
  type EventBatchOption = {
    groupKey: string;
    label: string;
    batchIds: string[];
    totalEggs: number;
    consumed: number;
    remaining: number;
    incubator: string;
    flockGroupTitle: string;
    entryDate: string;
  };
  const eventBatchOptions = useMemo<EventBatchOption[]>(() => {
    const map = new Map<string, EventBatchOption>();
    for (const batch of activeBatches) {
      const dateKey = toDateInput(batch.entryDate);
      const key = `${batch.flockGroupId}|${dateKey}`;
      const consumed =
        (batch.stats.hatched ?? 0) + (batch.stats.infertile ?? 0) + (batch.stats.embryoLoss ?? 0) + (batch.stats.pippedDied ?? 0);
      const existing = map.get(key);
      if (existing) {
        existing.batchIds.push(batch.id);
        existing.totalEggs += batch.eggsSet;
        existing.consumed += consumed;
        existing.remaining = Math.max(0, existing.totalEggs - existing.consumed);
      } else {
        map.set(key, {
          groupKey: key,
          label: "",
          batchIds: [batch.id],
          totalEggs: batch.eggsSet,
          consumed,
          remaining: Math.max(0, batch.eggsSet - consumed),
          incubator: batch.incubator.name,
          flockGroupTitle: batch.flockGroup.title,
          entryDate: batch.entryDate
        });
      }
    }
    for (const opt of map.values()) {
      opt.label = `${opt.incubator} - ${opt.flockGroupTitle} - ${new Date(opt.entryDate).toLocaleDateString("pt-BR")} - ${opt.totalEggs} ovos`;
    }
    return Array.from(map.values());
  }, [activeBatches]);

  const selectedEventBatchGroup = useMemo(
    () => eventBatchOptions.find((opt) => opt.groupKey === eventForm.batchId) ?? null,
    [eventBatchOptions, eventForm.batchId]
  );
  const consumingEventTypes = ["HATCHED", "INFERTILE", "EMBRYO_LOSS", "PIPPED_DIED"] as const;
  const isConsumingEvent = (consumingEventTypes as readonly string[]).includes(eventForm.type);
  const remainingEggsForBatch = selectedEventBatchGroup?.remaining ?? 0;
  const maxEventQuantity = selectedEventBatchGroup
    ? isConsumingEvent
      ? remainingEggsForBatch
      : selectedEventBatchGroup.totalEggs
    : 0;

  const incubatorStats = useMemo(() => {
    return devices.map((device) => {
      const byDevice = batches.filter((batch) => batch.incubatorId === device.id);
      const activeByDevice = byDevice.filter((batch) => batch.status === "ACTIVE");
      const totalEggs = byDevice.reduce((sum, batch) => sum + batch.eggsSet, 0);
      const hatched = byDevice.reduce((sum, batch) => sum + batch.stats.hatched, 0);
      const active = activeByDevice.length;

      const groupMap = new Map<
        string,
        { species: string; eggs: number; remainingDays: number; hatchDate: Date; lineCount: number; totalDays: number; batchIds: string[] }
      >();
      for (const batch of activeByDevice) {
        const speciesName = batch.flockGroup.species?.name?.trim() || "";
        const rule = inferSpeciesRuleFromText(speciesName || batch.flockGroup.title);
        const cardLabel = batch.flockGroup.title?.trim() || speciesName || rule.label;
        const entryDate = toDateStart(batch.entryDate);
        const hatchDate = addDaysToDate(entryDate, rule.days);
        const remainingDays = getDaysUntil(hatchDate);
        const groupKey = `${batch.flockGroupId}|${entryDate.toISOString().slice(0, 10)}`;
        const existing = groupMap.get(groupKey);
        if (existing) {
          existing.eggs += batch.eggsSet;
          existing.lineCount += 1;
          existing.batchIds.push(batch.id);
          continue;
        }
        groupMap.set(groupKey, {
          species: cardLabel,
          eggs: batch.eggsSet,
          remainingDays,
          hatchDate,
          lineCount: 1,
          totalDays: rule.days,
          batchIds: [batch.id]
        });
      }
      const batchCountdowns = Array.from(groupMap.values());

      const speciesCountdowns = batchCountdowns
        .sort((a, b) => a.remainingDays - b.remainingDays || b.eggs - a.eggs)
        .map((item) => {
          const countdownState = item.remainingDays < 0 ? "overdue" : item.remainingDays === 0 ? "today" : "counting";
          const countdownLabel =
            countdownState === "overdue"
              ? `Atrasado ${Math.abs(item.remainingDays)}d`
              : countdownState === "today"
                ? "Eclosao hoje"
                : `${item.remainingDays}d`;
          const progressPercent =
            item.remainingDays <= 0
              ? 100
              : item.totalDays > 0
                ? Math.min(100, Math.max(0, ((item.totalDays - item.remainingDays) / item.totalDays) * 100))
                : 0;

          return {
            ...item,
            hatchDateLabel: item.hatchDate.toLocaleDateString("pt-BR"),
            progressPercent,
            countdownState,
            countdownLabel
          };
        });

      return {
        ...device,
        active,
        totalBatches: byDevice.length,
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
    const firstGroupKey = `${firstActiveBatch.flockGroupId}|${toDateInput(firstActiveBatch.entryDate)}`;
    setError(null);
    setFinalizeBatchOnSubmit(false);
    setEventForm((prev) => ({ ...prev, batchId: firstGroupKey }));
    setShowEventModal(true);
  }

  function openFinalizeForSpecies(batchIds: string[]) {
    const targetBatch = activeBatches.find((batch) => batchIds.includes(batch.id));
    if (!targetBatch) {
      setError("Lote nao encontrado para finalizar.");
      return;
    }
    const groupKey = `${targetBatch.flockGroupId}|${toDateInput(targetBatch.entryDate)}`;
    const groupBatches = activeBatches.filter((b) => `${b.flockGroupId}|${toDateInput(b.entryDate)}` === groupKey);
    const totalEggs = groupBatches.reduce((s, b) => s + b.eggsSet, 0);
    const totalConsumed = groupBatches.reduce(
      (s, b) =>
        s +
        ((b.stats.hatched ?? 0) + (b.stats.infertile ?? 0) + (b.stats.embryoLoss ?? 0) + (b.stats.pippedDied ?? 0)),
      0
    );
    const remaining = Math.max(0, totalEggs - totalConsumed);
    setError(null);
    setFinalizeBatchOnSubmit(true);
    setEventForm({
      batchId: groupKey,
      type: "HATCHED",
      quantity: remaining,
      eventDate: today,
      notes: ""
    });
    setShowEventModal(true);
  }

  async function createEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    if (!selectedEventBatchGroup) {
      setError("Selecione o lote.");
      setSaving(false);
      return;
    }

    if (maxEventQuantity > 0 && eventForm.quantity > maxEventQuantity) {
      setError(`Quantidade invalida. O lote tem no maximo ${maxEventQuantity} ovos.`);
      setSaving(false);
      return;
    }

    // Distribui FIFO (por entryDate ascendente, depois por id) entre os batches do grupo
    const groupBatches = activeBatches
      .filter((b) => selectedEventBatchGroup.batchIds.includes(b.id))
      .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime() || a.id.localeCompare(b.id));

    let remaining = eventForm.quantity;
    for (const batch of groupBatches) {
      if (remaining <= 0) break;
      const consumed =
        (batch.stats.hatched ?? 0) + (batch.stats.infertile ?? 0) + (batch.stats.embryoLoss ?? 0) + (batch.stats.pippedDied ?? 0);
      const available = isConsumingEvent ? Math.max(0, batch.eggsSet - consumed) : batch.eggsSet;
      if (available <= 0) continue;
      const take = isConsumingEvent ? Math.min(remaining, available) : remaining;
      const res = await fetch(`/api/incubators/batches/${batch.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: eventForm.type,
          quantity: take,
          eventDate: eventForm.eventDate,
          notes: eventForm.notes
        })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "Falha ao registrar evento.");
        setSaving(false);
        return;
      }
      if (isConsumingEvent) remaining -= take;
      else break;
    }

    if (finalizeBatchOnSubmit) {
      let totalCreated = 0;
      let totalAnimals = 0;
      let anyMissingTier = false;
      for (const batch of groupBatches) {
        const finalizeRes = await fetch(`/api/incubators/batches/${batch.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            incubatorId: batch.incubatorId,
            flockGroupId: batch.flockGroupId,
            entryDate: toDateInput(batch.entryDate),
            eggsSet: batch.eggsSet,
            expectedHatchDate: batch.expectedHatchDate ? toDateInput(batch.expectedHatchDate) : "",
            notes: batch.notes ?? "",
            status: "HATCHED"
          })
        });
        if (!finalizeRes.ok) {
          const payload = (await finalizeRes.json().catch(() => ({}))) as { error?: string };
          setError(payload.error ?? "Evento registrado, mas falha ao finalizar lote.");
          setSaving(false);
          return;
        }
        const payload = (await finalizeRes.json().catch(() => ({}))) as {
          vitrineAutoListing?: {
            kind: "created" | "skipped";
            quantity?: number;
            missingTier?: boolean;
          } | null;
        };
        if (payload.vitrineAutoListing?.kind === "created") {
          totalCreated += 1;
          totalAnimals += payload.vitrineAutoListing.quantity ?? 0;
          if (payload.vitrineAutoListing.missingTier) anyMissingTier = true;
        }
      }
      setFinalizeBatchOnSubmit(false);

      if (totalCreated > 0) {
        const base = `${totalAnimals} filhote(s) enviado(s) para a Vitrine.`;
        const tail = anyMissingTier
          ? " Cadastre os preços por idade na Vitrine para que apareçam corretamente."
          : "";
        setVitrineInfo(base + tail);
      }
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

      {vitrineInfo ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-emerald-800">{vitrineInfo}</p>
            <button
              type="button"
              onClick={() => setVitrineInfo(null)}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}

      <section className="mobile-kpi-grid grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">🐣 Ativas</p><p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.activeIncubators ?? 0}</p></Card>
        <Card><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">🥚 Lotes ativos</p><p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.activeBatches ?? 0}</p></Card>
        <Card><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">📦 Finalizados</p><p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.finalizedBatches ?? 0}</p></Card>
        <Card><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">📈 Taxa eclosao</p><p className="mt-2 text-2xl font-semibold text-zinc-900">{formatPercent(metrics?.summary.hatchRate ?? 0)}</p></Card>
      </section>

      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">Painel de chocadeiras</h3>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
            <Button type="button" className="w-full whitespace-nowrap !text-[11px] !px-2 sm:w-auto sm:!text-sm sm:!px-4" onClick={() => { setEditingDeviceId(null); setDeviceForm(emptyDevice); setShowDeviceModal(true); }}>+ Chocadeira</Button>
            <Button type="button" className="w-full sm:w-auto" onClick={() => { setEditingBatchId(null); setShowBatchModal(true); }}>+ Lote</Button>
            <Button type="button" variant="subtle" className="w-full sm:w-auto" onClick={() => setShowEventModal(true)}>📝 Evento</Button>
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
                <div className="relative mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <IncubatorIcon active={device.active > 0} />
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
                  size="icon"
                  className="h-12 w-12 rounded-xl md:h-auto md:w-auto md:px-3"
                  aria-label="Editar chocadeira"
                  title="Editar chocadeira"
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
                  <Pencil className="h-4 w-4" />
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
              <div><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Chocagens</p><p className="text-xl font-semibold text-zinc-900">{device.totalBatches}</p></div>
              <div><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Nascidos</p><p className="text-xl font-semibold text-zinc-900">{device.hatched}</p></div>
              <div><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Taxa</p><p className="text-xl font-semibold text-zinc-900">{formatPercent(device.hatchRate)}</p></div>
            </div>
            {device.speciesCountdowns.length > 0 ? (
              <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Contagem por especie</p>
                <div className="mt-2 space-y-2">
                  {device.speciesCountdowns.slice(0, 6).map((item) => (
                    <div key={`${device.id}-${item.batchIds[0]}`} className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-zinc-800">{item.species}</p>
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                              item.countdownState === "overdue"
                                ? "bg-rose-50 text-rose-700"
                                : item.countdownState === "today"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            <Clock3
                              className={`h-3.5 w-3.5 ${
                                item.countdownState === "counting" ? "animate-spin motion-reduce:animate-none" : ""
                              }`}
                            />
                            <span>{item.countdownLabel}</span>
                          </div>
                          {(item.countdownState === "overdue" || item.countdownState === "today") && item.batchIds.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => openFinalizeForSpecies(item.batchIds)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700"
                              title="Finalizar lote"
                              aria-label="Finalizar lote"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500">
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700">{item.eggs} ovos</span>
                        <span>Eclosao: {item.hatchDateLabel}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.countdownState === "overdue"
                              ? "bg-rose-500"
                              : item.countdownState === "today"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
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
                {(() => {
                  const aggregated = new Map<string, {
                    flockGroupId: string;
                    flockGroupTitle: string;
                    eggsSet: number;
                    hatched: number;
                    infertile: number;
                    embryoLoss: number;
                    pippedDied: number;
                    batchIds: string[];
                    sources: BatchSource[];
                    first: Batch;
                  }>();
                  for (const batch of lot.lines) {
                    const key = batch.flockGroupId;
                    const ex = aggregated.get(key);
                    if (ex) {
                      ex.eggsSet += batch.eggsSet;
                      ex.hatched += batch.stats.hatched;
                      ex.infertile += batch.stats.infertile;
                      ex.embryoLoss += batch.stats.embryoLoss;
                      ex.pippedDied += batch.stats.pippedDied;
                      ex.batchIds.push(batch.id);
                      ex.sources.push(...(batch.sources ?? []));
                    } else {
                      aggregated.set(key, {
                        flockGroupId: batch.flockGroupId,
                        flockGroupTitle: batch.flockGroup.title,
                        eggsSet: batch.eggsSet,
                        hatched: batch.stats.hatched,
                        infertile: batch.stats.infertile,
                        embryoLoss: batch.stats.embryoLoss,
                        pippedDied: batch.stats.pippedDied,
                        batchIds: [batch.id],
                        sources: [...(batch.sources ?? [])],
                        first: batch
                      });
                    }
                  }
                  const rows = Array.from(aggregated.values());

                  function editAction(row: (typeof rows)[number]) {
                    const batch = row.first;
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
                  }

                  return (
                    <>
                      {/* Mobile: cards verticais por especie */}
                      <ul className="mt-3 grid gap-2 md:hidden">
                        {rows.map((row) => {
                          const eclosao = row.eggsSet > 0 ? (row.hatched / row.eggsSet) * 100 : 0;
                          return (
                            <li key={row.flockGroupId} className="rounded-xl border border-zinc-200 bg-white p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                  <span className="truncate text-sm font-semibold text-zinc-900">{row.flockGroupTitle}</span>
                                  {row.sources.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => setSourcesModal({ title: row.flockGroupTitle, sources: row.sources })}
                                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-50 text-sky-600 transition hover:bg-sky-100"
                                      title="Ver datas de coleta originais"
                                      aria-label="Ver datas de coleta originais"
                                    >
                                      <Info className="h-3 w-3" />
                                    </button>
                                  ) : null}
                                </div>
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                  {row.eggsSet > 0 ? `${eclosao.toFixed(1)}%` : "—"}
                                </span>
                              </div>
                              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                                <div className="rounded-lg bg-zinc-50 px-2 py-1.5">
                                  <p className="text-[9px] uppercase tracking-wide text-zinc-400">Ovos</p>
                                  <p className="text-base font-semibold text-zinc-900">{row.eggsSet}</p>
                                </div>
                                <div className="rounded-lg bg-zinc-50 px-2 py-1.5">
                                  <p className="text-[9px] uppercase tracking-wide text-zinc-400">Nascidos</p>
                                  <p className="text-base font-semibold text-zinc-900">{row.hatched}</p>
                                </div>
                                <div className="rounded-lg bg-zinc-50 px-2 py-1.5">
                                  <p className="text-[9px] uppercase tracking-wide text-zinc-400">Inférteis</p>
                                  <p className="text-base font-semibold text-zinc-900">{row.infertile}</p>
                                </div>
                                <div className="rounded-lg bg-zinc-50 px-2 py-1.5">
                                  <p className="text-[9px] uppercase tracking-wide text-zinc-400">Não dev.</p>
                                  <p className="text-base font-semibold text-zinc-900">{row.embryoLoss}</p>
                                </div>
                                <div className="col-span-2 rounded-lg bg-zinc-50 px-2 py-1.5">
                                  <p className="text-[9px] uppercase tracking-wide text-zinc-400">Morreu na casca</p>
                                  <p className="text-base font-semibold text-zinc-900">{row.pippedDied}</p>
                                </div>
                              </div>
                              <div className="mt-2 flex justify-end gap-2">
                                <Button variant="outline" type="button" onClick={() => editAction(row)}>
                                  Editar
                                </Button>
                                <DeleteActionButton iconOnly onClick={() => row.batchIds.forEach((id) => removeBatch(id))} aria-label="Excluir linha do lote" />
                              </div>
                            </li>
                          );
                        })}
                      </ul>

                      {/* Desktop: tabela */}
                      <div className="mt-3 hidden overflow-x-auto md:block">
                        <table className="w-full table-fixed text-sm">
                          <thead>
                            <tr className="border-b border-zinc-200 text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                              <th className="w-[20%] py-2 pr-2 text-left font-semibold">Especie</th>
                              <th className="w-[9%] py-2 px-1 text-center font-semibold">Ovos</th>
                              <th className="w-[9%] py-2 px-1 text-center font-semibold">Nascidos</th>
                              <th className="w-[9%] py-2 px-1 text-center font-semibold">Infertis</th>
                              <th className="w-[12%] py-2 px-1 text-center font-semibold">Nao desenvolveu</th>
                              <th className="w-[12%] py-2 px-1 text-center font-semibold">Morreu na casca</th>
                              <th className="w-[12%] py-2 px-1 text-center font-semibold">Eclosao</th>
                              <th className="w-[17%] py-2 pl-2 text-center font-semibold">Acoes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row) => (
                          <tr key={row.flockGroupId} className="border-b border-zinc-100 last:border-b-0">
                            <td className="py-2 pr-2 text-zinc-900">
                              <div className="flex items-center gap-1.5">
                                <span>{row.flockGroupTitle}</span>
                                {row.sources.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => setSourcesModal({ title: row.flockGroupTitle, sources: row.sources })}
                                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-50 text-sky-600 transition hover:bg-sky-100"
                                    title="Ver datas de coleta originais"
                                    aria-label="Ver datas de coleta originais"
                                  >
                                    <Info className="h-3 w-3" />
                                  </button>
                                ) : null}
                              </div>
                            </td>
                            <td className="py-2 px-1 text-center font-semibold text-zinc-900">{row.eggsSet}</td>
                            <td className="py-2 px-1 text-center text-zinc-900">{row.hatched}</td>
                            <td className="py-2 px-1 text-center text-zinc-900">{row.infertile}</td>
                            <td className="py-2 px-1 text-center text-zinc-900">{row.embryoLoss}</td>
                            <td className="py-2 px-1 text-center text-zinc-900">{row.pippedDied}</td>
                            <td className="py-2 px-1 text-center font-semibold text-emerald-700">
                              {row.eggsSet > 0 ? formatPercent((row.hatched / row.eggsSet) * 100) : "—"}
                            </td>
                            <td className="py-2 pl-2">
                              <div className="flex items-center justify-center gap-2">
                                <Button variant="outline" type="button" onClick={() => editAction(row)}>
                                  Editar
                                </Button>
                                <DeleteActionButton iconOnly onClick={() => row.batchIds.forEach((id) => removeBatch(id))} aria-label="Excluir linha do lote" />
                              </div>
                            </td>
                          </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
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
          <Input type="date" value={batchForm.entryDate} onChange={(e) => setBatchForm((p) => ({ ...p, entryDate: e.target.value }))} />
          <Input placeholder="Observacoes do lote" value={batchForm.notes} onChange={(e) => setBatchForm((p) => ({ ...p, notes: e.target.value }))} />
          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={batchForm.status} onChange={(e) => setBatchForm((p) => ({ ...p, status: e.target.value as BatchForm["status"] }))}>
            <option value="ACTIVE">Ativo</option><option value="HATCHED">Finalizado com eclosao</option><option value="FAILED">Falhou</option><option value="CANCELED">Cancelado</option>
          </select>
          <div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingBatchId ? "Atualizar" : "Cadastrar lote(s)"}</Button><Button type="button" variant="outline" onClick={() => { setShowBatchModal(false); setEditingBatchId(null); setEditingBatchLotCode(null); }}>Cancelar</Button></div>
        </form>
      </AppModal>

      <AppModal
        open={showEventModal}
        title={finalizeBatchOnSubmit ? "Finalizar lote" : "Registrar evento do lote"}
        error={error}
        onClose={() => { setShowEventModal(false); setFinalizeBatchOnSubmit(false); }}
      >
        <form className="grid gap-3" onSubmit={createEvent}>
          {finalizeBatchOnSubmit ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Ao confirmar, o evento sera registrado e o lote sera marcado como finalizado, saindo da lista de ativos. Ajuste a quantidade real de pintinhos nascidos antes de confirmar.
            </p>
          ) : null}
          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={eventForm.batchId} onChange={(e) => setEventForm((p) => ({ ...p, batchId: e.target.value }))}>
            <option value="">Selecione o lote</option>{eventBatchOptions.map((opt) => <option key={opt.groupKey} value={opt.groupKey}>{opt.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={eventForm.type} onChange={(e) => setEventForm((p) => ({ ...p, type: e.target.value as EventForm["type"] }))}>
              <option value="HATCHED">Nasceram</option><option value="INFERTILE">Infertis</option><option value="EMBRYO_LOSS">Nao desenvolveram</option><option value="PIPPED_DIED">Bicaram e morreram</option><option value="IN_PROGRESS">Em andamento</option><option value="OTHER">Outro</option>
            </select>
            <Input type="number" min={0} max={maxEventQuantity || undefined} value={eventForm.quantity || ""} onChange={(e) => setEventForm((p) => ({ ...p, quantity: Math.min(Number(e.target.value) || 0, maxEventQuantity || Number(e.target.value) || 0) }))} />
          </div>
          {selectedEventBatchGroup && isConsumingEvent ? (
            <p className="text-xs text-zinc-500">
              Ovos restantes para classificar: <span className="font-semibold text-zinc-700">{remainingEggsForBatch}</span> de {selectedEventBatchGroup.totalEggs}
            </p>
          ) : null}
          <Input type="date" value={eventForm.eventDate} onChange={(e) => setEventForm((p) => ({ ...p, eventDate: e.target.value }))} />
          <Input placeholder="Observacoes" value={eventForm.notes} onChange={(e) => setEventForm((p) => ({ ...p, notes: e.target.value }))} />
          <Button type="submit" disabled={saving}>{saving ? (finalizeBatchOnSubmit ? "Finalizando..." : "Registrando...") : (finalizeBatchOnSubmit ? "Confirmar e finalizar lote" : "Registrar evento")}</Button>
        </form>
      </AppModal>

      <AppModal
        open={Boolean(sourcesModal)}
        title={sourcesModal ? `Origem: ${sourcesModal.title}` : ""}
        onClose={() => setSourcesModal(null)}
      >
        {sourcesModal ? (
          <div className="space-y-2">
            <p className="text-sm text-zinc-600">
              Datas de coleta dos ovos que entraram nesse lote (vindos da prateleira):
            </p>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-2">
              {(() => {
                const grouped = new Map<string, number>();
                for (const src of sourcesModal.sources) {
                  const key = new Date(src.collectionDate).toISOString().slice(0, 10);
                  grouped.set(key, (grouped.get(key) ?? 0) + src.quantity);
                }
                const sorted = Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
                return (
                  <ul className="divide-y divide-zinc-200">
                    {sorted.map(([date, qty]) => (
                      <li key={date} className="flex items-center justify-between py-1.5 text-sm">
                        <span className="font-medium text-zinc-700">{new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR")}</span>
                        <span className="font-semibold text-zinc-900">{qty} ovos</span>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setSourcesModal(null)}>Fechar</Button>
            </div>
          </div>
        ) : null}
      </AppModal>
    </main>
  );
}
