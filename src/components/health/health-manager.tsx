"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Infirmary = {
  id: string;
  name: string;
  notes: string | null;
  status: "ACTIVE" | "INACTIVE";
};

type BirdOption = {
  id: string;
  ringNumber: string;
  nickname: string | null;
  status: string;
};

type TimelineEvent = {
  id: string;
  type: string;
  notes: string | null;
  fromInfirmaryId: string | null;
  toInfirmaryId: string | null;
  createdAt: string;
};

type CaseItem = {
  id: string;
  birdId: string;
  infirmaryId: string;
  openedAt: string;
  diagnosis: string | null;
  symptoms: string | null;
  medication: string | null;
  dosage: string | null;
  responsible: string | null;
  notes: string | null;
  status: "TREATING" | "CURED" | "DEAD" | "TRANSFERRED";
  closedAt: string | null;
  bird: {
    id: string;
    ringNumber: string;
    nickname: string | null;
    status: string;
    flockGroup: { title: string };
  };
  infirmary: { id: string; name: string; status: string };
  events: TimelineEvent[];
};

type Metrics = {
  summary: {
    inTreatment: number;
    cureRate: number;
    mortalityRate: number;
    avgRecoveryDays: number;
  };
  topDiagnoses: Array<{ diagnosis: string; count: number }>;
  evolution: Array<{ month: string; opened: number; cured: number; dead: number }>;
};

type InfirmaryForm = {
  name: string;
  notes: string;
  status: "ACTIVE" | "INACTIVE";
};

type CaseForm = {
  birdId: string;
  infirmaryId: string;
  openedAt: string;
  diagnosis: string;
  symptoms: string;
  medication: string;
  dosage: string;
  responsible: string;
  notes: string;
};

type EventDraft = {
  action: "CONTINUE" | "CURE" | "DEATH" | "TRANSFER";
  date: string;
  notes: string;
  toInfirmaryId: string;
};

const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

const emptyInfirmary: InfirmaryForm = { name: "", notes: "", status: "ACTIVE" };
const emptyCase: CaseForm = {
  birdId: "",
  infirmaryId: "",
  openedAt: today,
  diagnosis: "",
  symptoms: "",
  medication: "",
  dosage: "",
  responsible: "",
  notes: ""
};

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function statusLabel(status: CaseItem["status"]) {
  if (status === "TREATING") return "Em tratamento";
  if (status === "CURED") return "Curada";
  if (status === "DEAD") return "Morreu";
  return "Transferida";
}

function timelineTypeLabel(type: string) {
  if (type === "ADMISSION") return "Entrada";
  if (type === "CONTINUE") return "Continua tratamento";
  if (type === "TRANSFER") return "Transferência";
  if (type === "CURE") return "Alta / cura";
  if (type === "DEATH") return "Óbito";
  return type;
}

export function HealthManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [infirmaries, setInfirmaries] = useState<Infirmary[]>([]);
  const [birds, setBirds] = useState<BirdOption[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const [infirmaryForm, setInfirmaryForm] = useState<InfirmaryForm>(emptyInfirmary);
  const [caseForm, setCaseForm] = useState<CaseForm>(emptyCase);
  const [editingInfirmaryId, setEditingInfirmaryId] = useState<string | null>(null);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);

  const [timelineByCase, setTimelineByCase] = useState<Record<string, TimelineEvent[]>>({});
  const [eventByCase, setEventByCase] = useState<Record<string, EventDraft>>({});

  const inTreatmentCases = useMemo(() => cases.filter((c) => c.status === "TREATING"), [cases]);

  async function loadData() {
    setLoading(true);
    setError(null);

    const [ctxRes, metricRes] = await Promise.all([
      fetch("/api/health/infirmaries", { cache: "no-store" }),
      fetch("/api/health/metrics", { cache: "no-store" })
    ]);

    if (!ctxRes.ok || !metricRes.ok) {
      setError("Não foi possível carregar os dados de sanidade.");
      setLoading(false);
      return;
    }

    const ctx = (await ctxRes.json()) as {
      infirmaries: Infirmary[];
      birds: BirdOption[];
      cases: CaseItem[];
    };
    const metric = (await metricRes.json()) as Metrics;

    setInfirmaries(ctx.infirmaries);
    setBirds(ctx.birds);
    setCases(ctx.cases);
    setMetrics(metric);

    if (!caseForm.birdId && ctx.birds.length > 0) {
      setCaseForm((p) => ({ ...p, birdId: ctx.birds[0].id }));
    }
    if (!caseForm.infirmaryId && ctx.infirmaries.length > 0) {
      setCaseForm((p) => ({ ...p, infirmaryId: ctx.infirmaries[0].id }));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveInfirmary(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const endpoint = editingInfirmaryId
      ? `/api/health/infirmaries/${editingInfirmaryId}`
      : "/api/health/infirmaries";
    const method = editingInfirmaryId ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(infirmaryForm)
    });

    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      setError(payload.error ?? "Falha ao salvar enfermaria.");
      setSaving(false);
      return;
    }

    setInfirmaryForm(emptyInfirmary);
    setEditingInfirmaryId(null);
    setSaving(false);
    await loadData();
  }

  async function removeInfirmary(id: string) {
    if (!window.confirm("Excluir enfermaria?")) return;
    const res = await fetch(`/api/health/infirmaries/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Não foi possível excluir enfermaria.");
      return;
    }
    await loadData();
  }

  async function saveCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const endpoint = editingCaseId ? `/api/health/cases/${editingCaseId}` : "/api/health/cases";
    const method = editingCaseId ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(caseForm)
    });

    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      setError(payload.error ?? "Falha ao salvar caso clínico.");
      setSaving(false);
      return;
    }

    setCaseForm((p) => ({ ...emptyCase, birdId: p.birdId, infirmaryId: p.infirmaryId }));
    setEditingCaseId(null);
    setSaving(false);
    await loadData();
  }

  async function removeCase(id: string) {
    if (!window.confirm("Excluir caso clínico?")) return;
    const res = await fetch(`/api/health/cases/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Não foi possível excluir caso clínico.");
      return;
    }
    await loadData();
  }

  async function loadTimeline(caseId: string) {
    if (timelineByCase[caseId]) {
      setTimelineByCase((prev) => {
        const clone = { ...prev };
        delete clone[caseId];
        return clone;
      });
      return;
    }

    const res = await fetch(`/api/health/cases/${caseId}/timeline`, { cache: "no-store" });
    if (!res.ok) {
      setError("Não foi possível carregar timeline.");
      return;
    }

    const data = (await res.json()) as { timeline: TimelineEvent[] };
    setTimelineByCase((prev) => ({ ...prev, [caseId]: data.timeline }));
  }

  function getEventDraft(caseId: string): EventDraft {
    return (
      eventByCase[caseId] ?? {
        action: "CONTINUE",
        date: today,
        notes: "",
        toInfirmaryId: ""
      }
    );
  }

  function setEventDraft(caseId: string, patch: Partial<EventDraft>) {
    setEventByCase((prev) => ({
      ...prev,
      [caseId]: { ...getEventDraft(caseId), ...patch }
    }));
  }

  async function applyCaseAction(caseId: string) {
    const draft = getEventDraft(caseId);

    const res = await fetch(`/api/health/cases/${caseId}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    });

    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      setError(payload.error ?? "Falha ao aplicar ação clínica.");
      return;
    }

    setEventByCase((prev) => {
      const clone = { ...prev };
      delete clone[caseId];
      return clone;
    });

    await loadData();
    if (timelineByCase[caseId]) {
      const timelineRes = await fetch(`/api/health/cases/${caseId}/timeline`, { cache: "no-store" });
      if (timelineRes.ok) {
        const timelineData = (await timelineRes.json()) as { timeline: TimelineEvent[] };
        setTimelineByCase((prev) => ({ ...prev, [caseId]: timelineData.timeline }));
      }
    }
  }

  return (
    <main className="space-y-6">
      <PageTitle
        title="Sanidade / Enfermaria"
        description="Controle clínico com enfermarias, timeline de tratamento e indicadores de recuperação."
      />

      {error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-zinc-500">Aves em tratamento</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.inTreatment ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Taxa de cura</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatPercent(metrics?.summary.cureRate ?? 0)}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Taxa de mortalidade</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatPercent(metrics?.summary.mortalityRate ?? 0)}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Média recuperação (dias)</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.avgRecoveryDays ?? 0}</p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-base font-semibold text-zinc-900">Cadastro de enfermaria</h3>
          <form className="mt-4 grid gap-3" onSubmit={saveInfirmary}>
            <Input placeholder="Nome/identificação" value={infirmaryForm.name} onChange={(e) => setInfirmaryForm((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Observações" value={infirmaryForm.notes} onChange={(e) => setInfirmaryForm((p) => ({ ...p, notes: e.target.value }))} />
            <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={infirmaryForm.status} onChange={(e) => setInfirmaryForm((p) => ({ ...p, status: e.target.value as InfirmaryForm["status"] }))}>
              <option value="ACTIVE">Ativa</option>
              <option value="INACTIVE">Inativa</option>
            </select>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingInfirmaryId ? "Atualizar" : "Cadastrar"}</Button>
              {editingInfirmaryId ? (
                <Button type="button" variant="outline" onClick={() => { setEditingInfirmaryId(null); setInfirmaryForm(emptyInfirmary); }}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-zinc-900">Novo caso clínico</h3>
          <form className="mt-4 grid gap-3" onSubmit={saveCase}>
            <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={caseForm.birdId} onChange={(e) => setCaseForm((p) => ({ ...p, birdId: e.target.value }))}>
              <option value="">Selecione a ave (anilha)</option>
              {birds.map((bird) => (
                <option key={bird.id} value={bird.id}>
                  {bird.ringNumber}{bird.nickname ? ` • ${bird.nickname}` : ""}
                </option>
              ))}
            </select>
            <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={caseForm.infirmaryId} onChange={(e) => setCaseForm((p) => ({ ...p, infirmaryId: e.target.value }))}>
              <option value="">Selecione a enfermaria</option>
              {infirmaries.map((inf) => (
                <option key={inf.id} value={inf.id}>{inf.name}</option>
              ))}
            </select>
            <Input type="date" value={caseForm.openedAt} onChange={(e) => setCaseForm((p) => ({ ...p, openedAt: e.target.value }))} />
            <Input placeholder="Diagnóstico/suspeita" value={caseForm.diagnosis} onChange={(e) => setCaseForm((p) => ({ ...p, diagnosis: e.target.value }))} />
            <Input placeholder="Sintomas" value={caseForm.symptoms} onChange={(e) => setCaseForm((p) => ({ ...p, symptoms: e.target.value }))} />
            <Input placeholder="Medicação" value={caseForm.medication} onChange={(e) => setCaseForm((p) => ({ ...p, medication: e.target.value }))} />
            <Input placeholder="Dosagem" value={caseForm.dosage} onChange={(e) => setCaseForm((p) => ({ ...p, dosage: e.target.value }))} />
            <Input placeholder="Responsável" value={caseForm.responsible} onChange={(e) => setCaseForm((p) => ({ ...p, responsible: e.target.value }))} />
            <Input placeholder="Observações" value={caseForm.notes} onChange={(e) => setCaseForm((p) => ({ ...p, notes: e.target.value }))} />
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingCaseId ? "Atualizar" : "Cadastrar"}</Button>
              {editingCaseId ? (
                <Button type="button" variant="outline" onClick={() => { setEditingCaseId(null); setCaseForm((p) => ({ ...emptyCase, birdId: p.birdId, infirmaryId: p.infirmaryId })); }}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-base font-semibold text-zinc-900">Diagnósticos recorrentes</h3>
          <div className="mt-3 space-y-2 text-sm">
            {(metrics?.topDiagnoses ?? []).length === 0 ? (
              <p className="text-zinc-500">Sem dados suficientes.</p>
            ) : (
              metrics?.topDiagnoses.map((item) => (
                <div key={item.diagnosis} className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2">
                  <span>{item.diagnosis}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-zinc-900">Evolução de casos</h3>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.evolution ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="opened" fill="#0369a1" name="Casos" />
                <Bar dataKey="cured" fill="#16a34a" name="Curadas" />
                <Bar dataKey="dead" fill="#dc2626" name="Mortes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <Card>
        <h3 className="text-base font-semibold text-zinc-900">Enfermarias</h3>
        {loading ? <p className="mt-4 text-sm text-zinc-500">Carregando...</p> : null}
        {!loading && infirmaries.length === 0 ? <p className="mt-4 text-sm text-zinc-500">Nenhuma enfermaria cadastrada.</p> : null}
        {!loading && infirmaries.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="py-2 pr-3">Nome</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Observações</th>
                  <th className="py-2 pr-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {infirmaries.map((inf) => (
                  <tr key={inf.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-3 font-medium text-zinc-900">{inf.name}</td>
                    <td className="py-2 pr-3">{inf.status}</td>
                    <td className="py-2 pr-3">{inf.notes || "-"}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => { setEditingInfirmaryId(inf.id); setInfirmaryForm({ name: inf.name, notes: inf.notes ?? "", status: inf.status }); }}>
                          Editar
                        </Button>
                        <Button variant="danger" type="button" onClick={() => removeInfirmary(inf.id)}>
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
        <h3 className="text-base font-semibold text-zinc-900">Casos clínicos</h3>
        {!loading && cases.length === 0 ? <p className="mt-4 text-sm text-zinc-500">Nenhum caso registrado.</p> : null}
        {!loading && cases.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="py-2 pr-3">Anilha</th>
                  <th className="py-2 pr-3">Enfermaria</th>
                  <th className="py-2 pr-3">Diagnóstico</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Ações clínicas</th>
                  <th className="py-2 pr-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((item) => {
                  const draft = getEventDraft(item.id);
                  return (
                    <>
                      <tr key={item.id} className="border-b border-zinc-100 align-top">
                        <td className="py-2 pr-3 font-medium text-zinc-900">
                          {item.bird.ringNumber}
                          <p className="text-xs font-normal text-zinc-500">{item.bird.flockGroup.title}</p>
                        </td>
                        <td className="py-2 pr-3">{item.infirmary.name}</td>
                        <td className="py-2 pr-3">{item.diagnosis || "Não informado"}</td>
                        <td className="py-2 pr-3">{statusLabel(item.status)}</td>
                        <td className="py-2 pr-3">
                          {item.status === "TREATING" ? (
                            <div className="grid gap-2">
                              <select className="h-10 rounded-md border border-zinc-300 bg-white px-2 text-sm" value={draft.action} onChange={(e) => setEventDraft(item.id, { action: e.target.value as EventDraft["action"] })}>
                                <option value="CONTINUE">Continua em tratamento</option>
                                <option value="CURE">Curada</option>
                                <option value="DEATH">Morreu</option>
                                <option value="TRANSFER">Transferida</option>
                              </select>
                              <Input type="date" value={draft.date} onChange={(e) => setEventDraft(item.id, { date: e.target.value })} />
                              {draft.action === "TRANSFER" ? (
                                <select className="h-10 rounded-md border border-zinc-300 bg-white px-2 text-sm" value={draft.toInfirmaryId} onChange={(e) => setEventDraft(item.id, { toInfirmaryId: e.target.value })}>
                                  <option value="">Selecione destino</option>
                                  {infirmaries.filter((inf) => inf.id !== item.infirmaryId).map((inf) => (
                                    <option key={inf.id} value={inf.id}>{inf.name}</option>
                                  ))}
                                </select>
                              ) : null}
                              <Input placeholder="Observações do evento" value={draft.notes} onChange={(e) => setEventDraft(item.id, { notes: e.target.value })} />
                              <Button type="button" variant="outline" onClick={() => applyCaseAction(item.id)}>Aplicar evento</Button>
                            </div>
                          ) : (
                            <p className="text-xs text-zinc-500">Caso encerrado.</p>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="outline"
                              type="button"
                              onClick={() => {
                                setEditingCaseId(item.id);
                                setCaseForm({
                                  birdId: item.birdId,
                                  infirmaryId: item.infirmaryId,
                                  openedAt: toDateInput(item.openedAt),
                                  diagnosis: item.diagnosis ?? "",
                                  symptoms: item.symptoms ?? "",
                                  medication: item.medication ?? "",
                                  dosage: item.dosage ?? "",
                                  responsible: item.responsible ?? "",
                                  notes: item.notes ?? ""
                                });
                              }}
                            >
                              Editar
                            </Button>
                            <Button variant="outline" type="button" onClick={() => loadTimeline(item.id)}>
                              {timelineByCase[item.id] ? "Ocultar timeline" : "Ver timeline"}
                            </Button>
                            <Button variant="danger" type="button" onClick={() => removeCase(item.id)}>
                              Excluir
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {timelineByCase[item.id] ? (
                        <tr className="border-b border-zinc-100">
                          <td className="py-2 pr-3 text-xs text-zinc-600" colSpan={6}>
                            <p className="mb-2 font-semibold text-zinc-700">Timeline do tratamento</p>
                            {timelineByCase[item.id].length === 0 ? (
                              <p>Sem eventos.</p>
                            ) : (
                              <ul className="space-y-1">
                                {timelineByCase[item.id].map((event) => (
                                  <li key={event.id}>
                                    {new Date(event.createdAt).toLocaleString("pt-BR")} • {timelineTypeLabel(event.type)}
                                    {event.notes ? ` • ${event.notes}` : ""}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Card>
        <h3 className="text-base font-semibold text-zinc-900">Internações atuais</h3>
        {inTreatmentCases.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Nenhuma ave internada no momento.</p>
        ) : (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {inTreatmentCases.map((item) => (
              <div key={item.id} className="rounded-lg border border-zinc-200 bg-white p-3">
                <p className="text-sm font-semibold text-zinc-900">Anilha {item.bird.ringNumber}</p>
                <p className="text-xs text-zinc-600">{item.infirmary.name}</p>
                <p className="mt-2 text-xs text-zinc-600">Diagnóstico: {item.diagnosis || "-"}</p>
                <p className="text-xs text-zinc-600">Responsável: {item.responsible || "-"}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
