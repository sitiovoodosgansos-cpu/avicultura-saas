"use client";

import { useEffect, useMemo, useState } from "react";
import { BirdStatus } from "@prisma/client";
import { DollarSign, History, Pencil } from "lucide-react";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteActionButton } from "@/components/ui/delete-action-button";
import { Input } from "@/components/ui/input";
import { AppModal } from "@/components/ui/app-modal";

type PlantelGroup = {
  id: string;
  title: string;
  notes: string | null;
  bayNumber: number;
  matrixCount: number;
  reproducerCount: number;
  species: { name: string };
  breed: { name: string };
  variety: { name: string } | null;
  summary: {
    totalBirds: number;
    females: number;
    males: number;
    daughters: number;
    ACTIVE: number;
    SICK: number;
    DEAD: number;
    BROODY: number;
  };
  birds: PlantelBird[];
};

type PlantelBird = {
  id: string;
  ringNumber: string;
  nickname: string | null;
  bayNumber: number | null;
  sex: "FEMALE" | "MALE" | "UNKNOWN";
  status: BirdStatus;
  origin: string | null;
  acquisitionDate: string | null;
  purchaseValue: string | number | null;
  flockGroupId: string;
  inVitrine: boolean;
};

type BirdHistory = {
  id: string;
  fromStatus: BirdStatus | null;
  toStatus: BirdStatus;
  reason: string | null;
  createdAt: string;
};

type GroupForm = {
  species: string;
  breed: string;
  variety: string;
  title: string;
  bayNumber: number;
  matrixCount: number;
  reproducerCount: number;
  expectedLayCapacity?: number;
  purchaseInvestmentTotal?: number;
  notes: string;
};

type BirdForm = {
  flockGroupId: string;
  bayNumber?: number;
  ringNumber: string;
  nickname: string;
  sex: "FEMALE" | "MALE" | "UNKNOWN";
  acquisitionDate: string;
  purchaseValue?: number;
  origin: string;
  status: BirdStatus;
};

type PlantelResponse = {
  groups: PlantelGroup[];
  growth: {
    byMonth: Array<{ key: string; label: string; total: number }>;
    byYear: Array<{ key: string; label: string; total: number }>;
  };
};

type WorkerLink = {
  id: string;
  label: string;
  token: string;
  isActive: boolean;
  createdAt: string;
};

const selectClass =
  "h-11 w-full rounded-2xl border border-[color:var(--line)] bg-white/90 px-4 text-sm text-slate-800 outline-none focus:ring-4 focus:ring-[color:var(--brand)]/20";

const textareaClass =
  "min-h-24 w-full rounded-2xl border border-[color:var(--line)] bg-white/90 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-[color:var(--brand)]/20";

const statusLabel: Record<BirdStatus, string> = {
  ACTIVE: "Ativa",
  SICK: "Doente",
  DEAD: "Morta",
  BROODY: "Choca"
};

const statusBadge: Record<BirdStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  SICK: "bg-amber-100 text-amber-700",
  DEAD: "bg-rose-100 text-rose-700",
  BROODY: "bg-sky-100 text-sky-700"
};

const emptyGroupForm: GroupForm = {
  species: "",
  breed: "",
  variety: "",
  title: "",
  bayNumber: 1,
  matrixCount: 0,
  reproducerCount: 0,
  notes: ""
};

const emptyBirdForm: BirdForm = {
  flockGroupId: "",
  bayNumber: 1,
  ringNumber: "",
  nickname: "",
  sex: "UNKNOWN",
  acquisitionDate: "",
  origin: "",
  status: "ACTIVE"
};

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {children}
    </label>
  );
}

function StatChip({
  emoji,
  label,
  value
}: {
  emoji: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-h-[72px] flex-col justify-between rounded-xl bg-[color:var(--surface-soft)] px-3 py-2 sm:min-h-[82px] sm:px-3 sm:py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:text-[11px]">
        {emoji} {label}
      </p>
      <p className="mt-0.5 text-[34px] font-semibold leading-none text-slate-900 sm:text-[30px]">{value}</p>
    </div>
  );
}

function CompactStatChip({
  emoji,
  label,
  value,
  onClick
}: {
  emoji: string;
  label: string;
  value: number;
  onClick?: () => void;
}) {
  const baseClass =
    "flex h-full min-h-[84px] w-full min-w-0 flex-col items-center justify-center rounded-xl bg-slate-50 px-2 py-2 text-center sm:min-h-[92px]";
  const content = (
    <>
      <p className="max-w-full truncate text-[11px] leading-tight text-slate-500 sm:text-[12px]">
        {emoji} {label}
      </p>
      <p className="mt-1 text-[28px] font-semibold leading-none text-slate-900 sm:text-[30px]">{value}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClass} cursor-pointer transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/30`}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClass}>{content}</div>;
}

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function PlantelManager({ showWorkerLinks = false }: { showWorkerLinks?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<PlantelGroup[]>([]);
  const [groupForm, setGroupForm] = useState<GroupForm>(emptyGroupForm);
  const [birdForm, setBirdForm] = useState<BirdForm>(emptyBirdForm);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingBirdId, setEditingBirdId] = useState<string | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [historyByBird, setHistoryByBird] = useState<Record<string, BirdHistory[]>>({});
  const [statusDraftByBird, setStatusDraftByBird] = useState<Record<string, BirdStatus>>({});
  const [filterSpecies, setFilterSpecies] = useState("");
  const [filterBreed, setFilterBreed] = useState("");
  const [filterVariety, setFilterVariety] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [ringSearch, setRingSearch] = useState("");
  const [workerLinks, setWorkerLinks] = useState<WorkerLink[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showBirdModal, setShowBirdModal] = useState(false);
  const [lockedBirdGroupId, setLockedBirdGroupId] = useState<string | null>(null);
  const [sellingBird, setSellingBird] = useState<PlantelBird | null>(null);
  const [sellListingForm, setSellListingForm] = useState<{
    ageInMonths: number;
    priceOverride: string;
  }>({ ageInMonths: 0, priceOverride: "" });
  const [sellListingError, setSellListingError] = useState<string | null>(null);
  const [sellListingSubmitting, setSellListingSubmitting] = useState(false);
  const [vitrineToast, setVitrineToast] = useState<string | null>(null);
  const [daughtersGroup, setDaughtersGroup] = useState<{
    parent: { id: string; title: string };
    birds: Array<PlantelBird & { flockGroupTitle: string }>;
  } | null>(null);
  const [daughtersLoading, setDaughtersLoading] = useState(false);

  const canSubmitBird = useMemo(() => Boolean(birdForm.flockGroupId), [birdForm.flockGroupId]);

  async function openDaughters(parentGroupId: string) {
    setDaughtersLoading(true);
    setDaughtersGroup(null);
    try {
      const res = await fetch(`/api/plantel/groups/${parentGroupId}/daughters`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Não foi possível carregar as filhas.");
        return;
      }
      const data = (await res.json()) as {
        parent: { id: string; title: string };
        birds: Array<PlantelBird & { flockGroupTitle: string }>;
      };
      setDaughtersGroup({ parent: data.parent, birds: data.birds });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar filhas.");
    } finally {
      setDaughtersLoading(false);
    }
  }

  async function reloadDaughters() {
    if (!daughtersGroup) return;
    await openDaughters(daughtersGroup.parent.id);
  }

  async function loadData() {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (filterSpecies) params.set("species", filterSpecies);
    if (filterBreed) params.set("breed", filterBreed);
    if (filterVariety) params.set("variety", filterVariety);
    if (filterStatus) params.set("status", filterStatus);
    if (ringSearch) params.set("ring", ringSearch);

    const requests: Promise<Response>[] = [fetch(`/api/plantel/groups?${params.toString()}`, { cache: "no-store" })];
    if (showWorkerLinks) {
      requests.push(fetch("/api/worker-links", { cache: "no-store" }));
    }

    const [response, workerLinksRes] = await Promise.all(requests);

    if (!response.ok || (showWorkerLinks && !workerLinksRes?.ok)) {
      setError("Nao foi possivel carregar o plantel.");
      setLoading(false);
      return;
    }

    const data: PlantelResponse = await response.json();
    setGroups(data.groups);
    if (showWorkerLinks && workerLinksRes) {
      const linksData = (await workerLinksRes.json()) as { links: WorkerLink[] };
      setWorkerLinks(linksData.links);
    } else {
      setWorkerLinks([]);
    }
    setLoading(false);

    if (!birdForm.flockGroupId && data.groups.length > 0) {
      setBirdForm((prev) => ({
        ...prev,
        flockGroupId: data.groups[0].id,
        bayNumber: data.groups[0].bayNumber
      }));
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSpecies, filterBreed, filterVariety, filterStatus, ringSearch]);

  async function submitGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const endpoint = editingGroupId ? `/api/plantel/groups/${editingGroupId}` : "/api/plantel/groups";
    const method = editingGroupId ? "PUT" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(groupForm)
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Falha ao salvar grupo.");
      setSaving(false);
      return;
    }

    setGroupForm(emptyGroupForm);
    setEditingGroupId(null);
    setShowGroupModal(false);
    setSaving(false);
    await loadData();
  }

  async function submitBird(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmitBird) return;

    setSaving(true);
    setError(null);

    const endpoint = editingBirdId ? `/api/plantel/birds/${editingBirdId}` : "/api/plantel/birds";
    const method = editingBirdId ? "PUT" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(birdForm)
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Falha ao salvar ave.");
      setSaving(false);
      return;
    }

    setBirdForm((prev) => ({ ...emptyBirdForm, flockGroupId: prev.flockGroupId, bayNumber: prev.bayNumber }));
    setEditingBirdId(null);
    setShowBirdModal(false);
    setSaving(false);
    await loadData();
  }

  async function removeGroup(id: string) {
    const ok = window.confirm("Tem certeza que deseja excluir este grupo? As aves tambem serao removidas.");
    if (!ok) return;

    const response = await fetch(`/api/plantel/groups/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Nao foi possivel excluir o grupo.");
      return;
    }
    await loadData();
  }

  async function removeBird(id: string) {
    const ok = window.confirm("Confirma a exclusao desta ave?");
    if (!ok) return;

    const response = await fetch(`/api/plantel/birds/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Nao foi possivel excluir a ave.");
      return;
    }
    await loadData();
  }

  async function applyBirdStatus(id: string, override?: BirdStatus) {
    const nextStatus = override ?? statusDraftByBird[id];
    if (!nextStatus) return;

    const reason = window.prompt("Motivo da alteracao de status (opcional):") ?? "";

    const response = await fetch(`/api/plantel/birds/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, reason })
    });

    if (!response.ok) {
      setError("Nao foi possivel atualizar o status.");
      return;
    }

    await loadData();
  }

  async function toggleHistory(id: string) {
    if (historyByBird[id]) {
      setHistoryByBird((prev) => {
        const clone = { ...prev };
        delete clone[id];
        return clone;
      });
      return;
    }

    const response = await fetch(`/api/plantel/birds/${id}/history`, { cache: "no-store" });
    if (!response.ok) {
      setError("Nao foi possivel carregar o historico da ave.");
      return;
    }

    const data = (await response.json()) as { history: BirdHistory[] };
    setHistoryByBird((prev) => ({ ...prev, [id]: data.history }));
  }

  async function createWorkerLink() {
    const response = await fetch("/api/worker-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "Link da equipe" })
    });

    if (!response.ok) {
      setError("Nao foi possivel criar o link da equipe.");
      return;
    }

    await loadData();
  }

  async function disableWorkerLink(id: string) {
    const ok = window.confirm("Desativar este link da equipe?");
    if (!ok) return;

    const response = await fetch(`/api/worker-links/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Nao foi possivel desativar o link.");
      return;
    }

    await loadData();
  }

  async function copyWorkerLink(token: string) {
    const url = `${window.location.origin}/funcionario/${token}`;
    await navigator.clipboard.writeText(url);
  }

  const totals = useMemo(() => {
    return groups.reduce(
      (acc, group) => {
        acc.total += group.summary.totalBirds;
        acc.active += group.summary.ACTIVE;
        acc.sick += group.summary.SICK;
        acc.dead += group.summary.DEAD;
        return acc;
      },
      { total: 0, active: 0, sick: 0, dead: 0 }
    );
  }, [groups]);

  return (
    <main className="space-y-6">
      <PageTitle
        title="Plantel"
        description="Cadastro do plantel com foco em grupos, anilhas e status das aves."
        icon="🦚"
      />

      {error && !(showGroupModal || showBirdModal) ? (
        <Card className="border-rose-200 bg-rose-50">
          <p className="text-sm font-medium text-rose-700">{error}</p>
        </Card>
      ) : null}

      <section className="mobile-kpi-grid grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatChip emoji={"🐥"} label="Aves totais" value={totals.total} />
        <StatChip emoji={"✅"} label="Ativas" value={totals.active} />
        <StatChip emoji={"🤢"} label="Doentes" value={totals.sick} />
        <StatChip emoji={"🗑️"} label="Mortas" value={totals.dead} />
      </section>

      {showWorkerLinks ? (
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">{`${"🔗"} Link da equipe`}</h3>
            <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
              Gere um link para funcionario lancar plantel, coleta, chocadeiras e sanidade sem acessar o financeiro.
            </p>
          </div>
          <Button type="button" onClick={createWorkerLink}>
            Gerar novo link
          </Button>
        </div>

        <div className="mt-5 grid gap-3">
          {workerLinks.length === 0 ? (
            <p className="text-sm text-[color:var(--ink-soft)]">Nenhum link criado ainda.</p>
          ) : (
            workerLinks.map((link) => (
              <div
                key={link.id}
                className="flex flex-col gap-3 rounded-2xl border border-[color:var(--line)] bg-slate-50/70 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{link.label}</p>
                  <p className="text-xs text-slate-500">
                    {link.isActive ? "Ativo" : "Inativo"} - criado em{" "}
                    {new Date(link.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {link.isActive ? (
                    <>
                      <Button type="button" variant="outline" onClick={() => copyWorkerLink(link.token)}>
                        Copiar link
                      </Button>
                      <Button type="button" variant="danger" onClick={() => disableWorkerLink(link.id)}>
                        Desativar
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
      ) : null}

      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">Lancamentos do plantel</h3>
            <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
              Use botoes para abrir os cadastros em popup e manter a tela principal limpa.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                setEditingGroupId(null);
                setGroupForm(emptyGroupForm);
                setShowGroupModal(true);
                setLockedBirdGroupId(null);
              }}
            >
              Inserir Grupo de Aves
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingBirdId(null);
                const groupId = birdForm.flockGroupId || groups[0]?.id || "";
                const selectedGroup = groups.find((group) => group.id === groupId);
                setBirdForm({ ...emptyBirdForm, flockGroupId: groupId, bayNumber: selectedGroup?.bayNumber ?? 1 });
                setShowBirdModal(true);
                setLockedBirdGroupId(null);
              }}
            >
              Cadastrar Ave Individual
            </Button>
          </div>
        </div>
      </Card>
      <AppModal
        open={showGroupModal}
        title={editingGroupId ? "Editar grupo de aves" : "Novo grupo de aves"}
        error={error}
        onClose={() => {
          setShowGroupModal(false);
          setEditingGroupId(null);
          setGroupForm(emptyGroupForm);
        }}
      >
        <form className="grid gap-4" onSubmit={submitGroup}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              placeholder="Especie: Galinha, Peru, Faisao"
              value={groupForm.species}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, species: event.target.value }))}
            />
            <Input
              placeholder="Raca: Brahma, Gigante Negro, Bronze"
              value={groupForm.breed}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, breed: event.target.value }))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              placeholder="Variedade ou cor: Dark, Branco, Dourado"
              value={groupForm.variety}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, variety: event.target.value }))}
            />
            <Input
              placeholder="Nome do card: Galinha Brahma Dark"
              value={groupForm.title}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Meta anual de ovos por matriz">
              <Input
                type="number"
                min={0}
                max={365}
                value={groupForm.expectedLayCapacity ?? ""}
                onChange={(event) =>
                  setGroupForm((prev) => ({
                    ...prev,
                    expectedLayCapacity: event.target.value ? Number(event.target.value) : undefined
                  }))
                }
              />
            </Field>
            <Field label="Baia">
              <Input
                type="number"
                min={1}
                value={groupForm.bayNumber}
                onChange={(event) =>
                  setGroupForm((prev) => ({
                    ...prev,
                    bayNumber: Number(event.target.value) || 1
                  }))
                }
              />
            </Field>
          </div>
          <textarea
            className={textareaClass}
            placeholder="Observacoes: origem, comportamento, detalhes do lote"
            value={groupForm.notes}
            onChange={(event) => setGroupForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : editingGroupId ? "Atualizar grupo" : "Cadastrar grupo"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowGroupModal(false);
                setEditingGroupId(null);
                setGroupForm(emptyGroupForm);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </AppModal>
      <AppModal
        open={showBirdModal}
        title={editingBirdId ? "Editar ave por anilha" : "Cadastro individual por anilha"}
        error={error}
        onClose={() => {
          setShowBirdModal(false);
          setEditingBirdId(null);
          setBirdForm((prev) => ({ ...emptyBirdForm, flockGroupId: prev.flockGroupId, bayNumber: prev.bayNumber }));
          setLockedBirdGroupId(null);
        }}
      >
        <form className="grid gap-4" onSubmit={submitBird}>
          {lockedBirdGroupId ? (
            <Input
              value={`Grupo da ave: ${groups.find((group) => group.id === lockedBirdGroupId)?.title ?? "grupo selecionado"}`}
              readOnly
            />
          ) : (
            <select
              className={selectClass}
              value={birdForm.flockGroupId}
              onChange={(event) => {
                const selectedGroup = groups.find((group) => group.id === event.target.value);
                setBirdForm((prev) => ({
                  ...prev,
                  flockGroupId: event.target.value,
                  bayNumber: selectedGroup?.bayNumber ?? prev.bayNumber ?? 1
                }));
              }}
            >
              <option value="">Grupo da ave: selecione o grupo</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.title}
                </option>
              ))}
            </select>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              placeholder="ID da anilha (opcional): 2025-001"
              value={birdForm.ringNumber}
              onChange={(event) => setBirdForm((prev) => ({ ...prev, ringNumber: event.target.value }))}
            />
            <Input
              placeholder="Nome ou apelido: Rainha"
              value={birdForm.nickname}
              onChange={(event) => setBirdForm((prev) => ({ ...prev, nickname: event.target.value }))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <select
              className={selectClass}
              value={birdForm.sex}
              onChange={(event) => setBirdForm((prev) => ({ ...prev, sex: event.target.value as BirdForm["sex"] }))}
            >
              <option value="UNKNOWN">Sexo: nao informado</option>
              <option value="FEMALE">Sexo: matriz</option>
              <option value="MALE">Sexo: reprodutor</option>
            </select>
            <select
              className={selectClass}
              value={birdForm.status}
              onChange={(event) => setBirdForm((prev) => ({ ...prev, status: event.target.value as BirdStatus }))}
            >
              <option value="ACTIVE">Status atual: ativa</option>
              <option value="SICK">Status atual: doente</option>
              <option value="DEAD">Status atual: morta</option>
              <option value="BROODY">Status atual: choca</option>
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Data da aquisicao">
              <Input
                type="date"
                value={birdForm.acquisitionDate}
                onChange={(event) => setBirdForm((prev) => ({ ...prev, acquisitionDate: event.target.value }))}
              />
            </Field>
            <Field label="Baia">
              <Input
                type="number"
                min={1}
                value={birdForm.bayNumber ?? ""}
                onChange={(event) =>
                  setBirdForm((prev) => ({
                    ...prev,
                    bayNumber: event.target.value ? Number(event.target.value) : undefined
                  }))
                }
              />
            </Field>
            <Field label="Custo de aquisicao">
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Custo de aquisicao: 350"
                value={birdForm.purchaseValue ?? ""}
                onChange={(event) =>
                  setBirdForm((prev) => ({
                    ...prev,
                    purchaseValue: event.target.value ? Number(event.target.value) : undefined
                  }))
                }
              />
            </Field>
          </div>
          <Input
            placeholder="Origem ou fornecedor: Criatorio Exemplo"
            value={birdForm.origin}
            onChange={(event) => setBirdForm((prev) => ({ ...prev, origin: event.target.value }))}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving || !canSubmitBird}>
              {saving ? "Salvando..." : editingBirdId ? "Atualizar ave" : "Cadastrar ave"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowBirdModal(false);
                setEditingBirdId(null);
                setBirdForm((prev) => ({ ...emptyBirdForm, flockGroupId: prev.flockGroupId, bayNumber: prev.bayNumber }));
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={Boolean(sellingBird)}
        title={sellingBird ? `Colocar à venda — ${sellingBird.nickname || sellingBird.ringNumber}` : "Colocar à venda"}
        onClose={() => setSellingBird(null)}
        error={sellListingError}
      >
        {sellingBird ? (
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setSellListingSubmitting(true);
              setSellListingError(null);
              try {
                const overrideValue = sellListingForm.priceOverride.trim();
                const response = await fetch(`/api/plantel/birds/${sellingBird.id}/sell-listing`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ageInMonths: sellListingForm.ageInMonths,
                    priceOverride: overrideValue === "" ? null : Number(overrideValue)
                  })
                });
                if (!response.ok) {
                  const body = (await response.json().catch(() => ({}))) as { error?: string };
                  throw new Error(body.error ?? "Erro ao enviar para Vitrine.");
                }
                const data = (await response.json().catch(() => ({}))) as {
                  kind?: string;
                  missingTier?: boolean;
                };
                setSellingBird(null);
                if (data.kind === "created") {
                  setVitrineToast(
                    data.missingTier
                      ? "Ave enviada para a Vitrine. Cadastre os preços por idade na Vitrine."
                      : "Ave enviada para a Vitrine."
                  );
                }
                await loadData();
              } catch (err) {
                setSellListingError(err instanceof Error ? err.message : "Erro ao enviar para Vitrine.");
              } finally {
                setSellListingSubmitting(false);
              }
            }}
          >
            <p className="text-sm text-slate-600">
              A ave será adicionada à Vitrine com quantidade 1. Informe a idade em meses para que o
              preço seja calculado pela tabela cadastrada.
            </p>

            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-slate-800">Idade (meses)</span>
              <Input
                type="number"
                min={0}
                max={999}
                required
                value={sellListingForm.ageInMonths}
                onChange={(event) =>
                  setSellListingForm({
                    ...sellListingForm,
                    ageInMonths: Number(event.target.value || 0)
                  })
                }
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-slate-800">Preço (R$, opcional)</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={sellListingForm.priceOverride}
                onChange={(event) =>
                  setSellListingForm({ ...sellListingForm, priceOverride: event.target.value })
                }
                placeholder="Puxa da tabela se vazio"
              />
            </label>

            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSellingBird(null)}
                disabled={sellListingSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={sellListingSubmitting}>
                {sellListingSubmitting ? "Enviando..." : "Enviar para Vitrine"}
              </Button>
            </div>
          </form>
        ) : null}
      </AppModal>

      <AppModal
        open={Boolean(daughtersGroup) || daughtersLoading}
        title={
          daughtersGroup
            ? `🐣 Filhas — ${daughtersGroup.parent.title}`
            : "Carregando filhas..."
        }
        onClose={() => setDaughtersGroup(null)}
      >
        {daughtersLoading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : daughtersGroup ? (
          daughtersGroup.birds.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[color:var(--line)] bg-white/60 px-3 py-6 text-center text-sm text-slate-500">
              Nenhum filhote vivo nas chocadas deste grupo.
            </p>
          ) : (
            <ul className="grid gap-2">
              {daughtersGroup.birds.map((bird) => {
                const sexGlyph = bird.sex === "FEMALE" ? "♀" : bird.sex === "MALE" ? "♂" : "?";
                const sexLabel =
                  bird.sex === "FEMALE" ? "Fêmea" : bird.sex === "MALE" ? "Macho" : "Não informado";
                const iconBtn =
                  "inline-flex size-8 items-center justify-center rounded-lg border border-[color:var(--line)] bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 sm:size-9";
                return (
                  <li
                    key={bird.id}
                    className="rounded-2xl border border-[color:var(--line)] bg-white/80 px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-slate-800">
                          {bird.ringNumber}
                        </span>
                        <span
                          className="text-sm leading-none text-slate-500"
                          aria-label={sexLabel}
                          title={sexLabel}
                        >
                          {sexGlyph}
                        </span>
                        {bird.nickname ? (
                          <span className="truncate text-sm font-medium text-slate-800">
                            {bird.nickname}
                          </span>
                        ) : null}
                        <span className="truncate text-[11px] text-slate-500">
                          · {bird.flockGroupTitle}
                        </span>
                        {bird.inVitrine ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            Vitrine
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          aria-label="Status da ave"
                          className={`h-8 rounded-lg border border-[color:var(--line)] bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[color:var(--brand)]/20 ${statusBadge[bird.status]}`}
                          value={statusDraftByBird[bird.id] ?? bird.status}
                          onChange={async (event) => {
                            const next = event.target.value as BirdStatus;
                            setStatusDraftByBird((prev) => ({ ...prev, [bird.id]: next }));
                            if (next !== bird.status) {
                              await applyBirdStatus(bird.id, next);
                              await reloadDaughters();
                            }
                          }}
                        >
                          <option value="ACTIVE">Ativa</option>
                          <option value="SICK">Doente</option>
                          <option value="DEAD">Morta</option>
                          <option value="BROODY">Choca</option>
                        </select>

                        {!bird.inVitrine ? (
                          <button
                            type="button"
                            aria-label="Colocar à venda"
                            title="Colocar à venda"
                            className={iconBtn}
                            onClick={() => {
                              setSellingBird(bird);
                              setSellListingForm({ ageInMonths: 0, priceOverride: "" });
                              setSellListingError(null);
                            }}
                          >
                            <DollarSign className="h-4 w-4" aria-hidden />
                          </button>
                        ) : null}

                        <button
                          type="button"
                          aria-label="Histórico de status"
                          title="Histórico de status"
                          className={iconBtn}
                          onClick={() => toggleHistory(bird.id)}
                        >
                          <History className="h-4 w-4" aria-hidden />
                        </button>

                        <DeleteActionButton
                          iconOnly
                          onClick={async () => {
                            await removeBird(bird.id);
                            await reloadDaughters();
                          }}
                          aria-label="Excluir ave"
                          className="size-8 sm:size-9"
                        />
                      </div>
                    </div>
                    {historyByBird[bird.id] ? (
                      <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                        {historyByBird[bird.id].length === 0 ? (
                          <p>Sem histórico de status.</p>
                        ) : (
                          <ul className="space-y-1">
                            {historyByBird[bird.id].map((event) => (
                              <li key={event.id}>
                                {new Date(event.createdAt).toLocaleString("pt-BR")} -{" "}
                                {event.fromStatus ? statusLabel[event.fromStatus] : "-"} para{" "}
                                {statusLabel[event.toStatus]}
                                {event.reason ? ` - ${event.reason}` : ""}
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
          )
        ) : null}
      </AppModal>

      {vitrineToast ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-emerald-800">{vitrineToast}</p>
            <button
              type="button"
              onClick={() => setVitrineToast(null)}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}

      <Card>
        <h3 className="text-xl font-semibold text-slate-900">Filtros do plantel</h3>
        <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
          Use os filtros para encontrar especie, raca, variedade, status ou uma anilha especifica.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <Input placeholder="Especie" value={filterSpecies} onChange={(event) => setFilterSpecies(event.target.value)} />
          <Input placeholder="Raca" value={filterBreed} onChange={(event) => setFilterBreed(event.target.value)} />
          <Input placeholder="Variedade" value={filterVariety} onChange={(event) => setFilterVariety(event.target.value)} />
          <select className={selectClass} value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
            <option value="">Todos os status</option>
            <option value="ACTIVE">Ativa</option>
            <option value="SICK">Doente</option>
            <option value="DEAD">Morta</option>
            <option value="BROODY">Choca</option>
          </select>
          <Input placeholder="Buscar por anilha" value={ringSearch} onChange={(event) => setRingSearch(event.target.value)} />
        </div>
      </Card>

      {loading ? <p className="text-sm text-[color:var(--ink-soft)]">Carregando plantel...</p> : null}
      {!loading && groups.length === 0 ? (
        <Card>
          <p className="text-sm text-[color:var(--ink-soft)]">Nenhum grupo encontrado com os filtros atuais.</p>
        </Card>
      ) : null}

      <section className="grid items-start gap-4 lg:grid-cols-2">
        {groups.map((group) => {
          const expanded = expandedGroupId === group.id;

          return (
            <Card key={group.id} className="h-fit overflow-hidden">
              <div className="flex flex-col gap-4">
                <div className="min-w-0">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-2xl font-semibold text-slate-900">{group.title}</h3>
                      <span className="rounded-full bg-[color:var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--brand-strong)]">
                        {group.summary.totalBirds} aves
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
                      {group.species.name} - {group.breed.name}
                      {group.variety?.name ? ` - ${group.variety.name}` : ""} - Baia {group.bayNumber}
                    </p>
                  </div>
                </div>

                <div className="grid w-full auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-4">
                  <CompactStatChip emoji={"🐥"} label="Total" value={group.summary.totalBirds} />
                  <CompactStatChip emoji={"🥚"} label="Matrizes" value={group.summary.females} />
                  <CompactStatChip emoji={"🐓"} label="Reprodutores" value={group.summary.males} />
                  <CompactStatChip emoji={"✅"} label="Ativas" value={group.summary.ACTIVE} />
                  <CompactStatChip emoji={"🤢"} label="Doentes" value={group.summary.SICK} />
                  <CompactStatChip emoji={"🗑️"} label="Mortas" value={group.summary.DEAD} />
                  <CompactStatChip
                    emoji={"🐣"}
                    label="Filhas"
                    value={group.summary.daughters}
                    onClick={group.summary.daughters > 0 ? () => openDaughters(group.id) : undefined}
                  />
                  <CompactStatChip emoji={"🏠"} label="Baia" value={group.bayNumber} />
                </div>

                {group.notes ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{group.notes}</div>
                ) : null}

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[color:var(--line)] pt-3">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setEditingGroupId(group.id);
                      setShowGroupModal(true);
                      setGroupForm({
                        species: group.species.name,
                        breed: group.breed.name,
                        variety: group.variety?.name ?? "",
                        title: group.title,
                        bayNumber: group.bayNumber,
                        matrixCount: group.matrixCount,
                        reproducerCount: group.reproducerCount,
                        notes: group.notes ?? ""
                      });
                    }}
                  >
                    Editar grupo
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setEditingBirdId(null);
                      setLockedBirdGroupId(group.id);
                      setBirdForm({ ...emptyBirdForm, flockGroupId: group.id, bayNumber: group.bayNumber });
                      setShowBirdModal(true);
                    }}
                  >
                    Cadastrar ave
                  </Button>
                  <Button variant="outline" type="button" onClick={() => setExpandedGroupId(expanded ? null : group.id)}>
                    {expanded ? "Fechar aves" : "Abrir aves"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => removeGroup(group.id)}
                    aria-label="Excluir grupo"
                    title="Excluir grupo"
                    className="inline-flex size-9 items-center justify-center rounded-xl border border-rose-200 bg-white text-lg text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                  >
                    🗑️
                  </button>
                </div>

              </div>

              {expanded ? (
                group.birds.length === 0 ? (
                  <p className="mt-4 rounded-2xl border border-dashed border-[color:var(--line)] bg-white/60 px-3 py-6 text-center text-sm text-slate-500">
                    Nenhuma ave cadastrada neste grupo.
                  </p>
                ) : (
                  <ul className="mt-4 grid gap-2">
                    {group.birds.map((bird) => {
                      const sexGlyph = bird.sex === "FEMALE" ? "♀" : bird.sex === "MALE" ? "♂" : "?";
                      const sexLabel =
                        bird.sex === "FEMALE" ? "Fêmea" : bird.sex === "MALE" ? "Macho" : "Não informado";
                      const historyOpen = Boolean(historyByBird[bird.id]);
                      const historyEvents = historyByBird[bird.id];
                      const iconBtn =
                        "inline-flex size-8 items-center justify-center rounded-lg border border-[color:var(--line)] bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 sm:size-9";
                      return (
                        <li
                          key={bird.id}
                          className="rounded-2xl border border-[color:var(--line)] bg-white/80"
                        >
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-slate-800">
                                {bird.ringNumber}
                              </span>
                              <span
                                className="text-sm leading-none text-slate-500"
                                aria-label={sexLabel}
                                title={sexLabel}
                              >
                                {sexGlyph}
                              </span>
                              {bird.nickname ? (
                                <span className="truncate text-sm font-medium text-slate-800">
                                  {bird.nickname}
                                </span>
                              ) : null}
                              {bird.inVitrine ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                  Vitrine
                                </span>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-2">
                              <select
                                aria-label="Status da ave"
                                className={`h-8 rounded-lg border border-[color:var(--line)] bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[color:var(--brand)]/20 ${statusBadge[bird.status]}`}
                                value={statusDraftByBird[bird.id] ?? bird.status}
                                onChange={(event) => {
                                  const next = event.target.value as BirdStatus;
                                  setStatusDraftByBird((prev) => ({ ...prev, [bird.id]: next }));
                                  if (next !== bird.status) {
                                    void applyBirdStatus(bird.id, next);
                                  }
                                }}
                              >
                                <option value="ACTIVE">Ativa</option>
                                <option value="SICK">Doente</option>
                                <option value="DEAD">Morta</option>
                                <option value="BROODY">Choca</option>
                              </select>

                              <button
                                type="button"
                                aria-label="Editar ave"
                                title="Editar ave"
                                className={iconBtn}
                                onClick={() => {
                                  setEditingBirdId(bird.id);
                                  setShowBirdModal(true);
                                  setBirdForm({
                                    flockGroupId: bird.flockGroupId,
                                    bayNumber: bird.bayNumber ?? group.bayNumber,
                                    ringNumber: bird.ringNumber,
                                    nickname: bird.nickname ?? "",
                                    sex: bird.sex,
                                    acquisitionDate: toDateInput(bird.acquisitionDate),
                                    purchaseValue: bird.purchaseValue ? Number(bird.purchaseValue) : undefined,
                                    origin: bird.origin ?? "",
                                    status: bird.status
                                  });
                                }}
                              >
                                <Pencil className="h-4 w-4" aria-hidden />
                              </button>

                              {!bird.inVitrine ? (
                                <button
                                  type="button"
                                  aria-label="Colocar à venda"
                                  title="Colocar à venda"
                                  className={iconBtn}
                                  onClick={() => {
                                    setSellingBird(bird);
                                    setSellListingForm({ ageInMonths: 0, priceOverride: "" });
                                    setSellListingError(null);
                                  }}
                                >
                                  <DollarSign className="h-4 w-4" aria-hidden />
                                </button>
                              ) : null}

                              <button
                                type="button"
                                aria-label={historyOpen ? "Ocultar histórico" : "Ver histórico"}
                                title={historyOpen ? "Ocultar histórico" : "Ver histórico"}
                                aria-pressed={historyOpen}
                                className={`${iconBtn} ${historyOpen ? "bg-slate-100 text-slate-900" : ""}`}
                                onClick={() => toggleHistory(bird.id)}
                              >
                                <History className="h-4 w-4" aria-hidden />
                              </button>

                              <DeleteActionButton
                                iconOnly
                                onClick={() => removeBird(bird.id)}
                                aria-label="Excluir ave"
                                className="size-8 sm:size-9"
                              />
                            </div>
                          </div>

                          {historyOpen ? (
                            <div className="border-t border-[color:var(--line)] bg-slate-50/70 px-3 py-2 text-[11px] text-slate-600">
                              {!historyEvents || historyEvents.length === 0 ? (
                                <p>Sem histórico de status.</p>
                              ) : (
                                <ul className="space-y-1">
                                  {historyEvents.map((event) => (
                                    <li key={event.id}>
                                      {new Date(event.createdAt).toLocaleString("pt-BR")} -{" "}
                                      {event.fromStatus ? statusLabel[event.fromStatus] : "-"} para{" "}
                                      {statusLabel[event.toStatus]}
                                      {event.reason ? ` - ${event.reason}` : ""}
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
                )
              ) : null}
            </Card>
          );
        })}
      </section>
    </main>
  );
}




