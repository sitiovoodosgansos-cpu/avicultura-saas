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
  performanceByIncubator: Array<{
    label: string;
    hatchRate: number;
    infertilityRate: number;
  }>;
  periodSeries: Array<{
    date: string;
    hatched: number;
    infertile: number;
  }>;
};

type DeviceForm = {
  name: string;
  description: string;
  notes: string;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
};

type BatchForm = {
  incubatorId: string;
  flockGroupId: string;
  entryDate: string;
  eggsSet: number;
  expectedHatchDate: string;
  notes: string;
  status: "ACTIVE" | "HATCHED" | "FAILED" | "CANCELED";
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

const emptyDevice: DeviceForm = {
  name: "",
  description: "",
  notes: "",
  status: "ACTIVE"
};

const emptyBatch: BatchForm = {
  incubatorId: "",
  flockGroupId: "",
  entryDate: today,
  eggsSet: 1,
  expectedHatchDate: "",
  notes: "",
  status: "ACTIVE"
};

const emptyEvent: EventForm = {
  batchId: "",
  type: "HATCHED",
  quantity: 0,
  eventDate: today,
  notes: ""
};

function formatPercent(v: number) {
  return `${v.toFixed(2)}%`;
}

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const [eventForm, setEventForm] = useState<EventForm>(emptyEvent);

  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  const activeBatches = useMemo(() => batches.filter((b) => b.status === "ACTIVE"), [batches]);

  async function loadData() {
    setLoading(true);
    setError(null);

    const [deviceRes, metricRes] = await Promise.all([
      fetch("/api/incubators/devices", { cache: "no-store" }),
      fetch("/api/incubators/metrics", { cache: "no-store" })
    ]);

    if (!deviceRes.ok || !metricRes.ok) {
      setError("Não foi possível carregar os dados de chocadeiras.");
      setLoading(false);
      return;
    }

    const deviceData = (await deviceRes.json()) as {
      incubators: Incubator[];
      batches: Batch[];
      flockGroups: FlockGroup[];
    };

    const metricData = (await metricRes.json()) as Metrics;

    setDevices(deviceData.incubators);
    setBatches(deviceData.batches);
    setFlockGroups(deviceData.flockGroups);
    setMetrics(metricData);

    if (!batchForm.incubatorId && deviceData.incubators.length > 0) {
      setBatchForm((p) => ({ ...p, incubatorId: deviceData.incubators[0].id }));
    }
    if (!batchForm.flockGroupId && deviceData.flockGroups.length > 0) {
      setBatchForm((p) => ({ ...p, flockGroupId: deviceData.flockGroups[0].id }));
    }
    if (!eventForm.batchId && deviceData.batches.length > 0) {
      setEventForm((p) => ({ ...p, batchId: deviceData.batches[0].id }));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    setDeviceForm(emptyDevice);
    setEditingDeviceId(null);
    setShowDeviceModal(false);
    setSaving(false);
    await loadData();
  }

  async function removeDevice(id: string) {
    if (!window.confirm("Excluir chocadeira? Lotes vinculados também serão removidos.")) return;
    const res = await fetch(`/api/incubators/devices/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Não foi possível excluir a chocadeira.");
      return;
    }
    await loadData();
  }

  async function saveBatch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const endpoint = editingBatchId ? `/api/incubators/batches/${editingBatchId}` : "/api/incubators/batches";
    const method = editingBatchId ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batchForm)
    });

    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      setError(payload.error ?? "Falha ao salvar lote.");
      setSaving(false);
      return;
    }

    setBatchForm((p) => ({ ...emptyBatch, incubatorId: p.incubatorId, flockGroupId: p.flockGroupId }));
    setEditingBatchId(null);
    setShowBatchModal(false);
    setSaving(false);
    await loadData();
  }

  async function removeBatch(id: string) {
    if (!window.confirm("Excluir lote?")) return;
    const res = await fetch(`/api/incubators/batches/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Não foi possível excluir o lote.");
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

    setEventForm((p) => ({ ...emptyEvent, batchId: p.batchId }));
    setShowEventModal(false);
    setSaving(false);
    await loadData();
  }

  return (
    <main className="space-y-6">
      <PageTitle
        title="Chocadeiras"
        description="Gestão de máquinas, lotes, eventos e desempenho de incubação."
      />

      {error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : null}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">🐣 Chocadeiras</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.activeIncubators ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">📦 Lotes ativos</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.activeBatches ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">✅ Finalizados</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.finalizedBatches ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">📈 Eclosao</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatPercent(metrics?.summary.hatchRate ?? 0)}</p>
        </Card>
      </section>

      <Card>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => { setEditingDeviceId(null); setDeviceForm(emptyDevice); setShowDeviceModal(true); }}>
            Nova chocadeira
          </Button>
          <Button type="button" variant="outline" onClick={() => { setEditingBatchId(null); setShowBatchModal(true); }}>
            Novo lote
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowEventModal(true)}>
            Registrar evento do lote
          </Button>
        </div>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="hidden">
          <h3 className="text-base font-semibold text-zinc-900">Registrar evento do lote</h3>
          <form className="mt-4 grid gap-3" onSubmit={createEvent}>
            <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={eventForm.batchId} onChange={(e) => setEventForm((p) => ({ ...p, batchId: e.target.value }))}>
              <option value="">Selecione o lote</option>
              {activeBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.incubator.name} • {batch.flockGroup.title} • {new Date(batch.entryDate).toLocaleDateString("pt-BR")}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={eventForm.type} onChange={(e) => setEventForm((p) => ({ ...p, type: e.target.value as EventForm["type"] }))}>
                <option value="HATCHED">Nasceram</option>
                <option value="INFERTILE">Inférteis</option>
                <option value="EMBRYO_LOSS">Perda embrionária</option>
                <option value="PIPPED_DIED">Bicou e morreu</option>
                <option value="IN_PROGRESS">Em andamento</option>
                <option value="OTHER">Outro</option>
              </select>
              <Input type="number" min={0} value={eventForm.quantity} onChange={(e) => setEventForm((p) => ({ ...p, quantity: Number(e.target.value) }))} />
            </div>
            <Input type="date" value={eventForm.eventDate} onChange={(e) => setEventForm((p) => ({ ...p, eventDate: e.target.value }))} />
            <Input placeholder="Observações" value={eventForm.notes} onChange={(e) => setEventForm((p) => ({ ...p, notes: e.target.value }))} />
            <Button type="submit" disabled={saving}>{saving ? "Registrando..." : "Registrar evento"}</Button>
          </form>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-zinc-900">Dashboard de desempenho</h3>
          <div className="mt-3 grid gap-2 text-sm text-zinc-700">
            <p>Taxa de infertilidade: {formatPercent(metrics?.summary.infertilityRate ?? 0)}</p>
            <p>Taxa de perda embrionária: {formatPercent(metrics?.summary.embryoLossRate ?? 0)}</p>
            <p>Taxa de bicados sem sucesso: {formatPercent(metrics?.summary.pippedDiedRate ?? 0)}</p>
          </div>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.performanceByIncubator ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="hatchRate" fill="#0f766e" name="Taxa eclosão" />
                <Bar dataKey="infertilityRate" fill="#ef4444" name="Taxa infertilidade" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <Card>
        <h3 className="text-base font-semibold text-zinc-900">Chocadeiras cadastradas</h3>
        {loading ? <p className="mt-4 text-sm text-zinc-500">Carregando...</p> : null}
        {!loading && devices.length === 0 ? <p className="mt-4 text-sm text-zinc-500">Nenhuma chocadeira cadastrada.</p> : null}
        {!loading && devices.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="py-2 pr-3">Nome</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Descrição</th>
                  <th className="py-2 pr-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-3 font-medium text-zinc-900">{device.name}</td>
                    <td className="py-2 pr-3">{device.status}</td>
                    <td className="py-2 pr-3">{device.description || "-"}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => { setEditingDeviceId(device.id); setDeviceForm({ name: device.name, description: device.description ?? "", notes: device.notes ?? "", status: device.status }); setShowDeviceModal(true); }}>
                          Editar
                        </Button>
                        <Button variant="danger" type="button" onClick={() => removeDevice(device.id)}>
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Card>
        <h3 className="text-base font-semibold text-zinc-900">Lotes</h3>
        {loading ? <p className="mt-4 text-sm text-zinc-500">Carregando...</p> : null}
        {!loading && batches.length === 0 ? <p className="mt-4 text-sm text-zinc-500">Nenhum lote cadastrado.</p> : null}
        {!loading && batches.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="py-2 pr-3">Entrada</th>
                  <th className="py-2 pr-3">Chocadeira</th>
                  <th className="py-2 pr-3">Grupo origem</th>
                  <th className="py-2 pr-3">Qtd ovos</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Desempenho</th>
                  <th className="py-2 pr-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id} className="border-b border-zinc-100 align-top">
                    <td className="py-2 pr-3">{new Date(batch.entryDate).toLocaleDateString("pt-BR")}</td>
                    <td className="py-2 pr-3">{batch.incubator.name}</td>
                    <td className="py-2 pr-3">{batch.flockGroup.title}</td>
                    <td className="py-2 pr-3">{batch.eggsSet}</td>
                    <td className="py-2 pr-3">{batch.status}</td>
                    <td className="py-2 pr-3">
                      <p>Eclosão: {formatPercent(batch.stats.hatchRate)}</p>
                      <p>Inférteis: {formatPercent(batch.stats.infertilityRate)}</p>
                      <p>Perda embr.: {formatPercent(batch.stats.embryoLossRate)}</p>
                      <p>Bicados: {formatPercent(batch.stats.pippedDiedRate)}</p>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => {
                            setEditingBatchId(batch.id);
                            setBatchForm({
                              incubatorId: batch.incubatorId,
                              flockGroupId: batch.flockGroupId,
                              entryDate: toDateInput(batch.entryDate),
                              eggsSet: batch.eggsSet,
                              expectedHatchDate: toDateInput(batch.expectedHatchDate),
                              notes: batch.notes ?? "",
                              status: batch.status
                            });
                            setShowBatchModal(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button variant="danger" type="button" onClick={() => removeBatch(batch.id)}>
                          Excluir
                        </Button>
                      </div>
                      {batch.events.length > 0 ? (
                        <div className="mt-2 rounded-md bg-zinc-50 p-2 text-xs text-zinc-600">
                          <p className="font-semibold text-zinc-700">Eventos</p>
                          {batch.events.slice(0, 4).map((event) => (
                            <p key={event.id}>
                              {new Date(event.eventDate).toLocaleDateString("pt-BR")}: {event.type} ({event.quantity})
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <AppModal
        open={showDeviceModal}
        title={editingDeviceId ? "Editar chocadeira" : "Nova chocadeira"}
        onClose={() => {
          setShowDeviceModal(false);
          setEditingDeviceId(null);
          setDeviceForm(emptyDevice);
        }}
      >
        <form className="grid gap-3" onSubmit={saveDevice}>
          <Input placeholder="Nome/identificação" value={deviceForm.name} onChange={(e) => setDeviceForm((p) => ({ ...p, name: e.target.value }))} />
          <Input placeholder="Descrição" value={deviceForm.description} onChange={(e) => setDeviceForm((p) => ({ ...p, description: e.target.value }))} />
          <Input placeholder="Observações" value={deviceForm.notes} onChange={(e) => setDeviceForm((p) => ({ ...p, notes: e.target.value }))} />
          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={deviceForm.status} onChange={(e) => setDeviceForm((p) => ({ ...p, status: e.target.value as DeviceForm["status"] }))}>
            <option value="ACTIVE">Ativa</option>
            <option value="INACTIVE">Inativa</option>
            <option value="MAINTENANCE">Manutenção</option>
          </select>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingDeviceId ? "Atualizar" : "Cadastrar"}</Button>
            <Button type="button" variant="outline" onClick={() => { setShowDeviceModal(false); setEditingDeviceId(null); setDeviceForm(emptyDevice); }}>
              Cancelar
            </Button>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={showBatchModal}
        title={editingBatchId ? "Editar lote" : "Novo lote"}
        onClose={() => {
          setShowBatchModal(false);
          setEditingBatchId(null);
        }}
      >
        <form className="grid gap-3" onSubmit={saveBatch}>
          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={batchForm.incubatorId} onChange={(e) => setBatchForm((p) => ({ ...p, incubatorId: e.target.value }))}>
            <option value="">Selecione a chocadeira</option>
            {devices.map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
          </select>
          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={batchForm.flockGroupId} onChange={(e) => setBatchForm((p) => ({ ...p, flockGroupId: e.target.value }))}>
            <option value="">Selecione o grupo de origem</option>
            {flockGroups.map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={batchForm.entryDate} onChange={(e) => setBatchForm((p) => ({ ...p, entryDate: e.target.value }))} />
            <Input type="date" value={batchForm.expectedHatchDate} onChange={(e) => setBatchForm((p) => ({ ...p, expectedHatchDate: e.target.value }))} />
          </div>
          <Input type="number" min={1} value={batchForm.eggsSet} onChange={(e) => setBatchForm((p) => ({ ...p, eggsSet: Number(e.target.value) }))} placeholder="Quantidade de ovos" />
          <Input placeholder="Observações" value={batchForm.notes} onChange={(e) => setBatchForm((p) => ({ ...p, notes: e.target.value }))} />
          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={batchForm.status} onChange={(e) => setBatchForm((p) => ({ ...p, status: e.target.value as BatchForm["status"] }))}>
            <option value="ACTIVE">Ativo</option>
            <option value="HATCHED">Finalizado com eclosão</option>
            <option value="FAILED">Falhou</option>
            <option value="CANCELED">Cancelado</option>
          </select>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingBatchId ? "Atualizar" : "Cadastrar"}</Button>
            <Button type="button" variant="outline" onClick={() => { setShowBatchModal(false); setEditingBatchId(null); }}>
              Cancelar
            </Button>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={showEventModal}
        title="Registrar evento do lote"
        onClose={() => setShowEventModal(false)}
      >
        <form className="grid gap-3" onSubmit={createEvent}>
          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={eventForm.batchId} onChange={(e) => setEventForm((p) => ({ ...p, batchId: e.target.value }))}>
            <option value="">Selecione o lote</option>
            {activeBatches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.incubator.name} - {batch.flockGroup.title} - {new Date(batch.entryDate).toLocaleDateString("pt-BR")}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={eventForm.type} onChange={(e) => setEventForm((p) => ({ ...p, type: e.target.value as EventForm["type"] }))}>
              <option value="HATCHED">Nasceram</option>
              <option value="INFERTILE">Inférteis</option>
              <option value="EMBRYO_LOSS">Perda embrionária</option>
              <option value="PIPPED_DIED">Bicou e morreu</option>
              <option value="IN_PROGRESS">Em andamento</option>
              <option value="OTHER">Outro</option>
            </select>
            <Input type="number" min={0} value={eventForm.quantity} onChange={(e) => setEventForm((p) => ({ ...p, quantity: Number(e.target.value) }))} />
          </div>
          <Input type="date" value={eventForm.eventDate} onChange={(e) => setEventForm((p) => ({ ...p, eventDate: e.target.value }))} />
          <Input placeholder="Observações" value={eventForm.notes} onChange={(e) => setEventForm((p) => ({ ...p, notes: e.target.value }))} />
          <Button type="submit" disabled={saving}>{saving ? "Registrando..." : "Registrar evento"}</Button>
        </form>
      </AppModal>
    </main>
  );
}

