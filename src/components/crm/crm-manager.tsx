"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { PageTitle } from "@/components/layout/page-title";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/crm/kanban-board";
import { LeadFormModal, type LeadFormValues } from "@/components/crm/lead-form-modal";
import { LeadDetailModal } from "@/components/crm/lead-detail-modal";
import { LeadSaleModal } from "@/components/crm/lead-sale-modal";
import { ArchiveTab } from "@/components/crm/archive-tab";
import { SalesTab } from "@/components/crm/sales-tab";
import { KpiStrip } from "@/components/crm/kpi-strip";
import { FiltersBar, type CrmFilters } from "@/components/crm/filters-bar";
import { temperatureFor } from "@/lib/crm/temperature";
import type { CrmMetrics, Lead } from "@/components/crm/types";
import type { LeadStage } from "@prisma/client";

type Tab = "active" | "archived" | "sales";

const POLL_MS = 30_000;

export function CrmManager() {
  const [tab, setTab] = useState<Tab>("active");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metrics, setMetrics] = useState<CrmMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<CrmFilters>({
    search: "",
    channel: "",
    interest: "",
    temperature: "",
    tag: ""
  });

  // Modais
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Lead | null>(null);
  const [saleLead, setSaleLead] = useState<Lead | null>(null);
  const [saleError, setSaleError] = useState<string | null>(null);

  const reqIdRef = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqIdRef.current;
    try {
      const [leadsRes, metricsRes] = await Promise.all([
        fetch("/api/crm/leads", { cache: "no-store" }),
        fetch("/api/crm/metrics", { cache: "no-store" })
      ]);
      if (id !== reqIdRef.current) return; // request mais recente em curso
      if (leadsRes.ok) {
        const j = (await leadsRes.json()) as { leads: Lead[] };
        setLeads(j.leads ?? []);
      }
      if (metricsRes.ok) {
        const j = (await metricsRes.json()) as CrmMetrics;
        setMetrics(j);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar.");
    } finally {
      if (id === reqIdRef.current) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void load();
  }, [load]);

  // Polling 30s + refetch on focus
  useEffect(() => {
    if (tab !== "active") return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [tab, load]);

  // Filtros aplicados (so na aba ativa)
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) for (const t of l.tags) set.add(t);
    return Array.from(set).sort();
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return leads.filter((l) => {
      if (filters.channel && l.channel !== filters.channel) return false;
      if (filters.interest && l.interestType !== filters.interest) return false;
      if (filters.tag && !l.tags.includes(filters.tag)) return false;
      if (filters.temperature) {
        // Comprou + Em Espera nao tem temperatura (parking intencional)
        if (l.stage === "COMPROU" || l.stage === "EM_ESPERA") return false;
        const t = temperatureFor(l.lastInteractionAt);
        if (t === "frozen" || t !== filters.temperature) return false;
      }
      if (!q) return true;
      const hay = [
        l.name,
        l.city,
        l.state,
        l.interestText,
        l.observation,
        l.phone,
        l.email,
        ...l.tags
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [leads, filters]);

  // Actions
  function openCreate() {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  }
  function openEdit(lead: Lead) {
    setEditing(lead);
    setFormError(null);
    setFormOpen(true);
    setDetail(null);
  }

  async function submitForm(values: LeadFormValues, id?: string) {
    setFormError(null);
    const payload = {
      name: values.name,
      phone: values.phone || null,
      email: values.email || null,
      city: values.city || null,
      state: values.state || null,
      channel: values.channel,
      channelOther: values.channelOther || null,
      interestType: values.interestType || null,
      interestText: values.interestText || null,
      observation: values.observation || null,
      tags: values.tags
    };
    const url = id ? `/api/crm/leads/${id}` : "/api/crm/leads";
    const method = id ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setFormError(body.error ?? "Falha ao salvar.");
      return;
    }
    setFormOpen(false);
    await load();
  }

  async function moveLead(leadId: string, toStage: LeadStage, position: number) {
    // Otimista
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: toStage, position } : l)));
    const res = await fetch(`/api/crm/leads/${leadId}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: toStage, position })
    });
    if (!res.ok) {
      // reverte recarregando
      await load();
      return;
    }
    // Se moveu pra COMPROU e card ainda nao tem venda registrada, abre modal
    const fresh = (await res.json()) as Lead;
    if (toStage === "COMPROU" && !fresh.financialEntryId) {
      setSaleLead(fresh);
      setSaleError(null);
    }
    await load();
  }

  async function archiveLead(lead: Lead) {
    await fetch(`/api/crm/leads/${lead.id}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "manual" })
    });
    await load();
  }

  async function deleteLead(lead: Lead) {
    await fetch(`/api/crm/leads/${lead.id}`, { method: "DELETE" });
    await load();
  }

  async function updateLead(id: string, patch: Partial<Lead>) {
    const res = await fetch(`/api/crm/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (res.ok) {
      const updated = (await res.json()) as Lead;
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
      if (detail?.id === id) setDetail(updated);
    }
  }

  async function submitSale(payload: unknown) {
    if (!saleLead) return;
    setSaleError(null);
    const res = await fetch(`/api/crm/leads/${saleLead.id}/sale`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSaleError(body.error ?? "Falha ao registrar venda.");
      return;
    }
    setSaleLead(null);
    await load();
  }

  return (
    <main className="grid gap-3">
      <PageTitle title="CRM" description="Kanban de clientes — arraste cards entre as colunas pra mover de fase." icon="📋" />

      <KpiStrip metrics={metrics} />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-2xl border border-zinc-200 bg-white p-1">
        {(
          [
            { key: "active" as Tab, label: "Kanban ativo" },
            { key: "archived" as Tab, label: `📦 Arquivados${metrics ? ` (${metrics.archivedCount})` : ""}` },
            { key: "sales" as Tab, label: `💰 Vendas${metrics ? ` (${metrics.salesCount30d})` : ""}` }
          ]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
              tab === t.key
                ? "bg-[linear-gradient(135deg,var(--brand),var(--brand-strong))] text-white shadow"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : null}

      {tab === "active" ? (
        <>
          <div className="flex flex-wrap items-stretch gap-2">
            <Button type="button" onClick={openCreate} className="shrink-0">
              <Plus className="mr-1 inline h-4 w-4" /> Novo cliente
            </Button>
            <div className="flex-1 min-w-[200px]">
              <FiltersBar filters={filters} setFilters={setFilters} allTags={allTags} />
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-zinc-500">Carregando clientes...</p>
          ) : (
            <KanbanBoard
              leads={filteredLeads}
              onMove={moveLead}
              onOpenLead={(l) => setDetail(l)}
              onArchiveLead={archiveLead}
            />
          )}
        </>
      ) : null}

      {tab === "archived" ? <ArchiveTab onChange={load} /> : null}
      {tab === "sales" ? <SalesTab /> : null}

      <LeadFormModal
        open={formOpen}
        editing={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={submitForm}
        error={formError}
      />

      <LeadDetailModal
        open={Boolean(detail)}
        lead={detail}
        onClose={() => setDetail(null)}
        onUpdate={updateLead}
        onArchive={archiveLead}
        onDelete={deleteLead}
        onEdit={(l) => openEdit(l)}
        onOpenSale={(l) => {
          setDetail(null);
          setSaleLead(l);
          setSaleError(null);
        }}
      />

      <LeadSaleModal
        open={Boolean(saleLead)}
        lead={saleLead}
        onClose={() => setSaleLead(null)}
        onSubmit={submitSale}
        error={saleError}
      />
    </main>
  );
}
