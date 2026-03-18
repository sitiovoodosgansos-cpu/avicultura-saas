"use client";

import { useEffect, useMemo, useState } from "react";
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

type PlantelResponse = {
  groups: PlantelGroup[];
  taxonomy: {
    species: Array<{ id: string; name: string }>;
    breeds: Array<{ id: string; name: string }>;
    varieties: Array<{ id: string; name: string }>;
  };
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

const statusLabel: Record<BirdStatus, string> = {
  ACTIVE: "Ativa",
  SICK: "Doente",
  DEAD: "Morta",
  BROODY: "Choca"
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

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function PlantelManager() {
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

    const response = await fetch(`/api/plantel/groups?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) {
      setError("Não foi possível carregar o plantel.");
      setLoading(false);
      return;
    }

    const data: PlantelResponse = await response.json();
    setGroups(data.groups);
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
    const ok = window.confirm("Tem certeza que deseja excluir este grupo? As aves também serão removidas.");
    if (!ok) return;

    const response = await fetch(`/api/plantel/groups/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Não foi possível excluir o grupo.");
      return;
    }
    await loadData();
  }

  async function removeBird(id: string) {
    const ok = window.confirm("Confirma a exclusão desta ave?");
    if (!ok) return;

    const response = await fetch(`/api/plantel/birds/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Não foi possível excluir a ave.");
      return;
    }
    await loadData();
  }

  async function applyBirdStatus(id: string) {
    const nextStatus = statusDraftByBird[id];
    if (!nextStatus) return;

    const reason = window.prompt("Motivo da alteração de status (opcional):") ?? "";

    const response = await fetch(`/api/plantel/birds/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, reason })
    });

    if (!response.ok) {
      setError("Não foi possível atualizar o status.");
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
      setError("Não foi possível carregar o histórico da ave.");
      return;
    }

    const data = (await response.json()) as { history: BirdHistory[] };
    setHistoryByBird((prev) => ({ ...prev, [id]: data.history }));
  }

  return (
    <main className="space-y-6">
      <PageTitle
        title="Plantel"
        description="Cadastro de grupos, aves por anilha, filtros e histórico de status."
      />

      {error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-base font-semibold text-zinc-900">
            {editingGroupId ? "Editar grupo" : "Novo grupo"}
          </h3>
          <form className="mt-4 grid gap-3" onSubmit={submitGroup}>
            <Input placeholder="Espécie (ex: Galinha)" value={groupForm.species} onChange={(e) => setGroupForm((p) => ({ ...p, species: e.target.value }))} />
            <Input placeholder="Raça (ex: Brahma)" value={groupForm.breed} onChange={(e) => setGroupForm((p) => ({ ...p, breed: e.target.value }))} />
            <Input placeholder="Variedade/cor (opcional)" value={groupForm.variety} onChange={(e) => setGroupForm((p) => ({ ...p, variety: e.target.value }))} />
            <Input placeholder="Título do card (ex: Galinha Brahma Dark)" value={groupForm.title} onChange={(e) => setGroupForm((p) => ({ ...p, title: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" min={0} placeholder="Qtd matrizes" value={groupForm.matrixCount} onChange={(e) => setGroupForm((p) => ({ ...p, matrixCount: Number(e.target.value) }))} />
              <Input type="number" min={0} placeholder="Qtd reprodutores" value={groupForm.reproducerCount} onChange={(e) => setGroupForm((p) => ({ ...p, reproducerCount: Number(e.target.value) }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" min={0} max={100} placeholder="Meta postura (%)" value={groupForm.expectedLayCapacity ?? ""} onChange={(e) => setGroupForm((p) => ({ ...p, expectedLayCapacity: e.target.value ? Number(e.target.value) : undefined }))} />
              <Input type="number" min={0} step="0.01" placeholder="Investimento total" value={groupForm.purchaseInvestmentTotal ?? ""} onChange={(e) => setGroupForm((p) => ({ ...p, purchaseInvestmentTotal: e.target.value ? Number(e.target.value) : undefined }))} />
            </div>
            <Input type="date" value={groupForm.purchaseDate} onChange={(e) => setGroupForm((p) => ({ ...p, purchaseDate: e.target.value }))} />
            <Input placeholder="Observações" value={groupForm.notes} onChange={(e) => setGroupForm((p) => ({ ...p, notes: e.target.value }))} />
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingGroupId ? "Atualizar grupo" : "Cadastrar grupo"}</Button>
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
          <h3 className="text-base font-semibold text-zinc-900">Nova ave / editar ave</h3>
          <form className="mt-4 grid gap-3" onSubmit={submitBird}>
            <select
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
              value={birdForm.flockGroupId}
              onChange={(e) => setBirdForm((p) => ({ ...p, flockGroupId: e.target.value }))}
            >
              <option value="">Selecione o grupo</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.title}</option>
              ))}
            </select>
            <Input placeholder="Número da anilha" value={birdForm.ringNumber} onChange={(e) => setBirdForm((p) => ({ ...p, ringNumber: e.target.value }))} />
            <Input placeholder="Nome/apelido (opcional)" value={birdForm.nickname} onChange={(e) => setBirdForm((p) => ({ ...p, nickname: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <select
                className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
                value={birdForm.sex}
                onChange={(e) => setBirdForm((p) => ({ ...p, sex: e.target.value as BirdForm["sex"] }))}
              >
                <option value="UNKNOWN">Sexo não informado</option>
                <option value="FEMALE">Fêmea</option>
                <option value="MALE">Macho</option>
              </select>
              <select
                className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
                value={birdForm.status}
                onChange={(e) => setBirdForm((p) => ({ ...p, status: e.target.value as BirdStatus }))}
              >
                <option value="ACTIVE">Ativa</option>
                <option value="SICK">Doente</option>
                <option value="DEAD">Morta</option>
                <option value="BROODY">Choca</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={birdForm.acquisitionDate} onChange={(e) => setBirdForm((p) => ({ ...p, acquisitionDate: e.target.value }))} />
              <Input type="number" min={0} step="0.01" placeholder="Valor compra" value={birdForm.purchaseValue ?? ""} onChange={(e) => setBirdForm((p) => ({ ...p, purchaseValue: e.target.value ? Number(e.target.value) : undefined }))} />
            </div>
            <Input placeholder="Origem/fornecedor" value={birdForm.origin} onChange={(e) => setBirdForm((p) => ({ ...p, origin: e.target.value }))} />
            <div className="flex gap-2">
              <Button type="submit" disabled={saving || !canSubmitBird}>{saving ? "Salvando..." : editingBirdId ? "Atualizar ave" : "Cadastrar ave"}</Button>
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
        <h3 className="text-base font-semibold text-zinc-900">Filtros</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          <Input placeholder="Espécie" value={filterSpecies} onChange={(e) => setFilterSpecies(e.target.value)} />
          <Input placeholder="Raça" value={filterBreed} onChange={(e) => setFilterBreed(e.target.value)} />
          <Input placeholder="Variedade" value={filterVariety} onChange={(e) => setFilterVariety(e.target.value)} />
          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="ACTIVE">Ativa</option>
            <option value="SICK">Doente</option>
            <option value="DEAD">Morta</option>
            <option value="BROODY">Choca</option>
          </select>
          <Input placeholder="Buscar por anilha" value={ringSearch} onChange={(e) => setRingSearch(e.target.value)} />
        </div>
      </Card>

      {loading ? <p className="text-sm text-zinc-500">Carregando plantel...</p> : null}
      {!loading && groups.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-500">Nenhum grupo encontrado com os filtros atuais.</p>
        </Card>
      ) : null}

      <section className="grid gap-4">
        {groups.map((group) => {
          const expanded = expandedGroupId === group.id;
          return (
            <Card key={group.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">{group.title}</h3>
                  <p className="text-sm text-zinc-500">
                    {group.species.name} • {group.breed.name}
                    {group.variety?.name ? ` • ${group.variety.name}` : ""}
                  </p>
                  <div className="mt-3 grid gap-1 text-sm text-zinc-700 md:grid-cols-2 xl:grid-cols-4">
                    <p>Total: {group.summary.totalBirds}</p>
                    <p>Fêmeas: {group.summary.females}</p>
                    <p>Machos: {group.summary.males}</p>
                    <p>Ativas: {group.summary.ACTIVE}</p>
                    <p>Doentes: {group.summary.SICK}</p>
                    <p>Mortas: {group.summary.DEAD}</p>
                    <p>Chocas: {group.summary.BROODY}</p>
                  </div>
                </div>
                <div className="flex gap-2">
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
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setExpandedGroupId(expanded ? null : group.id)}
                  >
                    {expanded ? "Fechar" : "Abrir"}
                  </Button>
                </div>
              </div>

              {expanded ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-zinc-500">
                        <th className="py-2 pr-3">Anilha</th>
                        <th className="py-2 pr-3">Nome</th>
                        <th className="py-2 pr-3">Sexo</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 pr-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.birds.map((bird) => (
                        <>
                          <tr key={bird.id} className="border-b border-zinc-100 align-top">
                            <td className="py-2 pr-3 font-medium text-zinc-900">{bird.ringNumber}</td>
                            <td className="py-2 pr-3">{bird.nickname || "-"}</td>
                            <td className="py-2 pr-3">
                              {bird.sex === "FEMALE" ? "Fêmea" : bird.sex === "MALE" ? "Macho" : "Não informado"}
                            </td>
                            <td className="py-2 pr-3">{statusLabel[bird.status]}</td>
                            <td className="py-2 pr-3">
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
                                  className="h-10 rounded-md border border-zinc-300 bg-white px-2 text-sm"
                                  value={statusDraftByBird[bird.id] ?? bird.status}
                                  onChange={(e) =>
                                    setStatusDraftByBird((prev) => ({
                                      ...prev,
                                      [bird.id]: e.target.value as BirdStatus
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
                                  {historyByBird[bird.id] ? "Ocultar histórico" : "Ver histórico"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {historyByBird[bird.id] ? (
                            <tr className="border-b border-zinc-100">
                              <td className="py-2 pr-3 text-xs text-zinc-500" colSpan={5}>
                                {historyByBird[bird.id].length === 0 ? (
                                  <p>Sem histórico de status.</p>
                                ) : (
                                  <ul className="space-y-1">
                                    {historyByBird[bird.id].map((event) => (
                                      <li key={event.id}>
                                        {new Date(event.createdAt).toLocaleString("pt-BR")} • {event.fromStatus ? statusLabel[event.fromStatus] : "-"} → {statusLabel[event.toStatus]} {event.reason ? `• ${event.reason}` : ""}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </td>
                            </tr>
                          ) : null}
                        </>
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
