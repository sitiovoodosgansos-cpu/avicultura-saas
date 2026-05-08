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
  perInfirmary?: Record<
    string,
    { cureRate: number; mortalityRate: number; total: number; cured: number; dead: number }
  >;
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

// === Tipos do modal de obitos (espelham o retorno da API /health/deaths) ===
type DeathBird = {
  id: string;
  ringNumber: string;
  nickname: string | null;
  sex: "FEMALE" | "MALE" | "UNKNOWN";
  acquisitionDate: string | null;
  purchaseValue: number | null;
  origin: string | null;
  updatedAt: string;
  flockGroup: { id: string; title: string };
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
    createdAt: string;
  }>;
  infirmaryCases: Array<{
    id: string;
    openedAt: string;
    closedAt: string | null;
    status: string;
    diagnosis: string | null;
    symptoms: string | null;
    medication: string | null;
    dosage: string | null;
    responsible: string | null;
    notes: string | null;
    infirmary: { id: string; name: string };
    events: Array<{ id: string; type: string; notes: string | null; createdAt: string }>;
  }>;
  vaccinations: Array<{
    id: string;
    appliedAt: string;
    notes: string | null;
    vaccine: { id: string; name: string };
  }>;
};

type DeathVitrineLot = {
  id: string;
  quantity: number;
  cause: string | null;
  occurredAt: string;
  listing: {
    id: string;
    title: string | null;
    flockGroup: { id: string; title: string };
  };
};

type DeathsResponse = {
  total: number;
  birdDeaths: DeathBird[];
  vitrineDeaths: DeathVitrineLot[];
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
  const [protocolsInfirmaryId, setProtocolsInfirmaryId] = useState<string | null>(null);
  const [quickActionDialog, setQuickActionDialog] = useState<{
    caseId: string;
    action: "CURE" | "DEATH" | "NEW_PROTOCOL";
    notes: string;
  } | null>(null);

  const [timelineByCase, setTimelineByCase] = useState<Record<string, TimelineEvent[]>>({});
  const [eventByCase, setEventByCase] = useState<Record<string, EventDraft>>({});

  // === Modal de obitos com historico ===
  const [showDeathsModal, setShowDeathsModal] = useState(false);
  const [deathsLoading, setDeathsLoading] = useState(false);
  const [deathsData, setDeathsData] = useState<DeathsResponse | null>(null);
  const [expandedBirdId, setExpandedBirdId] = useState<string | null>(null);
  // Default: ultimos 90 dias
  const [deathsFrom, setDeathsFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [deathsTo, setDeathsTo] = useState(today);

  async function loadDeaths() {
    setDeathsLoading(true);
    const params = new URLSearchParams();
    if (deathsFrom) params.set("from", deathsFrom);
    if (deathsTo) params.set("to", deathsTo);
    const res = await fetch(`/api/health/deaths?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) {
      setError("Não foi possível carregar os óbitos.");
      setDeathsLoading(false);
      return;
    }
    const data = (await res.json()) as DeathsResponse;
    setDeathsData(data);
    setDeathsLoading(false);
  }

  const [quarantineForm, setQuarantineForm] = useState<QuarantineForm>(emptyQuarantine);
  const [optionalTreatments, setOptionalTreatments] = useState<Record<string, OptionalTreatmentState>>({});
  const [newTemplateName, setNewTemplateName] = useState("");
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  // Checklist do caso clinico (mesmo modelo de QuarantineChecklistTemplate)
  const [caseTreatments, setCaseTreatments] = useState<Record<string, OptionalTreatmentState>>({});
  const [newCaseTemplateName, setNewCaseTemplateName] = useState("");
  const [creatingCaseTemplate, setCreatingCaseTemplate] = useState(false);

  const inTreatmentCases = useMemo(() => cases.filter((c) => c.status === "TREATING"), [cases]);
  const activeQuarantines = useMemo(
    () => quarantineCases.filter((item) => item.status === "ACTIVE"),
    [quarantineCases]
  );

  function ensureOptionalTreatmentMap(
    templates: QuarantineTemplate[],
    preserve?: Record<string, OptionalTreatmentState>,
    defaultDate?: string
  ) {
    const next: Record<string, OptionalTreatmentState> = {};
    templates.forEach((template) => {
      const prev = preserve?.[template.id];
      next[template.id] = {
        enabled: prev?.enabled ?? false,
        startDate: prev?.startDate ?? defaultDate ?? quarantineForm.entryDate,
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
    setCaseTreatments((prev) => ensureOptionalTreatmentMap(templatesPayload.templates, prev, caseForm.openedAt));
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

    // Monta os tratamentos selecionados no checklist
    const checklistPayload = quarantineTemplates
      .map((tpl) => ({ tpl, state: caseTreatments[tpl.id] }))
      .filter((item) => item.state?.enabled)
      .map((item) => ({
        label: item.tpl.name,
        startDate: item.state?.startDate || caseForm.openedAt,
        notes: item.state?.notes || "",
        templateId: item.tpl.id
      }));

    const payload = {
      ...caseForm,
      // PUT (edicao) nao aceita treatments — so envia no POST
      ...(editingCaseId ? {} : { treatments: checklistPayload })
    };

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      setError(payload.error ?? "Falha ao salvar caso clinico.");
      setSaving(false);
      return;
    }

    setCaseForm((p) => ({ ...emptyCase, birdId: p.birdId, infirmaryId: p.infirmaryId }));
    setCaseTreatments(ensureOptionalTreatmentMap(quarantineTemplates, undefined, today));
    setEditingCaseId(null);
    setShowCaseModal(false);
    setSaving(false);
    await loadData();
  }

  async function createCaseChecklistTemplate() {
    if (!newCaseTemplateName.trim()) return;
    setCreatingCaseTemplate(true);
    setError(null);
    const res = await fetch("/api/health/quarantine/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCaseTemplateName.trim() })
    });
    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      setError(payload.error ?? "Falha ao criar item de checklist.");
      setCreatingCaseTemplate(false);
      return;
    }
    const created = (await res.json()) as QuarantineTemplate;
    const nextTemplates = [...quarantineTemplates, created].sort((a, b) => a.name.localeCompare(b.name));
    setQuarantineTemplates(nextTemplates);
    setCaseTreatments((prev) => {
      const next = ensureOptionalTreatmentMap(nextTemplates, prev, caseForm.openedAt);
      next[created.id] = { enabled: true, startDate: caseForm.openedAt, notes: "" };
      return next;
    });
    setNewCaseTemplateName("");
    setCreatingCaseTemplate(false);
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

  function quickCaseAction(
    caseId: string,
    action: "CURE" | "DEATH" | "NEW_PROTOCOL"
  ) {
    setQuickActionDialog({ caseId, action, notes: "" });
  }

  async function confirmQuickAction() {
    if (!quickActionDialog) return;
    const { caseId, action, notes } = quickActionDialog;
    setQuickActionDialog(null);
    const res = await fetch(`/api/health/cases/${caseId}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, date: today, notes })
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
      {error && !(showInfirmaryModal || showCaseModal || showQuarantineModal) ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : null}

      <section className="mobile-kpi-grid grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-5">
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">💊 Em tratamento</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{metrics?.summary.inTreatment ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">🛡️ Em quarentena</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{activeQuarantines.length}</p>
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
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowDeathsModal(true);
              void loadDeaths();
            }}
          >
            🪦 Óbitos
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
              const activeQuarantineCount = quarantineCases.filter(
                (q) => q.infirmaryId === inf.id && q.status === "ACTIVE"
              ).length;
              const isActive = inf.status === "ACTIVE";
              const usageLabel =
                activeCases > 0 && activeQuarantineCount > 0
                  ? "Tratamento + Quarentena"
                  : activeCases > 0
                    ? "Tratamento"
                    : activeQuarantineCount > 0
                      ? "Quarentena"
                      : "Disponível";
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
                          {usageLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {activeQuarantineCount > 0 ? (
                        <button
                          type="button"
                          aria-label="Ver protocolos da quarentena"
                          title="Protocolos da quarentena"
                          onClick={() => setProtocolsInfirmaryId(inf.id)}
                          className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          📋 Protocolos
                        </button>
                      ) : null}
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
                  {inf.notes ? (
                    <p className="mt-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600">
                      {inf.notes}
                    </p>
                  ) : null}

                  {(() => {
                    // Taxa de cura desta enfermaria (similar ao gauge das chocadeiras)
                    const stats = metrics?.perInfirmary?.[inf.id];
                    if (!stats || stats.cured + stats.dead === 0) return null;
                    const rate = stats.cureRate;
                    const finalized = stats.cured + stats.dead;
                    const barColor =
                      rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-400" : "bg-rose-500";
                    return (
                      <div className="mt-3 rounded-xl border border-zinc-200 bg-white px-3 py-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                          <span>✅ Taxa de cura</span>
                          <span className="tabular-nums text-zinc-800">{formatPercent(rate)}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className={`h-full transition-all ${barColor}`}
                            style={{ width: `${Math.min(100, rate)}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-zinc-400">
                          {stats.cured} curadas / {stats.dead} óbitos · {finalized} casos finalizados
                        </p>
                      </div>
                    );
                  })()}

                  {(() => {
                    const treating = cases.filter(
                      (c) => c.infirmaryId === inf.id && c.status === "TREATING"
                    );
                    if (treating.length === 0) return null;
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
                                  <p className="truncate text-sm font-semibold text-zinc-900">
                                    {c.bird.nickname?.trim() || c.bird.flockGroup.title}
                                  </p>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-zinc-500">
                                    <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono font-semibold text-zinc-700">
                                      {c.bird.ringNumber}
                                    </span>
                                    {c.bird.nickname?.trim() ? (
                                      <span className="truncate">· {c.bird.flockGroup.title}</span>
                                    ) : null}
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

                  {(() => {
                    const quarantines = quarantineCases.filter(
                      (q) => q.infirmaryId === inf.id && q.status === "ACTIVE"
                    );
                    if (quarantines.length === 0) return null;
                    return (
                      <div className="mt-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                          🛡️ Quarentena
                        </p>
                        <ul className="mt-1.5 grid gap-2">
                          {quarantines.map((q) => {
                            const start = new Date(q.entryDate);
                            const expected = new Date(q.expectedExitDate);
                            const total = Math.max(
                              1,
                              (expected.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
                            );
                            const elapsedDays = Math.max(
                              0,
                              (Date.now() - start.getTime()) / (24 * 60 * 60 * 1000)
                            );
                            const remaining = Math.max(0, total - Math.floor(elapsedDays));
                            const overdue = elapsedDays > total;
                            const progressPct = Math.min(100, (elapsedDays / total) * 100);
                            const barColor = overdue
                              ? "bg-rose-500"
                              : progressPct > 80
                                ? "bg-amber-500"
                                : "bg-emerald-500";
                            return (
                              <li
                                key={q.id}
                                className="rounded-xl border border-emerald-100 bg-emerald-50/30 px-3 py-2.5"
                              >
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-800">
                                    {q.bird.ringNumber}
                                  </span>
                                  <span className="text-xs text-zinc-500">
                                    · {q.bird.flockGroup.title}
                                  </span>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="relative h-2.5 flex-1 rounded-full bg-white">
                                    <div
                                      className={`absolute inset-y-0 left-0 rounded-full transition-all ${barColor}`}
                                      style={{ width: `${progressPct}%` }}
                                    />
                                    {q.treatments.map((t) => {
                                      const tDate = new Date(t.startDate).getTime();
                                      const offsetDays =
                                        (tDate - start.getTime()) / (24 * 60 * 60 * 1000);
                                      const pct = Math.max(0, Math.min(100, (offsetDays / total) * 100));
                                      const passed = offsetDays <= elapsedDays;
                                      return (
                                        <span
                                          key={t.id || `${q.id}-${t.label}-${t.startDate}`}
                                          title={`${t.label} — ${toDateInput(t.startDate)}`}
                                          className={`absolute top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-sm shadow-sm ${
                                            passed
                                              ? "bg-emerald-900"
                                              : "bg-zinc-700"
                                          }`}
                                          style={{ left: `${pct}%` }}
                                        />
                                      );
                                    })}
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
                                      ? `${Math.floor(elapsedDays - total)}d em atraso`
                                      : `${remaining}d restantes`}
                                  </span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })()}
                </Card>
              );
            })}
          </section>
        ) : null}
      </div>

      <AppModal
        open={Boolean(protocolsInfirmaryId)}
        title={
          protocolsInfirmaryId
            ? `📋 Protocolos — ${infirmaries.find((i) => i.id === protocolsInfirmaryId)?.name ?? ""}`
            : "Protocolos"
        }
        onClose={() => setProtocolsInfirmaryId(null)}
      >
        {(() => {
          const infirmaryQuarantines = quarantineCases.filter(
            (q) => q.infirmaryId === protocolsInfirmaryId && q.status === "ACTIVE"
          );
          if (infirmaryQuarantines.length === 0) {
            return (
              <p className="rounded-2xl border border-dashed border-zinc-200 bg-white/60 px-3 py-6 text-center text-sm text-zinc-500">
                Sem aves em quarentena nesta enfermaria.
              </p>
            );
          }
          return (
            <ul className="grid gap-2">
              {infirmaryQuarantines.map((q) => (
                <li key={q.id} className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-800">
                      {q.bird.ringNumber}
                    </span>
                    <span className="text-xs text-zinc-500">· {q.bird.flockGroup.title}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Entrada {toDateInput(q.entryDate)} · saída prevista {toDateInput(q.expectedExitDate)}
                  </p>
                  <div className="mt-2 border-t border-zinc-100 pt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Tratamentos do checklist
                    </p>
                    {q.treatments.length === 0 ? (
                      <p className="mt-1 text-xs text-zinc-500">Sem tratamentos cadastrados.</p>
                    ) : (
                      <ul className="mt-1 space-y-0.5 text-xs text-zinc-600">
                        {q.treatments.map((t) => (
                          <li key={t.id || `${q.id}-${t.label}`}>
                            • {t.label} — início {toDateInput(t.startDate)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          );
        })()}
      </AppModal>

      <AppModal
        open={showDeathsModal}
        title="🪦 Óbitos no período"
        onClose={() => {
          setShowDeathsModal(false);
          setExpandedBirdId(null);
        }}
      >
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">De</span>
              <Input type="date" value={deathsFrom} onChange={(e) => setDeathsFrom(e.target.value)} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Até</span>
              <Input type="date" value={deathsTo} onChange={(e) => setDeathsTo(e.target.value)} />
            </label>
            <div className="flex items-end">
              <Button type="button" onClick={() => void loadDeaths()} disabled={deathsLoading}>
                {deathsLoading ? "Carregando..." : "Filtrar"}
              </Button>
            </div>
          </div>

          {deathsData ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 px-3 py-2 text-sm text-rose-800">
              <strong className="tabular-nums">{deathsData.total}</strong> óbitos no período —{" "}
              {deathsData.birdDeaths.length} aves do plantel + {deathsData.vitrineDeaths.reduce((s, x) => s + x.quantity, 0)} aves da Vitrine (lotes).
            </div>
          ) : null}

          {deathsLoading ? (
            <p className="text-sm text-zinc-500">Carregando óbitos...</p>
          ) : null}

          {deathsData && deathsData.birdDeaths.length === 0 && deathsData.vitrineDeaths.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-3 py-6 text-center text-sm text-zinc-500">
              Nenhum óbito no período. 🙌
            </p>
          ) : null}

          {deathsData && deathsData.birdDeaths.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Aves do plantel</p>
              <ul className="mt-2 grid gap-2">
                {deathsData.birdDeaths.map((bird) => {
                  const expanded = expandedBirdId === bird.id;
                  return (
                    <li key={bird.id} className="rounded-xl border border-zinc-200 bg-white">
                      <button
                        type="button"
                        onClick={() => setExpandedBirdId(expanded ? null : bird.id)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-900">
                            {bird.nickname?.trim() || bird.flockGroup.title}{" "}
                            <span className="text-xs font-mono font-normal text-zinc-500">
                              {bird.ringNumber}
                            </span>
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {bird.flockGroup.title} · óbito em {new Date(bird.updatedAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <span className="text-zinc-400">{expanded ? "▲" : "▼"}</span>
                      </button>
                      {expanded ? (
                        <div className="border-t border-zinc-100 px-3 py-3 text-xs text-zinc-700 space-y-3">
                          {bird.acquisitionDate ? (
                            <p>
                              <strong>Aquisição:</strong> {new Date(bird.acquisitionDate).toLocaleDateString("pt-BR")}
                              {bird.origin ? ` · ${bird.origin}` : ""}
                              {bird.purchaseValue ? ` · R$ ${bird.purchaseValue.toFixed(2)}` : ""}
                            </p>
                          ) : null}

                          {bird.infirmaryCases.length > 0 ? (
                            <div>
                              <p className="font-semibold text-zinc-800">🏥 Casos clínicos ({bird.infirmaryCases.length})</p>
                              <ul className="mt-1 grid gap-2">
                                {bird.infirmaryCases.map((c) => (
                                  <li key={c.id} className="rounded-lg bg-zinc-50 p-2">
                                    <p className="text-[11px]">
                                      <strong>{new Date(c.openedAt).toLocaleDateString("pt-BR")}</strong>{" "}
                                      → {c.closedAt ? new Date(c.closedAt).toLocaleDateString("pt-BR") : "em aberto"}{" "}
                                      · {c.infirmary.name} · {statusLabel(c.status as CaseItem["status"])}
                                    </p>
                                    {c.diagnosis ? <p>📋 {c.diagnosis}</p> : null}
                                    {c.symptoms ? <p>🤒 {c.symptoms}</p> : null}
                                    {c.medication ? (
                                      <p>
                                        💊 {c.medication}
                                        {c.dosage ? ` · ${c.dosage}` : ""}
                                      </p>
                                    ) : null}
                                    {c.notes ? <p className="text-zinc-500">📝 {c.notes}</p> : null}
                                    {c.events.length > 0 ? (
                                      <ul className="mt-1 space-y-0.5 text-[10px] text-zinc-500">
                                        {c.events.map((ev) => (
                                          <li key={ev.id}>
                                            {new Date(ev.createdAt).toLocaleDateString("pt-BR")} ·{" "}
                                            {timelineTypeLabel(ev.type)}
                                            {ev.notes ? ` — ${ev.notes}` : ""}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-zinc-500">Sem casos clínicos registrados.</p>
                          )}

                          {bird.vaccinations.length > 0 ? (
                            <div>
                              <p className="font-semibold text-zinc-800">💉 Vacinas ({bird.vaccinations.length})</p>
                              <ul className="mt-1 space-y-0.5 text-[11px]">
                                {bird.vaccinations.map((v) => (
                                  <li key={v.id}>
                                    {new Date(v.appliedAt).toLocaleDateString("pt-BR")} · {v.vaccine.name}
                                    {v.notes ? ` — ${v.notes}` : ""}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {bird.statusHistory.length > 0 ? (
                            <div>
                              <p className="font-semibold text-zinc-800">📅 Histórico de status</p>
                              <ul className="mt-1 space-y-0.5 text-[11px] text-zinc-600">
                                {bird.statusHistory.map((h) => (
                                  <li key={h.id}>
                                    {new Date(h.createdAt).toLocaleDateString("pt-BR")} · {h.fromStatus ?? "—"} → {h.toStatus}
                                    {h.reason ? ` (${h.reason})` : ""}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {deathsData && deathsData.vitrineDeaths.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Lotes da Vitrine</p>
              <ul className="mt-2 grid gap-2">
                {deathsData.vitrineDeaths.map((d) => (
                  <li key={d.id} className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
                    <p className="text-sm font-semibold text-zinc-900">
                      {d.quantity} ave(s) · {d.listing.flockGroup.title}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {new Date(d.occurredAt).toLocaleDateString("pt-BR")}
                      {d.cause ? ` · ${d.cause}` : ""}
                      {d.listing.title ? ` · "${d.listing.title}"` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </AppModal>

      <AppModal
        open={Boolean(quickActionDialog)}
        title={
          quickActionDialog?.action === "CURE"
            ? "✅ Marcar como curada"
            : quickActionDialog?.action === "DEATH"
              ? "💀 Registrar óbito"
              : "🔄 Novo protocolo"
        }
        onClose={() => setQuickActionDialog(null)}
      >
        {quickActionDialog ? (
          <div className="grid gap-3">
            <p className="text-sm text-zinc-700">
              {quickActionDialog.action === "CURE"
                ? "Confirma marcar a ave como curada e fechar o caso clínico?"
                : quickActionDialog.action === "DEATH"
                  ? "Confirma registrar o óbito? A ave será marcada como morta e o caso fechado."
                  : "Iniciar um novo protocolo de 5 dias? O countdown será resetado a partir de hoje."}
            </p>
            <label className="grid gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Observações (opcional)
              </span>
              <Input
                placeholder={
                  quickActionDialog.action === "DEATH"
                    ? "Causa, data, observações..."
                    : "Notas sobre o evento"
                }
                value={quickActionDialog.notes}
                onChange={(e) =>
                  setQuickActionDialog((prev) =>
                    prev ? { ...prev, notes: e.target.value } : prev
                  )
                }
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setQuickActionDialog(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant={quickActionDialog.action === "DEATH" ? "danger" : "default"}
                onClick={confirmQuickAction}
              >
                Confirmar
              </Button>
            </div>
          </div>
        ) : null}
      </AppModal>

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

          {/* Checklist do caso clinico — mesmo modelo do checklist da quarentena */}
          {editingCaseId ? null : (
            <div className="rounded-lg border border-zinc-200 p-3">
              <p className="text-sm font-semibold text-zinc-900">Checklist do tratamento</p>
              <p className="text-xs text-zinc-500">Reuse os itens cadastrados (vacinas, protocolos, medicamentos) marcando os que vão ser aplicados nesse caso.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Input
                  className="min-w-[220px] flex-1"
                  placeholder="Exemplo: Antibiótico Enrofloxacina"
                  value={newCaseTemplateName}
                  onChange={(e) => setNewCaseTemplateName(e.target.value)}
                />
                <Button type="button" variant="outline" disabled={creatingCaseTemplate} onClick={createCaseChecklistTemplate}>
                  {creatingCaseTemplate ? "Salvando..." : "Cadastrar item"}
                </Button>
              </div>
              {quarantineTemplates.length === 0 ? (
                <p className="mt-3 text-xs text-zinc-500">Ainda não há itens cadastrados.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {quarantineTemplates.map((template) => {
                    const state = caseTreatments[template.id] ?? { enabled: false, startDate: caseForm.openedAt, notes: "" };
                    return (
                      <div key={template.id} className="rounded-md border border-zinc-200 p-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                          <input
                            type="checkbox"
                            checked={state.enabled}
                            onChange={(e) =>
                              setCaseTreatments((prev) => ({
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
                                setCaseTreatments((prev) => ({
                                  ...prev,
                                  [template.id]: { ...state, startDate: e.target.value }
                                }))
                              }
                            />
                            <Input
                              placeholder={`Observações de ${template.name}`}
                              value={state.notes}
                              onChange={(e) =>
                                setCaseTreatments((prev) => ({
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
          )}

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
