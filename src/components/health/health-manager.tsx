"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteActionButton } from "@/components/ui/delete-action-button";
import { Input } from "@/components/ui/input";
import { AppModal } from "@/components/ui/app-modal";

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

type QuarantineTemplate = {
  id: string;
  name: string;
};

type QuarantineTreatment = {
  id?: string;
  templateId?: string | null;
  label: string;
  startDate: string;
  notes?: string | null;
};

type QuarantineCaseItem = {
  id: string;
  birdId: string;
  infirmaryId: string;
  entryDate: string;
  expectedExitDate: string;
  notes: string | null;
  status: "ACTIVE" | "COMPLETED" | "CANCELED";
  bird: {
    id: string;
    ringNumber: string;
    nickname: string | null;
    status: string;
    flockGroup: { title: string };
  };
  infirmary: { id: string; name: string; status: string };
  treatments: QuarantineTreatment[];
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

type QuarantineForm = {
  birdId: string;
  infirmaryId: string;
  entryDate: string;
  expectedExitDate: string;
  notes: string;
};

type OptionalTreatmentState = {
  enabled: boolean;
  startDate: string;
  notes: string;
};

const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

function addDays(dateInput: string, days: number) {
  const base = new Date(`${dateInput}T12:00:00`);
  if (Number.isNaN(base.getTime())) return dateInput;
  base.setDate(base.getDate() + days);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
}

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
const emptyQuarantine: QuarantineForm = {
  birdId: "",
  infirmaryId: "",
  entryDate: today,
  expectedExitDate: addDays(today, 21),
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
  if (type === "TRANSFER") return "Transferencia";
  if (type === "CURE") return "Alta / cura";
  if (type === "DEATH") return "Obito";
  return type;
}

function quarantineStatusLabel(status: QuarantineCaseItem["status"]) {
  if (status === "ACTIVE") return "Ativa";
  if (status === "COMPLETED") return "Concluida";
  return "Cancelada";
}

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function HealthManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [infirmaries, setInfirmaries] = useState<Infirmary[]>([]);
  const [birds, setBirds] = useState<BirdOption[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const [quarantineTemplates, setQuarantineTemplates] = useState<QuarantineTemplate[]>([]);
  const [quarantineCases, setQuarantineCases] = useState<QuarantineCaseItem[]>([]);

  const [infirmaryForm, setInfirmaryForm] = useState<InfirmaryForm>(emptyInfirmary);
  const [caseForm, setCaseForm] = useState<CaseForm>(emptyCase);
  const [editingInfirmaryId, setEditingInfirmaryId] = useState<string | null>(null);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [showInfirmaryModal, setShowInfirmaryModal] = useState(false);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [showQuarantineModal, setShowQuarantineModal] = useState(false);

  const [timelineByCase, setTimelineByCase] = useState<Record<string, TimelineEvent[]>>({});
  const [eventByCase, setEventByCase] = useState<Record<string, EventDraft>>({});

  const [quarantineForm, setQuarantineForm] = useState<QuarantineForm>(emptyQuarantine);
  const [optionalTreatments, setOptionalTreatments] = useState<Record<string, OptionalTreatmentState>>({});
  const [newTemplateName, setNewTemplateName] = useState("");
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  const inTreatmentCases = useMemo(() => cases.filter((c) => c.status === "TREATING"), [cases]);
  const activeQuarantines = useMemo(
    () => quarantineCases.filter((item) => item.status === "ACTIVE"),
    [quarantineCases]
  );

  function ensureOptionalTreatmentMap(templates: QuarantineTemplate[], preserve?: Record<string, OptionalTreatmentState>) {
    const next: Record<string, OptionalTreatmentState> = {};
    templates.forEach((template) => {
      const prev = preserve?.[template.id];
      next[template.id] = {
        enabled: prev?.enabled ?? false,
        startDate: prev?.startDate ?? quarantineForm.entryDate,
        notes: prev?.notes ?? ""
      };
    });
    return next;
  }

  function resetQuarantineForm(nextBirds?: BirdOption[], nextInfirmaries?: Infirmary[]) {
    const birdList = nextBirds ?? birds;
    const infirmaryList = nextInfirmaries ?? infirmaries;
    const entryDate = today;
    setQuarantineForm({
      birdId: birdList[0]?.id ?? "",
      infirmaryId: infirmaryList[0]?.id ?? "",
      entryDate,
      expectedExitDate: addDays(entryDate, 21),
      notes: ""
    });
    setOptionalTreatments(ensureOptionalTreatmentMap(quarantineTemplates));
    setNewTemplateName("");
  }

  async function loadData() {
    setLoading(true);
    setError(null);

    const [ctxRes, metricRes, templateRes, quarantineRes] = await Promise.all([
      fetch("/api/health/infirmaries", { cache: "no-store" }),
      fetch("/api/health/metrics", { cache: "no-store" }),
      fetch("/api/health/quarantine/templates", { cache: "no-store" }),
      fetch("/api/health/quarantine/cases", { cache: "no-store" })
    ]);

    if (!ctxRes.ok || !metricRes.ok || !templateRes.ok || !quarantineRes.ok) {
      setError("Nao foi possivel carregar os dados de sanidade.");
      setLoading(false);
      return;
    }

    const ctx = (await ctxRes.json()) as { infirmaries: Infirmary[]; birds: BirdOption[]; cases: CaseItem[] };
    const metric = (await metricRes.json()) as Metrics;
    const templatesPayload = (await templateRes.json()) as { templates: QuarantineTemplate[] };
    const quarantinePayload = (await quarantineRes.json()) as { quarantineCases: QuarantineCaseItem[] };

    setInfirmaries(ctx.infirmaries);
    setBirds(ctx.birds);
    setCases(ctx.cases);
    setMetrics(metric);
    setQuarantineTemplates(templatesPayload.templates);
    setQuarantineCases(quarantinePayload.quarantineCases);

    setCaseForm((prev) => ({
      ...prev,
      birdId: prev.birdId || ctx.birds[0]?.id || "",
      infirmaryId: prev.infirmaryId || ctx.infirmaries[0]?.id || ""
    }));

    setQuarantineForm((prev) => ({
      ...prev,
      birdId: prev.birdId || ctx.birds[0]?.id || "",
      infirmaryId: prev.infirmaryId || ctx.infirmaries[0]?.id || "",
      entryDate: prev.entryDate || today,
      expectedExitDate: prev.expectedExitDate || addDays(prev.entryDate || today, 21)
    }));

    setOptionalTreatments((prev) => ensureOptionalTreatmentMap(templatesPayload.templates, prev));
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveInfirmary(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const endpoint = editingInfirmaryId ? `/api/health/infirmaries/${editingInfirmaryId}` : "/api/health/infirmaries";
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
    setShowInfirmaryModal(false);
    setSaving(false);
    await loadData();
  }

  async function removeInfirmary(id: string) {
    if (!window.confirm("Excluir enfermaria?")) return;
    const res = await fetch(`/api/health/infirmaries/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Nao foi possivel excluir enfermaria.");
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
      setError(payload.error ?? "Falha ao salvar caso clinico.");
      setSaving(false);
      return;
    }

    setCaseForm((p) => ({ ...emptyCase, birdId: p.birdId, infirmaryId: p.infirmaryId }));
    setEditingCaseId(null);
    setShowCaseModal(false);
    setSaving(false);
    await loadData();
  }

  async function removeCase(id: string) {
    if (!window.confirm("Excluir caso clinico?")) return;
    const res = await fetch(`/api/health/cases/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Nao foi possivel excluir caso clinico.");
      return;
    }
    await loadData();
  }

  async function loadTimeline(caseId: string) {
    if (timelineByCase[caseId]) {
      setTimelineByCase((prev) => {
        const next = { ...prev };
        delete next[caseId];
        return next;
      });
      return;
    }

    const res = await fetch(`/api/health/cases/${caseId}/timeline`, { cache: "no-store" });
    if (!res.ok) {
      setError("Nao foi possivel carregar timeline.");
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
      setError(payload.error ?? "Falha ao aplicar evento clinico.");
      return;
    }

    setEventByCase((prev) => {
      const next = { ...prev };
      delete next[caseId];
      return next;
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

  async function createChecklistTemplate() {
    if (!newTemplateName.trim()) return;
    setCreatingTemplate(true);
    setError(null);
    const res = await fetch("/api/health/quarantine/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTemplateName.trim() })
    });

    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      setError(payload.error ?? "Falha ao criar item de checklist.");
      setCreatingTemplate(false);
      return;
    }

    const created = (await res.json()) as QuarantineTemplate;
    const nextTemplates = [...quarantineTemplates, created].sort((a, b) => a.name.localeCompare(b.name));
    setQuarantineTemplates(nextTemplates);
    setOptionalTreatments((prev) => {
      const next = ensureOptionalTreatmentMap(nextTemplates, prev);
      next[created.id] = {
        enabled: true,
        startDate: quarantineForm.entryDate,
        notes: ""
      };
      return next;
    });
    setNewTemplateName("");
    setCreatingTemplate(false);
  }

  function onEntryDateChange(nextDate: string) {
    setQuarantineForm((prev) => ({
      ...prev,
      entryDate: nextDate,
      expectedExitDate: prev.expectedExitDate || addDays(nextDate, 21)
    }));
    setOptionalTreatments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (!next[key].startDate) next[key] = { ...next[key], startDate: nextDate };
      });
      return next;
    });
  }

  async function saveQuarantineCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const optionalPayload = quarantineTemplates
      .map((tpl) => ({
        tpl,
        state: optionalTreatments[tpl.id]
      }))
      .filter((item) => item.state?.enabled)
      .map((item) => ({
        label: item.tpl.name,
        startDate: item.state?.startDate || quarantineForm.entryDate,
        notes: item.state?.notes || "",
        templateId: item.tpl.id
      }));

    const payload = {
      ...quarantineForm,
      treatments: optionalPayload
    };

    const res = await fetch("/api/health/quarantine/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      setError(err.error ?? "Falha ao salvar quarentena.");
      setSaving(false);
      return;
    }

    setShowQuarantineModal(false);
    setSaving(false);
    await loadData();
    resetQuarantineForm();
  }

  return (
    <main className="space-y-6">
      <PageTitle
        title="Sanidade / Enfermaria"
        description="Controle clinico com enfermarias, timeline e quarentena de novas aves."
        icon="\u{1F48A}"
      />

      {error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : null}

      <section className="mobile-kpi-grid grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">💊 Em tratamento</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.inTreatment ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">✅ Taxa cura</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatPercent(metrics?.summary.cureRate ?? 0)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">☠️ Mortalidade</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatPercent(metrics?.summary.mortalityRate ?? 0)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">📆 Recuperacao media</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.avgRecoveryDays ?? 0} dias</p>
        </Card>
      </section>

      <Card>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => {
              setEditingInfirmaryId(null);
              setInfirmaryForm(emptyInfirmary);
              setShowInfirmaryModal(true);
            }}
          >
            Cadastro de enfermaria
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditingCaseId(null);
              setShowCaseModal(true);
            }}
          >
            Novo caso clinico
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetQuarantineForm();
              setShowQuarantineModal(true);
            }}
          >
            Quarentena nova ave
          </Button>
        </div>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-base font-semibold text-zinc-900">Diagnosticos recorrentes</h3>
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
          <h3 className="text-base font-semibold text-zinc-900">Evolucao de casos</h3>
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
                  <th className="py-2 pr-3">Observacoes</th>
                  <th className="py-2 pr-3">Acoes</th>
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
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => {
                            setEditingInfirmaryId(inf.id);
                            setInfirmaryForm({ name: inf.name, notes: inf.notes ?? "", status: inf.status });
                            setShowInfirmaryModal(true);
                          }}
                        >
                          Editar
                        </Button>
                        <DeleteActionButton
                          onClick={() => removeInfirmary(inf.id)}
                          aria-label="Excluir enfermaria"
                        />
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
        <h3 className="text-base font-semibold text-zinc-900">Casos clinicos</h3>
        {!loading && cases.length === 0 ? <p className="mt-4 text-sm text-zinc-500">Nenhum caso registrado.</p> : null}
        {!loading && cases.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="py-2 pr-3">Anilha</th>
                  <th className="py-2 pr-3">Enfermaria</th>
                  <th className="py-2 pr-3">Diagnostico</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Acoes clinicas</th>
                  <th className="py-2 pr-3">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((item) => {
                  const draft = getEventDraft(item.id);
                  return (
                    <Fragment key={item.id}>
                      <tr className="border-b border-zinc-100 align-top">
                        <td className="py-2 pr-3 font-medium text-zinc-900">
                          {item.bird.ringNumber}
                          <p className="text-xs font-normal text-zinc-500">{item.bird.flockGroup.title}</p>
                        </td>
                        <td className="py-2 pr-3">{item.infirmary.name}</td>
                        <td className="py-2 pr-3">{item.diagnosis || "Nao informado"}</td>
                        <td className="py-2 pr-3">{statusLabel(item.status)}</td>
                        <td className="py-2 pr-3">
                          {item.status === "TREATING" ? (
                            <div className="grid gap-2">
                              <select
                                className="h-10 rounded-md border border-zinc-300 bg-white px-2 text-sm"
                                value={draft.action}
                                onChange={(e) => setEventDraft(item.id, { action: e.target.value as EventDraft["action"] })}
                              >
                                <option value="CONTINUE">Continua em tratamento</option>
                                <option value="CURE">Curada</option>
                                <option value="DEATH">Morreu</option>
                                <option value="TRANSFER">Transferida</option>
                              </select>
                              <Input type="date" value={draft.date} onChange={(e) => setEventDraft(item.id, { date: e.target.value })} />
                              {draft.action === "TRANSFER" ? (
                                <select
                                  className="h-10 rounded-md border border-zinc-300 bg-white px-2 text-sm"
                                  value={draft.toInfirmaryId}
                                  onChange={(e) => setEventDraft(item.id, { toInfirmaryId: e.target.value })}
                                >
                                  <option value="">Selecione destino</option>
                                  {infirmaries
                                    .filter((inf) => inf.id !== item.infirmaryId)
                                    .map((inf) => (
                                      <option key={inf.id} value={inf.id}>
                                        {inf.name}
                                      </option>
                                    ))}
                                </select>
                              ) : null}
                              <Input
                                placeholder="Observacoes do evento"
                                value={draft.notes}
                                onChange={(e) => setEventDraft(item.id, { notes: e.target.value })}
                              />
                              <Button type="button" variant="outline" onClick={() => applyCaseAction(item.id)}>
                                Aplicar evento
                              </Button>
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
                                setShowCaseModal(true);
                              }}
                            >
                              Editar
                            </Button>
                            <Button variant="outline" type="button" onClick={() => loadTimeline(item.id)}>
                              {timelineByCase[item.id] ? "Ocultar timeline" : "Ver timeline"}
                            </Button>
                            <DeleteActionButton
                              onClick={() => removeCase(item.id)}
                              aria-label="Excluir caso clinico"
                            />
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
                                    {new Date(event.createdAt).toLocaleString("pt-BR")} - {timelineTypeLabel(event.type)}
                                    {event.notes ? ` - ${event.notes}` : ""}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Card>
        <h3 className="text-base font-semibold text-zinc-900">Quarentenas de novas aves</h3>
        {activeQuarantines.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Nenhuma ave em quarentena no momento.</p>
        ) : (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {activeQuarantines.map((item) => (
              <div key={item.id} className="rounded-lg border border-zinc-200 bg-white p-3">
                <p className="text-sm font-semibold text-zinc-900">Anilha {item.bird.ringNumber}</p>
                <p className="text-xs text-zinc-600">{item.bird.flockGroup.title}</p>
                <p className="mt-2 text-xs text-zinc-600">Enfermaria: {item.infirmary.name}</p>
                <p className="text-xs text-zinc-600">Entrada: {toDateInput(item.entryDate)}</p>
                <p className="text-xs text-zinc-600">Saida prevista: {toDateInput(item.expectedExitDate)}</p>
                <p className="text-xs text-zinc-600">Status: {quarantineStatusLabel(item.status)}</p>
                <div className="mt-2 border-t border-zinc-100 pt-2">
                  <p className="text-xs font-semibold text-zinc-700">Tratamentos</p>
                  <ul className="mt-1 space-y-1 text-xs text-zinc-600">
                    {item.treatments.map((treat) => (
                      <li key={treat.id || `${item.id}-${treat.label}`}>
                        {treat.label} - inicio {toDateInput(treat.startDate)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-base font-semibold text-zinc-900">Internacoes atuais</h3>
        {inTreatmentCases.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Nenhuma ave internada no momento.</p>
        ) : (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {inTreatmentCases.map((item) => (
              <div key={item.id} className="rounded-lg border border-zinc-200 bg-white p-3">
                <p className="text-sm font-semibold text-zinc-900">Anilha {item.bird.ringNumber}</p>
                <p className="text-xs text-zinc-600">{item.infirmary.name}</p>
                <p className="mt-2 text-xs text-zinc-600">Diagnostico: {item.diagnosis || "-"}</p>
                <p className="text-xs text-zinc-600">Responsavel: {item.responsible || "-"}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AppModal
        open={showInfirmaryModal}
        title={editingInfirmaryId ? "Editar enfermaria" : "Cadastro de enfermaria"}
        onClose={() => {
          setShowInfirmaryModal(false);
          setEditingInfirmaryId(null);
          setInfirmaryForm(emptyInfirmary);
        }}
      >
        <form className="grid gap-3" onSubmit={saveInfirmary}>
          <Input placeholder="Nome/identificacao" value={infirmaryForm.name} onChange={(e) => setInfirmaryForm((p) => ({ ...p, name: e.target.value }))} />
          <Input placeholder="Observacoes" value={infirmaryForm.notes} onChange={(e) => setInfirmaryForm((p) => ({ ...p, notes: e.target.value }))} />
          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={infirmaryForm.status} onChange={(e) => setInfirmaryForm((p) => ({ ...p, status: e.target.value as InfirmaryForm["status"] }))}>
            <option value="ACTIVE">Ativa</option>
            <option value="INACTIVE">Inativa</option>
          </select>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingInfirmaryId ? "Atualizar" : "Cadastrar"}</Button>
            <Button type="button" variant="outline" onClick={() => { setShowInfirmaryModal(false); setEditingInfirmaryId(null); setInfirmaryForm(emptyInfirmary); }}>
              Cancelar
            </Button>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={showCaseModal}
        title={editingCaseId ? "Editar caso clinico" : "Novo caso clinico"}
        onClose={() => {
          setShowCaseModal(false);
          setEditingCaseId(null);
        }}
      >
        <form className="grid gap-3" onSubmit={saveCase}>
          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={caseForm.birdId} onChange={(e) => setCaseForm((p) => ({ ...p, birdId: e.target.value }))}>
            <option value="">Selecione a ave (anilha)</option>
            {birds.map((bird) => (
              <option key={bird.id} value={bird.id}>
                {bird.ringNumber}{bird.nickname ? ` - ${bird.nickname}` : ""}
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
          <Input placeholder="Diagnostico/suspeita" value={caseForm.diagnosis} onChange={(e) => setCaseForm((p) => ({ ...p, diagnosis: e.target.value }))} />
          <Input placeholder="Sintomas" value={caseForm.symptoms} onChange={(e) => setCaseForm((p) => ({ ...p, symptoms: e.target.value }))} />
          <Input placeholder="Medicacao" value={caseForm.medication} onChange={(e) => setCaseForm((p) => ({ ...p, medication: e.target.value }))} />
          <Input placeholder="Dosagem" value={caseForm.dosage} onChange={(e) => setCaseForm((p) => ({ ...p, dosage: e.target.value }))} />
          <Input placeholder="Responsavel" value={caseForm.responsible} onChange={(e) => setCaseForm((p) => ({ ...p, responsible: e.target.value }))} />
          <Input placeholder="Observacoes" value={caseForm.notes} onChange={(e) => setCaseForm((p) => ({ ...p, notes: e.target.value }))} />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingCaseId ? "Atualizar" : "Cadastrar"}</Button>
            <Button type="button" variant="outline" onClick={() => { setShowCaseModal(false); setEditingCaseId(null); }}>
              Cancelar
            </Button>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={showQuarantineModal}
        title="Quarentena nova ave"
        onClose={() => {
          setShowQuarantineModal(false);
        }}
      >
        <form className="grid gap-4" onSubmit={saveQuarantineCase}>
          <div className="grid gap-3 md:grid-cols-2">
            <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={quarantineForm.birdId} onChange={(e) => setQuarantineForm((p) => ({ ...p, birdId: e.target.value }))}>
              <option value="">Selecione a ave (anilha)</option>
              {birds.map((bird) => (
                <option key={bird.id} value={bird.id}>
                  {bird.ringNumber}{bird.nickname ? ` - ${bird.nickname}` : ""}
                </option>
              ))}
            </select>
            <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={quarantineForm.infirmaryId} onChange={(e) => setQuarantineForm((p) => ({ ...p, infirmaryId: e.target.value }))}>
              <option value="">Selecione a enfermaria de quarentena</option>
              {infirmaries.map((inf) => (
                <option key={inf.id} value={inf.id}>{inf.name}</option>
              ))}
            </select>
            <Input type="date" value={quarantineForm.entryDate} onChange={(e) => onEntryDateChange(e.target.value)} />
            <Input type="date" value={quarantineForm.expectedExitDate} onChange={(e) => setQuarantineForm((p) => ({ ...p, expectedExitDate: e.target.value }))} />
          </div>
          <Input placeholder="Observacoes gerais da quarentena" value={quarantineForm.notes} onChange={(e) => setQuarantineForm((p) => ({ ...p, notes: e.target.value }))} />

          <div className="rounded-lg border border-zinc-200 p-3">
            <p className="text-sm font-semibold text-zinc-900">Checklist extra reutilizavel</p>
            <p className="text-xs text-zinc-500">Cadastre vacinas e tratamentos especificos para reaproveitar em toda nova quarentena.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Input
                className="min-w-[220px] flex-1"
                placeholder="Exemplo: Vacina Newcastle"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
              <Button type="button" variant="outline" disabled={creatingTemplate} onClick={createChecklistTemplate}>
                {creatingTemplate ? "Salvando..." : "Cadastrar item"}
              </Button>
            </div>
            {quarantineTemplates.length === 0 ? (
              <p className="mt-3 text-xs text-zinc-500">Ainda nao ha itens extras cadastrados.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {quarantineTemplates.map((template) => {
                  const state = optionalTreatments[template.id] ?? { enabled: false, startDate: quarantineForm.entryDate, notes: "" };
                  return (
                    <div key={template.id} className="rounded-md border border-zinc-200 p-3">
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                        <input
                          type="checkbox"
                          checked={state.enabled}
                          onChange={(e) =>
                            setOptionalTreatments((prev) => ({
                              ...prev,
                              [template.id]: { ...state, enabled: e.target.checked }
                            }))
                          }
                        />
                        {template.name}
                      </label>
                      {state.enabled ? (
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          <Input
                            type="date"
                            value={state.startDate}
                            onChange={(e) =>
                              setOptionalTreatments((prev) => ({
                                ...prev,
                                [template.id]: { ...state, startDate: e.target.value }
                              }))
                            }
                          />
                          <Input
                            placeholder={`Observacoes de ${template.name}`}
                            value={state.notes}
                            onChange={(e) =>
                              setOptionalTreatments((prev) => ({
                                ...prev,
                                [template.id]: { ...state, notes: e.target.value }
                              }))
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar quarentena"}</Button>
            <Button type="button" variant="outline" onClick={() => setShowQuarantineModal(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </AppModal>
    </main>
  );
}
