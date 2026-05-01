"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
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
  sex: "FEMALE" | "MALE" | "UNKNOWN";
  flockGroup: { id: string; title: string };
};

function birdRoleLabel(sex: BirdOption["sex"]): string {
  if (sex === "FEMALE") return "Matriz";
  if (sex === "MALE") return "Reprodutor";
  return "Filhote";
}

function birdOptionLabel(bird: BirdOption): string {
  const role = birdRoleLabel(bird.sex);
  const base = `${bird.flockGroup.title} · ${role} · ${bird.ringNumber}`;
  return bird.nickname ? `${base} (${bird.nickname})` : base;
}

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
  protocolStartedAt: string | null;
  protocolDurationDays: number;
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
  birdIds: string[];
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
  birdIds: [],
  infirmaryId: "",
  entryDate: today,
  expectedExitDate: addDays(today, 15),
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
  const [caseFlockGroupId, setCaseFlockGroupId] = useState<string>("");
  const [quarantineFlockGroupId, setQuarantineFlockGroupId] = useState<string>("");
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
      birdIds: [],
      infirmaryId: infirmaryList[0]?.id ?? "",
      entryDate,
      expectedExitDate: addDays(entryDate, 15),
      notes: ""
    });
    void birdList;
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
      infirmaryId: prev.infirmaryId || ctx.infirmaries[0]?.id || "",
      entryDate: prev.entryDate || today,
      expectedExitDate: prev.expectedExitDate || addDays(prev.entryDate || today, 15)
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

    if (!caseForm.birdId) {
      setError("Selecione uma ave para o caso clínico.");
      setSaving(false);
      return;
    }
    if (!caseForm.infirmaryId) {
      setError("Selecione uma enfermaria.");
      setSaving(false);
      return;
    }

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

  async function quickCaseAction(
    caseId: string,
    action: "CURE" | "DEATH" | "NEW_PROTOCOL"
  ) {
    const labels = { CURE: "marcar como CURADA", DEATH: "registrar ÓBITO", NEW_PROTOCOL: "iniciar novo protocolo (5 dias)" };
    if (action !== "NEW_PROTOCOL" && !confirm(`Confirma ${labels[action]}?`)) return;
    const res = await fetch(`/api/health/cases/${caseId}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, date: today, notes: "" })
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Falha ao aplicar evento clinico.");
      return;
    }
    await loadData();
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
      expectedExitDate: prev.expectedExitDate || addDays(nextDate, 15)
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

    if (quarantineForm.birdIds.length === 0) {
      setError("Selecione pelo menos uma ave para iniciar a quarentena.");
      setSaving(false);
      return;
    }
    if (!quarantineForm.infirmaryId) {
      setError("Selecione uma enfermaria de quarentena.");
      setSaving(false);
      return;
    }

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
        icon="💊"
      />

      {error && !(showInfirmaryModal || showCaseModal || showQuarantineModal) ? (
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

      <div>
        <h3 className="text-base font-semibold text-zinc-900">Enfermarias</h3>
        {loading ? <Card className="mt-4"><p className="text-sm text-zinc-500">Carregando...</p></Card> : null}
        {!loading && infirmaries.length === 0 ? (
          <Card className="mt-4"><p className="text-sm text-zinc-500">Nenhuma enfermaria cadastrada.</p></Card>
        ) : null}
        {!loading && infirmaries.length > 0 ? (
          <section className="mt-4 grid gap-3 md:grid-cols-2">
            {infirmaries.map((inf) => {
              const activeCases = cases.filter(
                (c) => c.infirmaryId === inf.id && c.status === "TREATING"
              ).length;
              const isActive = inf.status === "ACTIVE";
              return (
                <Card
                  key={inf.id}
                  className={`border ${isActive ? "border-emerald-200" : "border-zinc-200"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
                          isActive ? "bg-emerald-100" : "bg-zinc-100"
                        }`}
                      >
                        🏥
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-zinc-900">{inf.name}</p>
                        <span
                          className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                            isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {isActive ? "Ativa" : "Inativa"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        type="button"
                        size="icon"
                        className="h-12 w-12 rounded-xl md:h-auto md:w-auto md:px-3"
                        aria-label="Editar enfermaria"
                        title="Editar enfermaria"
                        onClick={() => {
                          setEditingInfirmaryId(inf.id);
                          setInfirmaryForm({ name: inf.name, notes: inf.notes ?? "", status: inf.status });
                          setShowInfirmaryModal(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DeleteActionButton
                        iconOnly
                        onClick={() => removeInfirmary(inf.id)}
                        aria-label="Excluir enfermaria"
                      />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-zinc-50 p-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Em tratamento</p>
                      <p className="text-xl font-semibold text-zinc-900">{activeCases}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Status</p>
                      <p className="text-xl font-semibold text-zinc-900">
                        {isActive ? "Ativa" : "Inativa"}
                      </p>
                    </div>
                  </div>
                  {inf.notes ? (
                    <p className="mt-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600">
                      {inf.notes}
                    </p>
                  ) : null}

                  {(() => {
                    const treating = cases.filter(
                      (c) => c.infirmaryId === inf.id && c.status === "TREATING"
                    );
                    if (treating.length === 0) {
                      return (
                        <p className="mt-3 rounded-xl border border-dashed border-zinc-200 bg-white/60 px-3 py-3 text-center text-xs text-zinc-500">
                          Sem aves em tratamento.
                        </p>
                      );
                    }
                    return (
                      <ul className="mt-3 grid gap-2">
                        {treating.map((c) => {
                          const start = c.protocolStartedAt
                            ? new Date(c.protocolStartedAt)
                            : new Date(c.openedAt);
                          const duration = c.protocolDurationDays || 5;
                          const elapsedMs = Date.now() - start.getTime();
                          const elapsedDays = Math.max(0, elapsedMs / (24 * 60 * 60 * 1000));
                          const remaining = Math.max(0, duration - Math.floor(elapsedDays));
                          const overdue = elapsedDays > duration;
                          const progressPct = Math.min(100, (elapsedDays / duration) * 100);
                          const barColor = overdue
                            ? "bg-rose-500"
                            : progressPct > 80
                              ? "bg-amber-500"
                              : "bg-emerald-500";
                          const iconBtn =
                            "inline-flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-base transition hover:bg-zinc-50 sm:size-9";
                          return (
                            <li
                              key={c.id}
                              className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-800">
                                      {c.bird.ringNumber}
                                    </span>
                                    <span className="text-xs text-zinc-500">
                                      · {c.bird.flockGroup.title}
                                    </span>
                                  </div>
                                  {c.diagnosis ? (
                                    <p className="mt-1 truncate text-xs text-zinc-600">
                                      {c.diagnosis}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    aria-label="Marcar como curada"
                                    title="Marcar como curada"
                                    className={iconBtn}
                                    onClick={() => quickCaseAction(c.id, "CURE")}
                                  >
                                    ✅
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Novo protocolo"
                                    title="Novo protocolo (renova 5 dias)"
                                    className={iconBtn}
                                    onClick={() => quickCaseAction(c.id, "NEW_PROTOCOL")}
                                  >
                                    🔄
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Registrar óbito"
                                    title="Registrar óbito"
                                    className={iconBtn}
                                    onClick={() => quickCaseAction(c.id, "DEATH")}
                                  >
                                    💀
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Ver timeline"
                                    title={timelineByCase[c.id] ? "Ocultar timeline" : "Ver timeline"}
                                    className={`${iconBtn} ${timelineByCase[c.id] ? "bg-zinc-100" : ""}`}
                                    onClick={() => loadTimeline(c.id)}
                                  >
                                    🕐
                                  </button>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                                  <div
                                    className={`h-full transition-all ${barColor}`}
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                                <span
                                  className={`whitespace-nowrap text-[10px] font-semibold ${
                                    overdue
                                      ? "text-rose-600"
                                      : progressPct > 80
                                        ? "text-amber-600"
                                        : "text-emerald-700"
                                  }`}
                                >
                                  {overdue
                                    ? `${Math.floor(elapsedDays - duration)}d em atraso`
                                    : `${remaining}d restantes`}
                                </span>
                              </div>
                              {timelineByCase[c.id] ? (
                                <div className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-[11px] text-zinc-600">
                                  {timelineByCase[c.id].length === 0 ? (
                                    <p>Sem eventos na timeline.</p>
                                  ) : (
                                    <ul className="space-y-1">
                                      {timelineByCase[c.id].map((event) => (
                                        <li key={event.id}>
                                          {new Date(event.createdAt).toLocaleString("pt-BR")} · {timelineTypeLabel(event.type)}
                                          {event.notes ? ` — ${event.notes}` : ""}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })()}
                </Card>
              );
            })}
          </section>
        ) : null}
      </div>

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
        error={error}
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
        error={error}
        onClose={() => {
          setShowCaseModal(false);
          setEditingCaseId(null);
        }}
      >
        <form className="grid gap-3" onSubmit={saveCase}>
          {(() => {
            const groupsWithBirds = Array.from(
              birds.reduce((acc, b) => {
                if (!acc.has(b.flockGroup.id)) acc.set(b.flockGroup.id, b.flockGroup.title);
                return acc;
              }, new Map<string, string>()).entries()
            ).sort((a, b) => a[1].localeCompare(b[1]));
            const filtered = caseFlockGroupId
              ? birds.filter((b) => b.flockGroup.id === caseFlockGroupId)
              : [];
            return (
              <>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-slate-800">Lote</span>
                  <select
                    className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
                    value={caseFlockGroupId}
                    onChange={(e) => {
                      setCaseFlockGroupId(e.target.value);
                      setCaseForm((p) => ({ ...p, birdId: "" }));
                    }}
                  >
                    <option value="">Selecione o lote</option>
                    {groupsWithBirds.map(([id, title]) => (
                      <option key={id} value={id}>{title}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-semibold text-slate-800">Ave</span>
                  <select
                    className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    value={caseForm.birdId}
                    onChange={(e) => setCaseForm((p) => ({ ...p, birdId: e.target.value }))}
                    disabled={!caseFlockGroupId}
                  >
                    <option value="">{caseFlockGroupId ? "Selecione a ave" : "Selecione um lote primeiro"}</option>
                    {filtered.map((bird) => (
                      <option key={bird.id} value={bird.id}>
                        {birdRoleLabel(bird.sex)} · {bird.ringNumber}
                        {bird.nickname ? ` (${bird.nickname})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            );
          })()}
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
        error={error}
        onClose={() => {
          setShowQuarantineModal(false);
        }}
      >
        <form className="grid gap-4" onSubmit={saveQuarantineCase}>
          {(() => {
            const groupsWithBirds = Array.from(
              birds.reduce((acc, b) => {
                if (!acc.has(b.flockGroup.id)) acc.set(b.flockGroup.id, b.flockGroup.title);
                return acc;
              }, new Map<string, string>()).entries()
            ).sort((a, b) => a[1].localeCompare(b[1]));
            const filtered = quarantineFlockGroupId
              ? birds.filter((b) => b.flockGroup.id === quarantineFlockGroupId)
              : [];
            const availableBirds = filtered.filter((b) => !quarantineForm.birdIds.includes(b.id));
            const selectedBirds = birds.filter((b) => quarantineForm.birdIds.includes(b.id));
            return (
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-sm font-semibold text-slate-800">Lote</span>
                    <select
                      className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
                      value={quarantineFlockGroupId}
                      onChange={(e) => setQuarantineFlockGroupId(e.target.value)}
                    >
                      <option value="">Selecione o lote</option>
                      {groupsWithBirds.map(([id, title]) => (
                        <option key={id} value={id}>{title}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-sm font-semibold text-slate-800">Adicionar ave</span>
                    <select
                      className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      value=""
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        setQuarantineForm((p) => ({ ...p, birdIds: [...p.birdIds, id] }));
                      }}
                      disabled={!quarantineFlockGroupId || availableBirds.length === 0}
                    >
                      <option value="">
                        {!quarantineFlockGroupId
                          ? "Selecione um lote primeiro"
                          : availableBirds.length === 0
                            ? "Todas as aves do lote ja foram adicionadas"
                            : "Selecione uma ave para adicionar"}
                      </option>
                      {availableBirds.map((bird) => (
                        <option key={bird.id} value={bird.id}>
                          {birdRoleLabel(bird.sex)} · {bird.ringNumber}
                          {bird.nickname ? ` (${bird.nickname})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {selectedBirds.length > 0 ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-2">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                      {selectedBirds.length} {selectedBirds.length === 1 ? "ave selecionada" : "aves selecionadas"}
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {selectedBirds.map((b) => (
                        <li key={b.id} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-zinc-700">
                          <span className="font-mono">{b.ringNumber}</span>
                          <span className="text-zinc-400">·</span>
                          <span className="text-zinc-500">{b.flockGroup.title}</span>
                          <button
                            type="button"
                            aria-label="Remover ave"
                            onClick={() =>
                              setQuarantineForm((p) => ({
                                ...p,
                                birdIds: p.birdIds.filter((x) => x !== b.id)
                              }))
                            }
                            className="ml-1 text-zinc-400 hover:text-rose-600"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            );
          })()}
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-slate-800">Enfermaria de quarentena</span>
            <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={quarantineForm.infirmaryId} onChange={(e) => setQuarantineForm((p) => ({ ...p, infirmaryId: e.target.value }))}>
              <option value="">Selecione a enfermaria de quarentena</option>
              {infirmaries.map((inf) => (
                <option key={inf.id} value={inf.id}>{inf.name}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-slate-800">Data de entrada</span>
              <Input type="date" value={quarantineForm.entryDate} onChange={(e) => onEntryDateChange(e.target.value)} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-slate-800">Data de saída prevista</span>
              <Input type="date" value={quarantineForm.expectedExitDate} onChange={(e) => setQuarantineForm((p) => ({ ...p, expectedExitDate: e.target.value }))} />
            </label>
          </div>
          <Input placeholder="Observacoes gerais da quarentena" value={quarantineForm.notes} onChange={(e) => setQuarantineForm((p) => ({ ...p, notes: e.target.value }))} />

          <div className="rounded-lg border border-zinc-200 p-3">
            <p className="text-sm font-semibold text-zinc-900">Checklist da Quarentena</p>
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
