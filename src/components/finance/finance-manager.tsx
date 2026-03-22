"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageTitle } from "@/components/layout/page-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppModal } from "@/components/ui/app-modal";

type Category = string;

type CategoryOption = {
  value: Category;
  label: string;
};

type Entry = {
  id: string;
  date: string;
  category: Category;
  item: string;
  amount: number;
  description: string | null;
  customer: string | null;
  notes: string | null;
};

type Expense = {
  id: string;
  date: string;
  category: Category;
  item: string;
  amount: number;
  description: string | null;
  supplier: string | null;
  notes: string | null;
};

type Metrics = {
  summary: {
    monthIncome: number;
    monthExpenses: number;
    monthNet: number;
  };
  periods: {
    days7: { income: number; expenses: number; net: number };
    days30: { income: number; expenses: number; net: number };
    days365: { income: number; expenses: number; net: number };
  };
  monthlyEvolution: Array<{ month: string; income: number; expenses: number; net: number }>;
};

type EntryForm = {
  date: string;
  category: Category;
  item: string;
  amount: number;
  description: string;
  customer: string;
  notes: string;
};

type ExpenseForm = {
  date: string;
  category: Category;
  item: string;
  amount: number;
  description: string;
  supplier: string;
  notes: string;
};

const defaultCategories: CategoryOption[] = [
  { value: "EGG_SALE", label: "Venda de ovos" },
  { value: "CHICK_SALE", label: "Venda de filhotes" },
  { value: "ADULT_BIRD_SALE", label: "Venda de aves adultas" },
  { value: "FEED", label: "RaÃ§Ã£o" },
  { value: "MEDICATION", label: "Medicamentos" },
  { value: "STRUCTURE", label: "Estrutura" },
  { value: "MAINTENANCE", label: "ManutenÃ§Ã£o" },
  { value: "OTHER", label: "Outros" }
];

const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

const emptyEntry: EntryForm = {
  date: today,
  category: "EGG_SALE",
  item: "",
  amount: 0,
  description: "",
  customer: "",
  notes: ""
};

const emptyExpense: ExpenseForm = {
  date: today,
  category: "FEED",
  item: "",
  amount: 0,
  description: "",
  supplier: "",
  notes: ""
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function toDateInput(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatCategoryLabel(value: string) {
  const fromDefault = defaultCategories.find((category) => category.value === value);
  if (fromDefault) return fromDefault.label;
  return value;
}

function CategorySelect({
  value,
  options,
  onChange,
  onCreate
}: {
  value: string;
  options: CategoryOption[];
  onChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <select
      className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm"
      value={value}
      onChange={(event) => {
        if (event.target.value === "__new__") {
          onCreate();
          return;
        }
        onChange(event.target.value);
      }}
    >
      {options.map((category) => (
        <option key={category.value} value={category.value}>
          {category.label}
        </option>
      ))}
      <option value="__new__">+ Nova categoria</option>
    </select>
  );
}

export function FinanceManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const [entryForm, setEntryForm] = useState<EntryForm>(emptyEntry);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpense);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterQuery, setFilterQuery] = useState("");

  const [customCategories, setCustomCategories] = useState<CategoryOption[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryTarget, setCategoryTarget] = useState<"entry" | "expense" | "filter">("entry");
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, CategoryOption>();

    for (const option of defaultCategories) {
      map.set(option.value, option);
    }

    for (const option of customCategories) {
      map.set(option.value, option);
    }

    for (const value of [...entries.map((row) => row.category), ...expenses.map((row) => row.category)]) {
      if (!map.has(value)) {
        map.set(value, { value, label: formatCategoryLabel(value) });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [customCategories, entries, expenses]);

  const totals = useMemo(() => {
    const income = entries.reduce((sum, row) => sum + row.amount, 0);
    const out = expenses.reduce((sum, row) => sum + row.amount, 0);
    return {
      income: Number(income.toFixed(2)),
      expenses: Number(out.toFixed(2)),
      net: Number((income - out).toFixed(2))
    };
  }, [entries, expenses]);

  async function loadData() {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    if (filterCategory) params.set("category", filterCategory);
    if (filterQuery) params.set("q", filterQuery);

    const [entriesRes, expensesRes, metricsRes] = await Promise.all([
      fetch(`/api/finance/entries?${params.toString()}`, { cache: "no-store" }),
      fetch(`/api/finance/expenses?${params.toString()}`, { cache: "no-store" }),
      fetch("/api/finance/metrics", { cache: "no-store" })
    ]);

    if (!entriesRes.ok || !expensesRes.ok || !metricsRes.ok) {
      setError("NÃ£o foi possÃ­vel carregar dados do financeiro.");
      setLoading(false);
      return;
    }

    const entriesPayload = (await entriesRes.json()) as { entries: Entry[] };
    const expensesPayload = (await expensesRes.json()) as { expenses: Expense[] };
    const metricsPayload = (await metricsRes.json()) as Metrics;

    setEntries(entriesPayload.entries);
    setExpenses(expensesPayload.expenses);
    setMetrics(metricsPayload);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterFrom, filterTo, filterCategory, filterQuery]);

  function openCategoryModal(target: "entry" | "expense" | "filter") {
    setCategoryTarget(target);
    setNewCategoryName("");
    setShowCategoryModal(true);
  }

  function saveNewCategory() {
    const value = newCategoryName.trim();
    if (!value) return;

    const option = { value, label: value };
    setCustomCategories((prev) => {
      if (prev.some((item) => item.value.toLowerCase() === value.toLowerCase())) return prev;
      return [...prev, option];
    });

    if (categoryTarget === "entry") {
      setEntryForm((prev) => ({ ...prev, category: value }));
    }
    if (categoryTarget === "expense") {
      setExpenseForm((prev) => ({ ...prev, category: value }));
    }
    if (categoryTarget === "filter") {
      setFilterCategory(value);
    }

    setShowCategoryModal(false);
  }

  async function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const endpoint = editingEntryId ? `/api/finance/entries/${editingEntryId}` : "/api/finance/entries";
    const method = editingEntryId ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entryForm)
    });

    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      setError(payload.error ?? "Falha ao salvar entrada.");
      setSaving(false);
      return;
    }

    setEntryForm(emptyEntry);
    setEditingEntryId(null);
    setShowEntryModal(false);
    setSaving(false);
    await loadData();
  }

  async function saveExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const endpoint = editingExpenseId ? `/api/finance/expenses/${editingExpenseId}` : "/api/finance/expenses";
    const method = editingExpenseId ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expenseForm)
    });

    if (!res.ok) {
      const payload = (await res.json()) as { error?: string };
      setError(payload.error ?? "Falha ao salvar saÃ­da.");
      setSaving(false);
      return;
    }

    setExpenseForm(emptyExpense);
    setEditingExpenseId(null);
    setShowExpenseModal(false);
    setSaving(false);
    await loadData();
  }

  async function removeEntry(id: string) {
    if (!window.confirm("Excluir lanÃ§amento de entrada?")) return;
    const res = await fetch(`/api/finance/entries/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("NÃ£o foi possÃ­vel excluir entrada.");
      return;
    }
    await loadData();
  }

  async function removeExpense(id: string) {
    if (!window.confirm("Excluir lanÃ§amento de saÃ­da?")) return;
    const res = await fetch(`/api/finance/expenses/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("NÃ£o foi possÃ­vel excluir saÃ­da.");
      return;
    }
    await loadData();
  }

  return (
    <main className="space-y-6">
      <PageTitle title="Financeiro" description="Entradas, saÃ­das, comparativos de perÃ­odo e resultado lÃ­quido." />

      {error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : null}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">📥 Entradas do mÃªs</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatMoney(metrics?.summary.monthIncome ?? 0)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">📤 SaÃ­das do mÃªs</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatMoney(metrics?.summary.monthExpenses ?? 0)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">📤 Saldo do mÃªs</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatMoney(metrics?.summary.monthNet ?? 0)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">📊 Resultado</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatMoney(totals.net)}</p>
        </Card>
      </section>

      <Card>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => { setEditingEntryId(null); setEntryForm(emptyEntry); setShowEntryModal(true); }}>
            Nova entrada
          </Button>
          <Button type="button" variant="outline" onClick={() => { setEditingExpenseId(null); setExpenseForm(emptyExpense); setShowExpenseModal(true); }}>
            Nova saida
          </Button>
        </div>
      </Card>

      <section className="hidden grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-zinc-900">Nova entrada</h3>
            <Button type="button" variant="outline" onClick={() => openCategoryModal("entry")}>
              Nova categoria
            </Button>
          </div>
          <form className="mt-4 grid gap-3" onSubmit={saveEntry}>
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={entryForm.date} onChange={(e) => setEntryForm((p) => ({ ...p, date: e.target.value }))} />
              <CategorySelect
                value={entryForm.category}
                options={categoryOptions}
                onChange={(value) => setEntryForm((p) => ({ ...p, category: value }))}
                onCreate={() => openCategoryModal("entry")}
              />
            </div>
            <Input placeholder="Item vendido" value={entryForm.item} onChange={(e) => setEntryForm((p) => ({ ...p, item: e.target.value }))} />
            <Input type="number" min={0} step="0.01" placeholder="Valor" value={entryForm.amount} onChange={(e) => setEntryForm((p) => ({ ...p, amount: Number(e.target.value) }))} />
            <Input placeholder="DescriÃ§Ã£o" value={entryForm.description} onChange={(e) => setEntryForm((p) => ({ ...p, description: e.target.value }))} />
            <Input placeholder="Cliente (opcional)" value={entryForm.customer} onChange={(e) => setEntryForm((p) => ({ ...p, customer: e.target.value }))} />
            <Input placeholder="ObservaÃ§Ãµes" value={entryForm.notes} onChange={(e) => setEntryForm((p) => ({ ...p, notes: e.target.value }))} />
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingEntryId ? "Atualizar" : "Cadastrar"}</Button>
              {editingEntryId ? (
                <Button type="button" variant="outline" onClick={() => { setEditingEntryId(null); setEntryForm(emptyEntry); }}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-zinc-900">Nova saÃ­da</h3>
            <Button type="button" variant="outline" onClick={() => openCategoryModal("expense")}>
              Nova categoria
            </Button>
          </div>
          <form className="mt-4 grid gap-3" onSubmit={saveExpense}>
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((p) => ({ ...p, date: e.target.value }))} />
              <CategorySelect
                value={expenseForm.category}
                options={categoryOptions}
                onChange={(value) => setExpenseForm((p) => ({ ...p, category: value }))}
                onCreate={() => openCategoryModal("expense")}
              />
            </div>
            <Input placeholder="Item comprado/despesa" value={expenseForm.item} onChange={(e) => setExpenseForm((p) => ({ ...p, item: e.target.value }))} />
            <Input type="number" min={0} step="0.01" placeholder="Valor" value={expenseForm.amount} onChange={(e) => setExpenseForm((p) => ({ ...p, amount: Number(e.target.value) }))} />
            <Input placeholder="DescriÃ§Ã£o" value={expenseForm.description} onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))} />
            <Input placeholder="Fornecedor (opcional)" value={expenseForm.supplier} onChange={(e) => setExpenseForm((p) => ({ ...p, supplier: e.target.value }))} />
            <Input placeholder="ObservaÃ§Ãµes" value={expenseForm.notes} onChange={(e) => setExpenseForm((p) => ({ ...p, notes: e.target.value }))} />
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingExpenseId ? "Atualizar" : "Cadastrar"}</Button>
              {editingExpenseId ? (
                <Button type="button" variant="outline" onClick={() => { setEditingExpenseId(null); setExpenseForm(emptyExpense); }}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </section>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-zinc-900">Filtros e totalizadores</h3>
          <Button type="button" variant="outline" onClick={() => openCategoryModal("filter")}>
            Nova categoria
          </Button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
          <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
          <select className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">Todas categorias</option>
            {categoryOptions.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
          </select>
          <Input placeholder="Busca textual" value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} />
        </div>
        <div className="mt-4 grid gap-2 text-sm text-zinc-700 md:grid-cols-3">
          <p>Total entradas filtradas: <strong>{formatMoney(totals.income)}</strong></p>
          <p>Total saÃ­das filtradas: <strong>{formatMoney(totals.expenses)}</strong></p>
          <p>Resultado lÃ­quido filtrado: <strong>{formatMoney(totals.net)}</strong></p>
        </div>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-base font-semibold text-zinc-900">Comparativo de perÃ­odos</h3>
          <div className="mt-3 space-y-2 text-sm text-zinc-700">
            <p>7 dias: {formatMoney(metrics?.periods.days7.income ?? 0)} / {formatMoney(metrics?.periods.days7.expenses ?? 0)} / lÃ­quido {formatMoney(metrics?.periods.days7.net ?? 0)}</p>
            <p>30 dias: {formatMoney(metrics?.periods.days30.income ?? 0)} / {formatMoney(metrics?.periods.days30.expenses ?? 0)} / lÃ­quido {formatMoney(metrics?.periods.days30.net ?? 0)}</p>
            <p>365 dias: {formatMoney(metrics?.periods.days365.income ?? 0)} / {formatMoney(metrics?.periods.days365.expenses ?? 0)} / lÃ­quido {formatMoney(metrics?.periods.days365.net ?? 0)}</p>
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-zinc-900">EvoluÃ§Ã£o financeira</h3>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.monthlyEvolution ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="income" fill="#0f766e" name="Entradas" />
                <Bar dataKey="expenses" fill="#dc2626" name="SaÃ­das" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <Card>
        <h3 className="text-base font-semibold text-zinc-900">LanÃ§amentos de entradas</h3>
        {loading ? <p className="mt-4 text-sm text-zinc-500">Carregando...</p> : null}
        {!loading && entries.length === 0 ? <p className="mt-4 text-sm text-zinc-500">Sem entradas no perÃ­odo.</p> : null}
        {!loading && entries.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Categoria</th>
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Cliente</th>
                  <th className="py-2 pr-3">Valor</th>
                  <th className="py-2 pr-3">AÃ§Ãµes</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-3">{new Date(row.date).toLocaleDateString("pt-BR")}</td>
                    <td className="py-2 pr-3">{formatCategoryLabel(row.category)}</td>
                    <td className="py-2 pr-3">{row.item}</td>
                    <td className="py-2 pr-3">{row.customer || "-"}</td>
                    <td className="py-2 pr-3">{formatMoney(row.amount)}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => {
                          setEditingEntryId(row.id);
                          setEntryForm({
                            date: toDateInput(row.date),
                            category: row.category,
                            item: row.item,
                            amount: row.amount,
                            description: row.description ?? "",
                            customer: row.customer ?? "",
                            notes: row.notes ?? ""
                          });
                          setShowEntryModal(true);
                        }}>Editar</Button>
                        <Button variant="danger" type="button" onClick={() => removeEntry(row.id)}>Excluir</Button>
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
        <h3 className="text-base font-semibold text-zinc-900">LanÃ§amentos de saÃ­das</h3>
        {!loading && expenses.length === 0 ? <p className="mt-4 text-sm text-zinc-500">Sem saÃ­das no perÃ­odo.</p> : null}
        {!loading && expenses.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Categoria</th>
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Fornecedor</th>
                  <th className="py-2 pr-3">Valor</th>
                  <th className="py-2 pr-3">AÃ§Ãµes</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-3">{new Date(row.date).toLocaleDateString("pt-BR")}</td>
                    <td className="py-2 pr-3">{formatCategoryLabel(row.category)}</td>
                    <td className="py-2 pr-3">{row.item}</td>
                    <td className="py-2 pr-3">{row.supplier || "-"}</td>
                    <td className="py-2 pr-3">{formatMoney(row.amount)}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => {
                          setEditingExpenseId(row.id);
                          setExpenseForm({
                            date: toDateInput(row.date),
                            category: row.category,
                            item: row.item,
                            amount: row.amount,
                            description: row.description ?? "",
                            supplier: row.supplier ?? "",
                            notes: row.notes ?? ""
                          });
                          setShowExpenseModal(true);
                        }}>Editar</Button>
                        <Button variant="danger" type="button" onClick={() => removeExpense(row.id)}>Excluir</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <AppModal
        open={showEntryModal}
        title={editingEntryId ? "Editar entrada" : "Nova entrada"}
        onClose={() => {
          setShowEntryModal(false);
          setEditingEntryId(null);
          setEntryForm(emptyEntry);
        }}
      >
        <div className="mb-3">
          <Button type="button" variant="outline" onClick={() => openCategoryModal("entry")}>
            Nova categoria
          </Button>
        </div>
        <form className="grid gap-3" onSubmit={saveEntry}>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={entryForm.date} onChange={(e) => setEntryForm((p) => ({ ...p, date: e.target.value }))} />
            <CategorySelect value={entryForm.category} options={categoryOptions} onChange={(value) => setEntryForm((p) => ({ ...p, category: value }))} onCreate={() => openCategoryModal("entry")} />
          </div>
          <Input placeholder="Item vendido" value={entryForm.item} onChange={(e) => setEntryForm((p) => ({ ...p, item: e.target.value }))} />
          <Input type="number" min={0} step="0.01" placeholder="Valor" value={entryForm.amount} onChange={(e) => setEntryForm((p) => ({ ...p, amount: Number(e.target.value) }))} />
          <Input placeholder="Descricao" value={entryForm.description} onChange={(e) => setEntryForm((p) => ({ ...p, description: e.target.value }))} />
          <Input placeholder="Cliente (opcional)" value={entryForm.customer} onChange={(e) => setEntryForm((p) => ({ ...p, customer: e.target.value }))} />
          <Input placeholder="Observacoes" value={entryForm.notes} onChange={(e) => setEntryForm((p) => ({ ...p, notes: e.target.value }))} />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingEntryId ? "Atualizar" : "Cadastrar"}</Button>
            <Button type="button" variant="outline" onClick={() => { setShowEntryModal(false); setEditingEntryId(null); setEntryForm(emptyEntry); }}>Cancelar</Button>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={showExpenseModal}
        title={editingExpenseId ? "Editar saida" : "Nova saida"}
        onClose={() => {
          setShowExpenseModal(false);
          setEditingExpenseId(null);
          setExpenseForm(emptyExpense);
        }}
      >
        <div className="mb-3">
          <Button type="button" variant="outline" onClick={() => openCategoryModal("expense")}>
            Nova categoria
          </Button>
        </div>
        <form className="grid gap-3" onSubmit={saveExpense}>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((p) => ({ ...p, date: e.target.value }))} />
            <CategorySelect value={expenseForm.category} options={categoryOptions} onChange={(value) => setExpenseForm((p) => ({ ...p, category: value }))} onCreate={() => openCategoryModal("expense")} />
          </div>
          <Input placeholder="Item comprado/despesa" value={expenseForm.item} onChange={(e) => setExpenseForm((p) => ({ ...p, item: e.target.value }))} />
          <Input type="number" min={0} step="0.01" placeholder="Valor" value={expenseForm.amount} onChange={(e) => setExpenseForm((p) => ({ ...p, amount: Number(e.target.value) }))} />
          <Input placeholder="Descricao" value={expenseForm.description} onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))} />
          <Input placeholder="Fornecedor (opcional)" value={expenseForm.supplier} onChange={(e) => setExpenseForm((p) => ({ ...p, supplier: e.target.value }))} />
          <Input placeholder="Observacoes" value={expenseForm.notes} onChange={(e) => setExpenseForm((p) => ({ ...p, notes: e.target.value }))} />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingExpenseId ? "Atualizar" : "Cadastrar"}</Button>
            <Button type="button" variant="outline" onClick={() => { setShowExpenseModal(false); setEditingExpenseId(null); setExpenseForm(emptyExpense); }}>Cancelar</Button>
          </div>
        </form>
      </AppModal>

      {showCategoryModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.25)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Categoria personalizada</p>
            <h3 className="mt-2 text-2xl font-semibold text-zinc-900">Nova categoria</h3>
            <p className="mt-2 text-sm text-zinc-500">Crie uma categoria nova para entradas, saÃ­das ou filtro.</p>
            <div className="mt-5">
              <Input
                placeholder="Ex.: Vacinas, Frete, Equipamentos"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
              />
            </div>
            <div className="mt-5 flex gap-2">
              <Button type="button" onClick={saveNewCategory}>Salvar categoria</Button>
              <Button type="button" variant="outline" onClick={() => setShowCategoryModal(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

