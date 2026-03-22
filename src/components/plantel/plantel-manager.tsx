"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { BirdStatus } from "@prisma/client";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PlantelGroup = {
  id: string;
  title: string;
  notes: string | null;
  matrixCount: number;
  reproducerCount: number;
  species: { name: string };
  breed: { name: string };
  variety: { name: string } | null;
  summary: {
    totalBirds: number;
    females: number;
    males: number;
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
  sex: "FEMALE" | "MALE" | "UNKNOWN";
  status: BirdStatus;
  origin: string | null;
  acquisitionDate: string | null;
  purchaseValue: string | number | null;
  flockGroupId: string;
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
  matrixCount: number;
  reproducerCount: number;
  expectedLayCapacity?: number;
  purchaseInvestmentTotal?: number;
  purchaseDate: string;
  notes: string;
};

type BirdForm = {
  flockGroupId: string;
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
  matrixCount: 0,
  reproducerCount: 0,
  purchaseDate: "",
  notes: ""
};

const emptyBirdForm: BirdForm = {
  flockGroupId: "",
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
    <div className="rounded-2xl bg-[color:var(--surface-soft)] px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {emoji} {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
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

  const canSubmitBird = useMemo(() => Boolean(birdForm.flockGroupId), [birdForm.flockGroupId]);

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
      setBirdForm((prev) => ({ ...prev, flockGroupId: data.groups[0].id }));
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

    setBirdForm((prev) => ({ ...emptyBirdForm, flockGroupId: prev.flockGroupId }));
    setEditingBirdId(null);
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

  async function applyBirdStatus(id: string) {
    const nextStatus = statusDraftByBird[id];
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
        title="🦚 Plantel"
        description="Cadastro do plantel com foco em grupos, anilhas e status das aves."
      />

      {error ? (
        <Card className="border-rose-200 bg-rose-50">
          <p className="text-sm font-medium text-rose-700">{error}</p>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <StatChip emoji="🐥" label="Aves totais" value={totals.total} />
        <StatChip emoji="✅" label="Ativas" value={totals.active} />
        <StatChip emoji="🤒" label="Doentes" value={totals.sick} />
        <StatChip emoji="🕊️" label="Mortas" value={totals.dead} />
      </section>

      {showWorkerLinks ? (
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">🔗 Link da equipe</h3>
            <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
              Gere um link para funcionário lançar plantel, coleta, chocadeiras e sanidade sem acessar o financeiro.
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
                    {link.isActive ? "Ativo" : "Inativo"} • criado em{" "}
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

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <h3 className="text-xl font-semibold text-slate-900">
            {editingGroupId ? "✏️ Editar grupo" : "➕ Novo grupo de aves"}
          </h3>
          <p className="mt-1 text-sm text-[color:var(--ink-soft)]">Cadastro do grupo principal.</p>

          <form className="mt-5 grid gap-4" onSubmit={submitGroup}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Input
                  placeholder="Especie: Galinha, Peru, Faisao"
                  value={groupForm.species}
                  onChange={(event) => setGroupForm((prev) => ({ ...prev, species: event.target.value }))}
                />
              </div>
              <div>
                <Input
                  placeholder="Raca: Brahma, Gigante Negro, Bronze"
                  value={groupForm.breed}
                  onChange={(event) => setGroupForm((prev) => ({ ...prev, breed: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Input
                  placeholder="Variedade ou cor: Dark, Branco, Dourado"
                  value={groupForm.variety}
                  onChange={(event) => setGroupForm((prev) => ({ ...prev, variety: event.target.value }))}
                />
              </div>
              <div>
                <Input
                  placeholder="Nome do card: Galinha Brahma Dark"
                  value={groupForm.title}
                  onChange={(event) => setGroupForm((prev) => ({ ...prev, title: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Numero de matrizes">
                <Input
                  type="number"
                  min={0}
                  value={groupForm.matrixCount}
                  onChange={(event) => setGroupForm((prev) => ({ ...prev, matrixCount: Number(event.target.value) }))}
                />
              </Field>
              <Field label="Numero de reprodutores">
                <Input
                  type="number"
                  min={0}
                  value={groupForm.reproducerCount}
                  onChange={(event) =>
                    setGroupForm((prev) => ({ ...prev, reproducerCount: Number(event.target.value) }))
                  }
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Meta anual por ave matriz">
                <Input
                  type="number"
                  min={0}
                  max={365}
                  placeholder="Ex: 200 (max. 365)"
                  value={groupForm.expectedLayCapacity ?? ""}
                  onChange={(event) =>
                    setGroupForm((prev) => ({
                      ...prev,
                      expectedLayCapacity: event.target.value ? Number(event.target.value) : undefined
                    }))
                  }
                />
              </Field>
              <Field label="Investimento total">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Ex: 2500"
                  value={groupForm.purchaseInvestmentTotal ?? ""}
                  onChange={(event) =>
                    setGroupForm((prev) => ({
                      ...prev,
                      purchaseInvestmentTotal: event.target.value ? Number(event.target.value) : undefined
                    }))
                  }
                />
              </Field>
              <div>
                <Input
                  type={groupForm.purchaseDate ? "date" : "text"}
                  placeholder="Data da compra: dd/mm/aaaa"
                  value={groupForm.purchaseDate}
                  onFocus={(event) => {
                    event.currentTarget.type = "date";
                  }}
                  onBlur={(event) => {
                    if (!event.currentTarget.value) event.currentTarget.type = "text";
                  }}
                  onChange={(event) => setGroupForm((prev) => ({ ...prev, purchaseDate: event.target.value }))}
                />
              </div>
            </div>

            <div>
              <textarea
                className={textareaClass}
                placeholder="Observacoes: origem, comportamento, detalhes do lote"
                value={groupForm.notes}
                onChange={(event) => setGroupForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : editingGroupId ? "Atualizar grupo" : "Cadastrar grupo"}
              </Button>
              {editingGroupId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingGroupId(null);
                    setGroupForm(emptyGroupForm);
                  }}
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <Card>
          <h3 className="text-xl font-semibold text-slate-900">
            {editingBirdId ? "🛠️ Editar ave" : "🐣 Cadastro individual por anilha"}
          </h3>
          <p className="mt-1 text-sm text-[color:var(--ink-soft)]">Cadastro individual das aves.</p>

          <form className="mt-5 grid gap-4" onSubmit={submitBird}>
            <div>
              <select
                className={selectClass}
                value={birdForm.flockGroupId}
                onChange={(event) => setBirdForm((prev) => ({ ...prev, flockGroupId: event.target.value }))}
              >
                <option value="">Grupo da ave: selecione o grupo</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Input
                  placeholder="Numero da anilha: 2025-001"
                  value={birdForm.ringNumber}
                  onChange={(event) => setBirdForm((prev) => ({ ...prev, ringNumber: event.target.value }))}
                />
              </div>
              <div>
                <Input
                  placeholder="Nome ou apelido: Rainha"
                  value={birdForm.nickname}
                  onChange={(event) => setBirdForm((prev) => ({ ...prev, nickname: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <select
                  className={selectClass}
                  value={birdForm.sex}
                  onChange={(event) => setBirdForm((prev) => ({ ...prev, sex: event.target.value as BirdForm["sex"] }))}
                >
                  <option value="UNKNOWN">Sexo: nao informado</option>
                  <option value="FEMALE">Sexo: matriz</option>
                  <option value="MALE">Sexo: reprodutor</option>
                </select>
              </div>
              <div>
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
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Input
                  type={birdForm.acquisitionDate ? "date" : "text"}
                  placeholder="Data de aquisicao: dd/mm/aaaa"
                  value={birdForm.acquisitionDate}
                  onFocus={(event) => {
                    event.currentTarget.type = "date";
                  }}
                  onBlur={(event) => {
                    if (!event.currentTarget.value) event.currentTarget.type = "text";
                  }}
                  onChange={(event) => setBirdForm((prev) => ({ ...prev, acquisitionDate: event.target.value }))}
                />
              </div>
              <Field label="Valor da compra">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Ex: 350"
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

            <div>
              <Input
                placeholder="Origem ou fornecedor: Criatorio Exemplo"
                value={birdForm.origin}
                onChange={(event) => setBirdForm((prev) => ({ ...prev, origin: event.target.value }))}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving || !canSubmitBird}>
                {saving ? "Salvando..." : editingBirdId ? "Atualizar ave" : "Cadastrar ave"}
              </Button>
              {editingBirdId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingBirdId(null);
                    setBirdForm((prev) => ({ ...emptyBirdForm, flockGroupId: prev.flockGroupId }));
                  }}
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </section>

      <Card>
        <h3 className="text-xl font-semibold text-slate-900">🔎 Filtros do plantel</h3>
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

      <section className="grid gap-4">
        {groups.map((group) => {
          const expanded = expandedGroupId === group.id;

          return (
            <Card key={group.id} className="overflow-hidden">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-semibold text-slate-900">{group.title}</h3>
                    <span className="rounded-full bg-[color:var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--brand-strong)]">
                      {group.summary.totalBirds} aves
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
                    {group.species.name} • {group.breed.name}
                    {group.variety?.name ? ` • ${group.variety.name}` : ""}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatChip emoji="🐥" label="Total" value={group.summary.totalBirds} />
                    <StatChip emoji="🥚" label="Matrizes" value={group.matrixCount} />
                    <StatChip emoji="🐓" label="Reprodutores" value={group.reproducerCount} />
                    <StatChip emoji="✅" label="Ativas" value={group.summary.ACTIVE} />
                    <StatChip emoji="🤒" label="Doentes" value={group.summary.SICK} />
                    <StatChip emoji="🕊️" label="Mortas" value={group.summary.DEAD} />
                    <StatChip emoji="🥚" label="Chocas" value={group.summary.BROODY} />
                  </div>

                  {group.notes ? (
                    <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      {group.notes}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 xl:max-w-xs xl:justify-end">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setEditingGroupId(group.id);
                      setGroupForm({
                        species: group.species.name,
                        breed: group.breed.name,
                        variety: group.variety?.name ?? "",
                        title: group.title,
                        matrixCount: group.matrixCount,
                        reproducerCount: group.reproducerCount,
                        purchaseDate: "",
                        notes: group.notes ?? ""
                      });
                    }}
                  >
                    Editar grupo
                  </Button>
                  <Button variant="danger" type="button" onClick={() => removeGroup(group.id)}>
                    Excluir grupo
                  </Button>
                  <Button variant="outline" type="button" onClick={() => setExpandedGroupId(expanded ? null : group.id)}>
                    {expanded ? "Fechar aves" : "Abrir aves"}
                  </Button>
                </div>
              </div>

              {expanded ? (
                <div className="mt-6 overflow-x-auto rounded-[24px] border border-[color:var(--line)]">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Anilha</th>
                        <th className="px-4 py-3">Nome</th>
                        <th className="px-4 py-3">Sexo</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.birds.map((bird) => (
                        <Fragment key={bird.id}>
                          <tr className="border-t border-[color:var(--line)] align-top">
                            <td className="px-4 py-4 font-semibold text-slate-900">{bird.ringNumber}</td>
                            <td className="px-4 py-4">{bird.nickname || "-"}</td>
                            <td className="px-4 py-4">
                              {bird.sex === "FEMALE" ? "Femea" : bird.sex === "MALE" ? "Macho" : "Nao informado"}
                            </td>
                            <td className="px-4 py-4">
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge[bird.status]}`}>
                                {statusLabel[bird.status]}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  type="button"
                                  onClick={() => {
                                    setEditingBirdId(bird.id);
                                    setBirdForm({
                                      flockGroupId: bird.flockGroupId,
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
                                  Editar
                                </Button>
                                <Button variant="danger" type="button" onClick={() => removeBird(bird.id)}>
                                  Excluir
                                </Button>
                                <select
                                  className={`${selectClass} min-w-40`}
                                  value={statusDraftByBird[bird.id] ?? bird.status}
                                  onChange={(event) =>
                                    setStatusDraftByBird((prev) => ({
                                      ...prev,
                                      [bird.id]: event.target.value as BirdStatus
                                    }))
                                  }
                                >
                                  <option value="ACTIVE">Ativa</option>
                                  <option value="SICK">Doente</option>
                                  <option value="DEAD">Morta</option>
                                  <option value="BROODY">Choca</option>
                                </select>
                                <Button variant="outline" type="button" onClick={() => applyBirdStatus(bird.id)}>
                                  Atualizar status
                                </Button>
                                <Button variant="outline" type="button" onClick={() => toggleHistory(bird.id)}>
                                  {historyByBird[bird.id] ? "Ocultar historico" : "Ver historico"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {historyByBird[bird.id] ? (
                            <tr className="border-t border-[color:var(--line)] bg-slate-50/70">
                              <td className="px-4 py-3 text-xs text-slate-600" colSpan={5}>
                                {historyByBird[bird.id].length === 0 ? (
                                  <p>Sem historico de status.</p>
                                ) : (
                                  <ul className="space-y-1">
                                    {historyByBird[bird.id].map((event) => (
                                      <li key={event.id}>
                                        {new Date(event.createdAt).toLocaleString("pt-BR")} •{" "}
                                        {event.fromStatus ? statusLabel[event.fromStatus] : "-"} para {statusLabel[event.toStatus]}
                                        {event.reason ? ` • ${event.reason}` : ""}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </Card>
          );
        })}
      </section>
    </main>
  );
}
