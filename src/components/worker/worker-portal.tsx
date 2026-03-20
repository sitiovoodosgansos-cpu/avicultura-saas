"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type WorkerContext = {
  tenant: { id: string; name: string; status: string };
  link: {
    id: string;
    label: string;
    allowPlantel: boolean;
    allowEggs: boolean;
    allowIncubators: boolean;
    allowHealth: boolean;
  };
  plantel: {
    groups: Array<{ id: string; title: string }>;
    taxonomy: {
      species: Array<{ id: string; name: string }>;
      breeds: Array<{ id: string; name: string }>;
      varieties: Array<{ id: string; name: string }>;
    };
  };
  incubators: null | {
    incubators: Array<{ id: string; name: string }>;
    batches: Array<{ id: string; label: string }>;
    flockGroups: Array<{ id: string; title: string }>;
  };
  health: null | {
    infirmaries: Array<{ id: string; name: string }>;
    birds: Array<{ id: string; label: string }>;
    cases: Array<{ id: string; label: string }>;
  };
};

const selectClass =
  "h-11 w-full rounded-2xl border border-[color:var(--line)] bg-white/90 px-4 text-sm text-slate-800 outline-none focus:ring-4 focus:ring-[color:var(--brand)]/20";

const textareaClass =
  "min-h-24 w-full rounded-2xl border border-[color:var(--line)] bg-white/90 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-[color:var(--brand)]/20";

const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

export function WorkerPortal({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [context, setContext] = useState<WorkerContext | null>(null);
  const [tab, setTab] = useState<"plantel" | "coleta" | "chocadeiras" | "sanidade">("plantel");

  const [groupForm, setGroupForm] = useState({
    species: "",
    breed: "",
    variety: "",
    title: "",
    matrixCount: 0,
    reproducerCount: 0,
    expectedLayCapacity: 0,
    purchaseInvestmentTotal: 0,
    purchaseDate: "",
    notes: ""
  });
  const [birdForm, setBirdForm] = useState({
    flockGroupId: "",
    ringNumber: "",
    nickname: "",
    sex: "UNKNOWN",
    acquisitionDate: "",
    purchaseValue: 0,
    origin: "",
    status: "ACTIVE"
  });
  const [collectionForm, setCollectionForm] = useState({
    date: today,
    flockGroupId: "",
    totalEggs: 0,
    crackedEggs: 0,
    notes: ""
  });
  const [deviceForm, setDeviceForm] = useState({
    name: "",
    description: "",
    notes: "",
    status: "ACTIVE"
  });
  const [batchForm, setBatchForm] = useState({
    incubatorId: "",
    flockGroupId: "",
    entryDate: today,
    eggsSet: 1,
    expectedHatchDate: "",
    notes: "",
    status: "ACTIVE"
  });
  const [batchEventForm, setBatchEventForm] = useState({
    type: "HATCHED",
    quantity: 0,
    eventDate: today,
    notes: "",
    batchId: ""
  });
  const [infirmaryForm, setInfirmaryForm] = useState({
    name: "",
    notes: "",
    status: "ACTIVE"
  });
  const [caseForm, setCaseForm] = useState({
    birdId: "",
    infirmaryId: "",
    openedAt: today,
    diagnosis: "",
    symptoms: "",
    medication: "",
    dosage: "",
    responsible: "",
    notes: ""
  });
  const [caseEventForm, setCaseEventForm] = useState({
    id: "",
    action: "CONTINUE",
    date: today,
    notes: "",
    toInfirmaryId: ""
  });

  async function loadContext() {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/worker/${token}/context`, { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Não foi possível carregar o portal da equipe.");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as WorkerContext;
    setContext(payload);
    setBirdForm((prev) => ({ ...prev, flockGroupId: payload.plantel.groups[0]?.id ?? "" }));
    setCollectionForm((prev) => ({ ...prev, flockGroupId: payload.plantel.groups[0]?.id ?? "" }));
    setBatchForm((prev) => ({
      ...prev,
      incubatorId: payload.incubators?.incubators[0]?.id ?? "",
      flockGroupId: payload.incubators?.flockGroups[0]?.id ?? payload.plantel.groups[0]?.id ?? ""
    }));
    setBatchEventForm((prev) => ({ ...prev, batchId: payload.incubators?.batches[0]?.id ?? "" }));
    setCaseForm((prev) => ({
      ...prev,
      birdId: payload.health?.birds[0]?.id ?? "",
      infirmaryId: payload.health?.infirmaries[0]?.id ?? ""
    }));
    setCaseEventForm((prev) => ({ ...prev, id: payload.health?.cases[0]?.id ?? "" }));
    setLoading(false);
  }

  useEffect(() => {
    loadContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const allowedTabs = useMemo(() => {
    return [
      context?.link.allowPlantel ? { key: "plantel" as const, label: "Plantel" } : null,
      context?.link.allowEggs ? { key: "coleta" as const, label: "Coleta" } : null,
      context?.link.allowIncubators ? { key: "chocadeiras" as const, label: "Chocadeiras" } : null,
      context?.link.allowHealth ? { key: "sanidade" as const, label: "Sanidade" } : null
    ].filter(Boolean) as Array<{ key: "plantel" | "coleta" | "chocadeiras" | "sanidade"; label: string }>;
  }, [context]);

  async function submit(url: string, body: unknown, successMessage: string) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Não foi possível salvar.");
      setSaving(false);
      return false;
    }
    setSuccess(successMessage);
    setSaving(false);
    await loadContext();
    return true;
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando portal da equipe...</p>;
  }

  if (!context) {
    return <Card><p className="text-sm text-rose-600">{error ?? "Link inválido."}</p></Card>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Acesso da equipe</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">{context.tenant.name}</h1>
        <p className="mt-2 text-sm text-slate-500">
          Este link permite preencher o sistema sem abrir a área financeira.
        </p>
      </Card>

      {error ? <Card className="border-rose-200 bg-rose-50"><p className="text-sm text-rose-700">{error}</p></Card> : null}
      {success ? <Card className="border-emerald-200 bg-emerald-50"><p className="text-sm text-emerald-700">{success}</p></Card> : null}

      <div className="flex flex-wrap gap-2">
        {allowedTabs.map((item) => (
          <Button key={item.key} type="button" variant={tab === item.key ? "default" : "outline"} onClick={() => setTab(item.key)}>
            {item.label}
          </Button>
        ))}
      </div>

      {tab === "plantel" ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="text-xl font-semibold text-slate-900">Novo grupo</h3>
            <form
              className="mt-4 grid gap-3"
              onSubmit={async (event) => {
                event.preventDefault();
                const ok = await submit(`/api/worker/${token}/plantel/groups`, groupForm, "Grupo cadastrado com sucesso.");
                if (ok) setGroupForm({ species: "", breed: "", variety: "", title: "", matrixCount: 0, reproducerCount: 0, expectedLayCapacity: 0, purchaseInvestmentTotal: 0, purchaseDate: "", notes: "" });
              }}
            >
              <Input placeholder="Espécie: Galinha, Peru, Faisão" value={groupForm.species} onChange={(e) => setGroupForm((p) => ({ ...p, species: e.target.value }))} />
              <Input placeholder="Raça: Brahma, Gigante Negro" value={groupForm.breed} onChange={(e) => setGroupForm((p) => ({ ...p, breed: e.target.value }))} />
              <Input placeholder="Variedade ou cor" value={groupForm.variety} onChange={(e) => setGroupForm((p) => ({ ...p, variety: e.target.value }))} />
              <Input placeholder="Nome do card do grupo" value={groupForm.title} onChange={(e) => setGroupForm((p) => ({ ...p, title: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" min={0} placeholder="Número de matrizes" value={groupForm.matrixCount} onChange={(e) => setGroupForm((p) => ({ ...p, matrixCount: Number(e.target.value) }))} />
                <Input type="number" min={0} placeholder="Número de reprodutores" value={groupForm.reproducerCount} onChange={(e) => setGroupForm((p) => ({ ...p, reproducerCount: Number(e.target.value) }))} />
              </div>
              <textarea className={textareaClass} placeholder="Observações do grupo" value={groupForm.notes} onChange={(e) => setGroupForm((p) => ({ ...p, notes: e.target.value }))} />
              <Button type="submit" disabled={saving}>Salvar grupo</Button>
            </form>
          </Card>

          <Card>
            <h3 className="text-xl font-semibold text-slate-900">Cadastro por anilha</h3>
            <form
              className="mt-4 grid gap-3"
              onSubmit={async (event) => {
                event.preventDefault();
                const ok = await submit(`/api/worker/${token}/plantel/birds`, birdForm, "Ave cadastrada com sucesso.");
                if (ok) setBirdForm((p) => ({ ...p, ringNumber: "", nickname: "", acquisitionDate: "", purchaseValue: 0, origin: "", status: "ACTIVE" }));
              }}
            >
              <select className={selectClass} value={birdForm.flockGroupId} onChange={(e) => setBirdForm((p) => ({ ...p, flockGroupId: e.target.value }))}>
                <option value="">Grupo da ave</option>
                {context.plantel.groups.map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}
              </select>
              <Input placeholder="Número da anilha" value={birdForm.ringNumber} onChange={(e) => setBirdForm((p) => ({ ...p, ringNumber: e.target.value }))} />
              <Input placeholder="Nome ou apelido" value={birdForm.nickname} onChange={(e) => setBirdForm((p) => ({ ...p, nickname: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <select className={selectClass} value={birdForm.sex} onChange={(e) => setBirdForm((p) => ({ ...p, sex: e.target.value }))}>
                  <option value="UNKNOWN">Sexo: não informado</option>
                  <option value="FEMALE">Sexo: matriz</option>
                  <option value="MALE">Sexo: reprodutor</option>
                </select>
                <select className={selectClass} value={birdForm.status} onChange={(e) => setBirdForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="ACTIVE">Status: ativa</option>
                  <option value="SICK">Status: doente</option>
                  <option value="DEAD">Status: morta</option>
                  <option value="BROODY">Status: choca</option>
                </select>
              </div>
              <Input type="date" value={birdForm.acquisitionDate} onChange={(e) => setBirdForm((p) => ({ ...p, acquisitionDate: e.target.value }))} />
              <Input type="number" min={0} step="0.01" placeholder="Valor da compra" value={birdForm.purchaseValue} onChange={(e) => setBirdForm((p) => ({ ...p, purchaseValue: Number(e.target.value) }))} />
              <Input placeholder="Origem ou fornecedor" value={birdForm.origin} onChange={(e) => setBirdForm((p) => ({ ...p, origin: e.target.value }))} />
              <Button type="submit" disabled={saving}>Salvar ave</Button>
            </form>
          </Card>
        </section>
      ) : null}

      {tab === "coleta" ? (
        <Card>
          <h3 className="text-xl font-semibold text-slate-900">Coleta de ovos</h3>
          <form
            className="mt-4 grid gap-3 md:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault();
              const ok = await submit(`/api/worker/${token}/eggs/collections`, collectionForm, "Coleta registrada com sucesso.");
              if (ok) setCollectionForm((p) => ({ ...p, totalEggs: 0, crackedEggs: 0, notes: "" }));
            }}
          >
            <Input type="date" value={collectionForm.date} onChange={(e) => setCollectionForm((p) => ({ ...p, date: e.target.value }))} />
            <select className={selectClass} value={collectionForm.flockGroupId} onChange={(e) => setCollectionForm((p) => ({ ...p, flockGroupId: e.target.value }))}>
              <option value="">Grupo de origem</option>
              {context.plantel.groups.map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}
            </select>
            <Input type="number" min={0} placeholder="Total coletado" value={collectionForm.totalEggs} onChange={(e) => setCollectionForm((p) => ({ ...p, totalEggs: Number(e.target.value) }))} />
            <Input type="number" min={0} placeholder="Ovos trincados" value={collectionForm.crackedEggs} onChange={(e) => setCollectionForm((p) => ({ ...p, crackedEggs: Number(e.target.value) }))} />
            <textarea className={`${textareaClass} md:col-span-2`} placeholder="Observações da coleta" value={collectionForm.notes} onChange={(e) => setCollectionForm((p) => ({ ...p, notes: e.target.value }))} />
            <div className="rounded-2xl bg-[color:var(--surface-soft)] px-4 py-3 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Taxa de ovos bons</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {collectionForm.totalEggs > 0 ? (((Math.max(collectionForm.totalEggs - collectionForm.crackedEggs, 0) / collectionForm.totalEggs) * 100).toFixed(1)) : "0.0"}%
              </p>
            </div>
            <Button type="submit" disabled={saving} className="md:col-span-2">Salvar coleta</Button>
          </form>
        </Card>
      ) : null}

      {tab === "chocadeiras" && context.incubators ? (
        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <h3 className="text-xl font-semibold text-slate-900">Nova chocadeira</h3>
            <form className="mt-4 grid gap-3" onSubmit={async (e) => { e.preventDefault(); const ok = await submit(`/api/worker/${token}/incubators/devices`, deviceForm, "Chocadeira cadastrada com sucesso."); if (ok) setDeviceForm({ name: "", description: "", notes: "", status: "ACTIVE" }); }}>
              <Input placeholder="Nome da chocadeira" value={deviceForm.name} onChange={(e) => setDeviceForm((p) => ({ ...p, name: e.target.value }))} />
              <Input placeholder="Descrição" value={deviceForm.description} onChange={(e) => setDeviceForm((p) => ({ ...p, description: e.target.value }))} />
              <textarea className={textareaClass} placeholder="Observações" value={deviceForm.notes} onChange={(e) => setDeviceForm((p) => ({ ...p, notes: e.target.value }))} />
              <select className={selectClass} value={deviceForm.status} onChange={(e) => setDeviceForm((p) => ({ ...p, status: e.target.value }))}>
                <option value="ACTIVE">Ativa</option>
                <option value="INACTIVE">Inativa</option>
                <option value="MAINTENANCE">Manutenção</option>
              </select>
              <Button type="submit" disabled={saving}>Salvar chocadeira</Button>
            </form>
          </Card>

          <Card>
            <h3 className="text-xl font-semibold text-slate-900">Novo lote</h3>
            <form className="mt-4 grid gap-3" onSubmit={async (e) => { e.preventDefault(); const ok = await submit(`/api/worker/${token}/incubators/batches`, batchForm, "Lote cadastrado com sucesso."); if (ok) setBatchForm((p) => ({ ...p, eggsSet: 1, expectedHatchDate: "", notes: "" })); }}>
              <select className={selectClass} value={batchForm.incubatorId} onChange={(e) => setBatchForm((p) => ({ ...p, incubatorId: e.target.value }))}>
                <option value="">Chocadeira</option>
                {context.incubators.incubators.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select className={selectClass} value={batchForm.flockGroupId} onChange={(e) => setBatchForm((p) => ({ ...p, flockGroupId: e.target.value }))}>
                <option value="">Grupo de origem</option>
                {context.incubators.flockGroups.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
              <Input type="date" value={batchForm.entryDate} onChange={(e) => setBatchForm((p) => ({ ...p, entryDate: e.target.value }))} />
              <Input type="number" min={1} placeholder="Ovos colocados" value={batchForm.eggsSet} onChange={(e) => setBatchForm((p) => ({ ...p, eggsSet: Number(e.target.value) }))} />
              <Input type="date" value={batchForm.expectedHatchDate} onChange={(e) => setBatchForm((p) => ({ ...p, expectedHatchDate: e.target.value }))} />
              <Button type="submit" disabled={saving}>Salvar lote</Button>
            </form>
          </Card>

          <Card>
            <h3 className="text-xl font-semibold text-slate-900">Evento do lote</h3>
            <form className="mt-4 grid gap-3" onSubmit={async (e) => { e.preventDefault(); const ok = await submit(`/api/worker/${token}/incubators/batches/${batchEventForm.batchId}/events`, { type: batchEventForm.type, quantity: batchEventForm.quantity, eventDate: batchEventForm.eventDate, notes: batchEventForm.notes }, "Evento do lote registrado."); if (ok) setBatchEventForm((p) => ({ ...p, quantity: 0, notes: "" })); }}>
              <select className={selectClass} value={batchEventForm.batchId} onChange={(e) => setBatchEventForm((p) => ({ ...p, batchId: e.target.value }))}>
                <option value="">Selecione o lote</option>
                {context.incubators.batches.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <select className={selectClass} value={batchEventForm.type} onChange={(e) => setBatchEventForm((p) => ({ ...p, type: e.target.value }))}>
                <option value="HATCHED">Nasceram</option>
                <option value="INFERTILE">Inférteis</option>
                <option value="EMBRYO_LOSS">Perda embrionária</option>
                <option value="PIPPED_DIED">Bicaram e morreram</option>
                <option value="IN_PROGRESS">Em andamento</option>
                <option value="OTHER">Outro</option>
              </select>
              <Input type="number" min={0} placeholder="Quantidade" value={batchEventForm.quantity} onChange={(e) => setBatchEventForm((p) => ({ ...p, quantity: Number(e.target.value) }))} />
              <Input type="date" value={batchEventForm.eventDate} onChange={(e) => setBatchEventForm((p) => ({ ...p, eventDate: e.target.value }))} />
              <Button type="submit" disabled={saving}>Salvar evento</Button>
            </form>
          </Card>
        </section>
      ) : null}

      {tab === "sanidade" && context.health ? (
        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <h3 className="text-xl font-semibold text-slate-900">Nova enfermaria</h3>
            <form className="mt-4 grid gap-3" onSubmit={async (e) => { e.preventDefault(); const ok = await submit(`/api/worker/${token}/health/infirmaries`, infirmaryForm, "Enfermaria cadastrada com sucesso."); if (ok) setInfirmaryForm({ name: "", notes: "", status: "ACTIVE" }); }}>
              <Input placeholder="Nome da enfermaria" value={infirmaryForm.name} onChange={(e) => setInfirmaryForm((p) => ({ ...p, name: e.target.value }))} />
              <textarea className={textareaClass} placeholder="Observações" value={infirmaryForm.notes} onChange={(e) => setInfirmaryForm((p) => ({ ...p, notes: e.target.value }))} />
              <select className={selectClass} value={infirmaryForm.status} onChange={(e) => setInfirmaryForm((p) => ({ ...p, status: e.target.value }))}>
                <option value="ACTIVE">Ativa</option>
                <option value="INACTIVE">Inativa</option>
              </select>
              <Button type="submit" disabled={saving}>Salvar enfermaria</Button>
            </form>
          </Card>

          <Card>
            <h3 className="text-xl font-semibold text-slate-900">Novo caso</h3>
            <form className="mt-4 grid gap-3" onSubmit={async (e) => { e.preventDefault(); const ok = await submit(`/api/worker/${token}/health/cases`, caseForm, "Caso registrado com sucesso."); if (ok) setCaseForm((p) => ({ ...p, diagnosis: "", symptoms: "", medication: "", dosage: "", responsible: "", notes: "" })); }}>
              <select className={selectClass} value={caseForm.birdId} onChange={(e) => setCaseForm((p) => ({ ...p, birdId: e.target.value }))}>
                <option value="">Ave</option>
                {context.health.birds.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <select className={selectClass} value={caseForm.infirmaryId} onChange={(e) => setCaseForm((p) => ({ ...p, infirmaryId: e.target.value }))}>
                <option value="">Enfermaria</option>
                {context.health.infirmaries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <Input type="date" value={caseForm.openedAt} onChange={(e) => setCaseForm((p) => ({ ...p, openedAt: e.target.value }))} />
              <Input placeholder="Diagnóstico" value={caseForm.diagnosis} onChange={(e) => setCaseForm((p) => ({ ...p, diagnosis: e.target.value }))} />
              <Input placeholder="Sintomas" value={caseForm.symptoms} onChange={(e) => setCaseForm((p) => ({ ...p, symptoms: e.target.value }))} />
              <Input placeholder="Medicação" value={caseForm.medication} onChange={(e) => setCaseForm((p) => ({ ...p, medication: e.target.value }))} />
              <Button type="submit" disabled={saving}>Salvar caso</Button>
            </form>
          </Card>

          <Card>
            <h3 className="text-xl font-semibold text-slate-900">Evento do caso</h3>
            <form className="mt-4 grid gap-3" onSubmit={async (e) => { e.preventDefault(); const ok = await submit(`/api/worker/${token}/health/cases/${caseEventForm.id}/event`, { action: caseEventForm.action, date: caseEventForm.date, notes: caseEventForm.notes, toInfirmaryId: caseEventForm.toInfirmaryId || undefined }, "Evento da sanidade registrado."); if (ok) setCaseEventForm((p) => ({ ...p, notes: "" })); }}>
              <select className={selectClass} value={caseEventForm.id} onChange={(e) => setCaseEventForm((p) => ({ ...p, id: e.target.value }))}>
                <option value="">Caso</option>
                {context.health.cases.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <select className={selectClass} value={caseEventForm.action} onChange={(e) => setCaseEventForm((p) => ({ ...p, action: e.target.value }))}>
                <option value="CONTINUE">Continua em tratamento</option>
                <option value="CURE">Curada</option>
                <option value="DEATH">Morreu</option>
                <option value="TRANSFER">Transferida</option>
              </select>
              {caseEventForm.action === "TRANSFER" ? (
                <select className={selectClass} value={caseEventForm.toInfirmaryId} onChange={(e) => setCaseEventForm((p) => ({ ...p, toInfirmaryId: e.target.value }))}>
                  <option value="">Enfermaria de destino</option>
                  {context.health.infirmaries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              ) : null}
              <Input type="date" value={caseEventForm.date} onChange={(e) => setCaseEventForm((p) => ({ ...p, date: e.target.value }))} />
              <textarea className={textareaClass} placeholder="Observações do evento" value={caseEventForm.notes} onChange={(e) => setCaseEventForm((p) => ({ ...p, notes: e.target.value }))} />
              <Button type="submit" disabled={saving}>Salvar evento</Button>
            </form>
          </Card>
        </section>
      ) : null}
    </main>
  );
}
