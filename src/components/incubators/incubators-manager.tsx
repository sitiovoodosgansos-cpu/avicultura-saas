
"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  flockGroup: { id: string; title: string };
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
  description: string;
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

type IncubationConfig = {
  galinha: number;
  faisao: number;
  peru: number;
  pavao: number;
  marreco: number;
  padrao: number;
};

const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

const emptyDevice: DeviceForm = { name: "", description: "", notes: "", status: "ACTIVE" };
const emptyBatch: BatchForm = {
  incubatorId: "",
  entryDate: today,
  lockdownDate: "",
  expectedHatchDate: "",
  notes: "",
  status: "ACTIVE"
};
const emptyEvent: EventForm = { batchId: "", type: "HATCHED", quantity: 0, eventDate: today, notes: "" };

const defaultIncubation: IncubationConfig = {
  galinha: 21,
  faisao: 27,
  peru: 28,
  pavao: 28,
  marreco: 28,
  padrao: 21
};

const incubationStorageKey = "ornabird-incubation-config";

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

function extractSpecies(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("galinha")) return "galinha";
  if (normalized.includes("fais")) return "faisao";
  if (normalized.includes("peru")) return "peru";
  if (normalized.includes("pavao")) return "pavao";
  if (normalized.includes("marreco")) return "marreco";
  return "padrao";
}

function readIncubationConfig(): IncubationConfig {
  if (typeof window === "undefined") return { ...defaultIncubation };
  const raw = window.localStorage.getItem(incubationStorageKey);
  if (!raw) return { ...defaultIncubation };
  try {
    const parsed = JSON.parse(raw) as Partial<IncubationConfig>;
    return {
      galinha: Number(parsed.galinha ?? defaultIncubation.galinha),
      faisao: Number(parsed.faisao ?? defaultIncubation.faisao),
      peru: Number(parsed.peru ?? defaultIncubation.peru),
      pavao: Number(parsed.pavao ?? defaultIncubation.pavao),
      marreco: Number(parsed.marreco ?? defaultIncubation.marreco),
      padrao: Number(parsed.padrao ?? defaultIncubation.padrao)
    };
  } catch {
    return { ...defaultIncubation };
  }
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
  const [incubationConfig, setIncubationConfig] = useState<IncubationConfig>({ ...defaultIncubation });
  const [batchFilter, setBatchFilter] = useState<"ACTIVE" | "FINALIZED">("ACTIVE");

  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const activeBatches = useMemo(() => batches.filter((batch) => batch.status === "ACTIVE"), [batches]);
  const finalizedBatches = useMemo(() => batches.filter((batch) => batch.status !== "ACTIVE"), [batches]);
  const visibleBatches = batchFilter === "ACTIVE" ? activeBatches : finalizedBatches;

  const totalBatchEggs = useMemo(
    () => batchLines.reduce((sum, line) => sum + (Number.isFinite(line.eggsSet) ? line.eggsSet : 0), 0),
    [batchLines]
  );

  const incubatorStats = useMemo(() => {
    return devices.map((device) => {
      const byDevice = batches.filter((batch) => batch.incubatorId === device.id);
      const totalEggs = byDevice.reduce((sum, batch) => sum + batch.eggsSet, 0);
      const hatched = byDevice.reduce((sum, batch) => sum + batch.stats.hatched, 0);
      const active = byDevice.filter((batch) => batch.status === "ACTIVE").length;
      return {
        ...device,
        active,
        hatched,
        hatchRate: totalEggs ? (hatched / totalEggs) * 100 : 0
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
    setIncubationConfig(readIncubationConfig());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(incubationStorageKey, JSON.stringify(incubationConfig));
  }, [incubationConfig]);

  useEffect(() => {
    if (!batchForm.entryDate) return;
    const firstGroup = flockGroups.find((group) => group.id === batchLines[0]?.flockGroupId);
    const key = extractSpecies(firstGroup?.title ?? "") as keyof IncubationConfig;
    const incubationDays = incubationConfig[key] ?? incubationConfig.padrao;
    const expected = addDays(batchForm.entryDate, incubationDays);
    const lockdown = addDays(expected, -3);
    setBatchForm((prev) => ({ ...prev, expectedHatchDate: expected, lockdownDate: lockdown }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchForm.entryDate, batchLines[0]?.flockGroupId, incubationConfig]);

  async function saveDevice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const endpoint = editingDeviceId ? `/api/incubators/devices/${editingDeviceId}` : "/api/incubators/devices";
    const method = editingDeviceId ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deviceForm)
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
          notes: batchForm.notes,
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

      const tag = `Lote-${new Date().getTime()}`;
      for (const [index, line] of lines.entries()) {
        const selectedGroup = flockGroups.find((group) => group.id === line.flockGroupId);
        const discardDate = addDays(batchForm.expectedHatchDate, 3);
        const noteLines = [
          batchForm.notes?.trim(),
          `Tag: ${tag}`,
          `Linha: ${index + 1}/${lines.length}`,
          `Grupo: ${selectedGroup?.title ?? "-"}`,
          `Lockdown: ${batchForm.lockdownDate}`,
          `Eclosao: ${batchForm.expectedHatchDate}`,
          `Descarte: ${discardDate}`
        ].filter(Boolean);

        const res = await fetch("/api/incubators/batches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            incubatorId: batchForm.incubatorId,
            flockGroupId: line.flockGroupId,
            entryDate: batchForm.entryDate,
            eggsSet: line.eggsSet,
            expectedHatchDate: batchForm.expectedHatchDate,
            notes: noteLines.join(" | "),
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

  async function createEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

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

  function updateIncubationDays(key: keyof IncubationConfig, value: number) {
    setIncubationConfig((prev) => ({ ...prev, [key]: Math.max(1, Math.min(365, Number(value) || prev[key])) }));
  }

  return (
    <main className="space-y-6">
      <PageTitle title="Chocadeiras" description="Layout moderno para maquinas, lotes e eventos de incubacao." />

      {error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : null}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Ativas</p><p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.activeIncubators ?? 0}</p></Card>
        <Card><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Lotes ativos</p><p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.activeBatches ?? 0}</p></Card>
        <Card><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Finalizados</p><p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.finalizedBatches ?? 0}</p></Card>
        <Card><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Taxa eclosao</p><p className="mt-2 text-2xl font-semibold text-zinc-900">{formatPercent(metrics?.summary.hatchRate ?? 0)}</p></Card>
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
              <div>
                <p className="text-lg font-semibold text-zinc-900">{device.name}</p>
                <p className="text-sm text-zinc-500">{device.description || "Sem descricao"}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-400">Status: {device.status}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => { setEditingDeviceId(device.id); setDeviceForm({ name: device.name, description: device.description ?? "", notes: device.notes ?? "", status: device.status }); setShowDeviceModal(true); }}>Editar</Button>
                <Button variant="danger" type="button" onClick={() => removeDevice(device.id)}>Excluir</Button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-zinc-50 p-3 text-sm">
              <div><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Chocagens</p><p className="text-xl font-semibold text-zinc-900">{device.active}</p></div>
              <div><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Nascidos</p><p className="text-xl font-semibold text-zinc-900">{device.hatched}</p></div>
              <div><p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Taxa</p><p className="text-xl font-semibold text-zinc-900">{formatPercent(device.hatchRate)}</p></div>
            </div>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-base font-semibold text-zinc-900">Desempenho</h3>
          <div className="mt-3 grid gap-2 text-sm text-zinc-700">
            <p>Infertilidade: {formatPercent(metrics?.summary.infertilityRate ?? 0)}</p>
            <p>Perda embrionaria: {formatPercent(metrics?.summary.embryoLossRate ?? 0)}</p>
            <p>Bicados sem sucesso: {formatPercent(metrics?.summary.pippedDiedRate ?? 0)}</p>
          </div>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.performanceByIncubator ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="hatchRate" fill="#0f766e" name="Taxa eclosao" />
                <Bar dataKey="infertilityRate" fill="#ef4444" name="Taxa infertilidade" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-zinc-900">Registro de lotes</h3>
            <div className="rounded-full bg-zinc-100 p-1 text-xs">
              <button type="button" className={`rounded-full px-3 py-1 ${batchFilter === "ACTIVE" ? "bg-white text-zinc-900 shadow" : "text-zinc-500"}`} onClick={() => setBatchFilter("ACTIVE")}>Ativos ({activeBatches.length})</button>
              <button type="button" className={`rounded-full px-3 py-1 ${batchFilter === "FINALIZED" ? "bg-white text-zinc-900 shadow" : "text-zinc-500"}`} onClick={() => setBatchFilter("FINALIZED")}>Inativos ({finalizedBatches.length})</button>
            </div>
          </div>

          <div className="mt-3 grid gap-3">
            {visibleBatches.length === 0 ? <p className="text-sm text-zinc-500">Nenhum lote nesse filtro.</p> : null}
            {visibleBatches.map((batch) => (
              <div key={batch.id} className="rounded-2xl border border-zinc-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{batch.flockGroup.title}</p>
                    <p className="text-xs text-zinc-500">{batch.incubator.name} | Entrada: {new Date(batch.entryDate).toLocaleDateString("pt-BR")}</p>
                    <p className="text-xs text-zinc-500">Status: {batch.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => {
                      setEditingBatchId(batch.id);
                      setBatchForm({ incubatorId: batch.incubatorId, entryDate: toDateInput(batch.entryDate), lockdownDate: "", expectedHatchDate: toDateInput(batch.expectedHatchDate), notes: batch.notes ?? "", status: batch.status });
                      setBatchLines([{ lineId: `line-${Date.now()}`, flockGroupId: batch.flockGroupId, eggsSet: batch.eggsSet }]);
                      setShowBatchModal(true);
                    }}>Editar</Button>
                    <Button variant="danger" type="button" onClick={() => removeBatch(batch.id)}>Excluir</Button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
                  <div className="rounded-xl bg-zinc-50 p-2"><p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Ovos</p><p className="text-lg font-semibold text-zinc-900">{batch.eggsSet}</p></div>
                  <div className="rounded-xl bg-zinc-50 p-2"><p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Nascidos</p><p className="text-lg font-semibold text-zinc-900">{batch.stats.hatched}</p></div>
                  <div className="rounded-xl bg-zinc-50 p-2"><p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Infertis</p><p className="text-lg font-semibold text-zinc-900">{batch.stats.infertile}</p></div>
                  <div className="rounded-xl bg-zinc-50 p-2"><p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Nao desenv.</p><p className="text-lg font-semibold text-zinc-900">{batch.stats.embryoLoss}</p></div>
                  <div className="rounded-xl bg-zinc-50 p-2"><p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">Taxa</p><p className="text-lg font-semibold text-zinc-900">{formatPercent(batch.stats.hatchRate)}</p></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <AppModal open={showDeviceModal} title={editingDeviceId ? "Editar chocadeira" : "Nova chocadeira"} onClose={() => { setShowDeviceModal(false); setEditingDeviceId(null); setDeviceForm(emptyDevice); }}>
        <form className="grid gap-3" onSubmit={saveDevice}>
          <Input placeholder="Nome da chocadeira" value={deviceForm.name} onChange={(e) => setDeviceForm((p) => ({ ...p, name: e.target.value }))} />
          <Input placeholder="Descricao" value={deviceForm.description} onChange={(e) => setDeviceForm((p) => ({ ...p, description: e.target.value }))} />
          <Input placeholder="Observacoes" value={deviceForm.notes} onChange={(e) => setDeviceForm((p) => ({ ...p, notes: e.target.value }))} />
          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={deviceForm.status} onChange={(e) => setDeviceForm((p) => ({ ...p, status: e.target.value as DeviceForm["status"] }))}>
            <option value="ACTIVE">Ativa</option><option value="INACTIVE">Inativa</option><option value="MAINTENANCE">Manutencao</option>
          </select>
          <div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingDeviceId ? "Atualizar" : "Cadastrar"}</Button><Button type="button" variant="outline" onClick={() => { setShowDeviceModal(false); setEditingDeviceId(null); setDeviceForm(emptyDevice); }}>Cancelar</Button></div>
        </form>
      </AppModal>

      <AppModal open={showBatchModal} title={editingBatchId ? "Editar lote" : "Novo lote"} onClose={() => { setShowBatchModal(false); setEditingBatchId(null); }}>
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input type="date" value={batchForm.entryDate} onChange={(e) => setBatchForm((p) => ({ ...p, entryDate: e.target.value }))} />
            <Input type="date" value={batchForm.lockdownDate} onChange={(e) => setBatchForm((p) => ({ ...p, lockdownDate: e.target.value }))} />
            <Input type="date" value={batchForm.expectedHatchDate} onChange={(e) => setBatchForm((p) => ({ ...p, expectedHatchDate: e.target.value }))} />
          </div>
          <p className="text-xs text-zinc-500">Data 1: entrada | Data 2: lockdown | Data 3: eclosao prevista | descarte +3 dias.</p>
          <Input placeholder="Observacoes do lote" value={batchForm.notes} onChange={(e) => setBatchForm((p) => ({ ...p, notes: e.target.value }))} />
          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={batchForm.status} onChange={(e) => setBatchForm((p) => ({ ...p, status: e.target.value as BatchForm["status"] }))}>
            <option value="ACTIVE">Ativo</option><option value="HATCHED">Finalizado com eclosao</option><option value="FAILED">Falhou</option><option value="CANCELED">Cancelado</option>
          </select>
          {!editingBatchId ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-sm font-semibold text-zinc-800">Dias por especie (editavel)</p>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                <Input type="number" min={1} max={365} value={incubationConfig.galinha} onChange={(e) => updateIncubationDays("galinha", Number(e.target.value))} placeholder="Galinha" />
                <Input type="number" min={1} max={365} value={incubationConfig.faisao} onChange={(e) => updateIncubationDays("faisao", Number(e.target.value))} placeholder="Faisao" />
                <Input type="number" min={1} max={365} value={incubationConfig.peru} onChange={(e) => updateIncubationDays("peru", Number(e.target.value))} placeholder="Peru" />
                <Input type="number" min={1} max={365} value={incubationConfig.pavao} onChange={(e) => updateIncubationDays("pavao", Number(e.target.value))} placeholder="Pavao" />
                <Input type="number" min={1} max={365} value={incubationConfig.marreco} onChange={(e) => updateIncubationDays("marreco", Number(e.target.value))} placeholder="Marreco" />
                <Input type="number" min={1} max={365} value={incubationConfig.padrao} onChange={(e) => updateIncubationDays("padrao", Number(e.target.value))} placeholder="Padrao" />
              </div>
            </div>
          ) : null}
          <div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingBatchId ? "Atualizar" : "Cadastrar lote(s)"}</Button><Button type="button" variant="outline" onClick={() => { setShowBatchModal(false); setEditingBatchId(null); }}>Cancelar</Button></div>
        </form>
      </AppModal>

      <AppModal open={showEventModal} title="Registrar evento do lote" onClose={() => setShowEventModal(false)}>
        <form className="grid gap-3" onSubmit={createEvent}>
          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={eventForm.batchId} onChange={(e) => setEventForm((p) => ({ ...p, batchId: e.target.value }))}>
            <option value="">Selecione o lote</option>{activeBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.incubator.name} - {batch.flockGroup.title} - {new Date(batch.entryDate).toLocaleDateString("pt-BR")}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={eventForm.type} onChange={(e) => setEventForm((p) => ({ ...p, type: e.target.value as EventForm["type"] }))}>
              <option value="HATCHED">Nasceram</option><option value="INFERTILE">Infertis</option><option value="EMBRYO_LOSS">Nao desenvolveram</option><option value="PIPPED_DIED">Bicaram e morreram</option><option value="IN_PROGRESS">Em andamento</option><option value="OTHER">Outro</option>
            </select>
            <Input type="number" min={0} value={eventForm.quantity} onChange={(e) => setEventForm((p) => ({ ...p, quantity: Number(e.target.value) }))} />
          </div>
          <Input type="date" value={eventForm.eventDate} onChange={(e) => setEventForm((p) => ({ ...p, eventDate: e.target.value }))} />
          <Input placeholder="Observacoes" value={eventForm.notes} onChange={(e) => setEventForm((p) => ({ ...p, notes: e.target.value }))} />
          <Button type="submit" disabled={saving}>{saving ? "Registrando..." : "Registrar evento"}</Button>
        </form>
      </AppModal>
    </main>
  );
}
