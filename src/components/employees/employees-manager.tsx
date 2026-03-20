"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Employee = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  allowPlantel: boolean;
  allowEggs: boolean;
  allowIncubators: boolean;
  allowHealth: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type EmployeeForm = {
  name: string;
  email: string;
  password: string;
  isActive: boolean;
  allowPlantel: boolean;
  allowEggs: boolean;
  allowIncubators: boolean;
  allowHealth: boolean;
};

const emptyForm: EmployeeForm = {
  name: "",
  email: "",
  password: "",
  isActive: true,
  allowPlantel: true,
  allowEggs: true,
  allowIncubators: true,
  allowHealth: true
};

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-white/80 px-4 py-3 text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4" />
      <span>{label}</span>
    </label>
  );
}

export function EmployeesManager() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);

  const modalTitle = useMemo(
    () => (editingEmployeeId ? "Editar funcionário" : "Novo funcionário"),
    [editingEmployeeId]
  );

  async function loadEmployees() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/employees", { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Não foi possível carregar os funcionários.");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as { employees: Employee[] };
    setEmployees(payload.employees);
    setLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadEmployees();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  function openCreateModal() {
    setEditingEmployeeId(null);
    setForm(emptyForm);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  }

  function openEditModal(employee: Employee) {
    setEditingEmployeeId(employee.id);
    setForm({
      name: employee.name,
      email: employee.email,
      password: "",
      isActive: employee.isActive,
      allowPlantel: employee.allowPlantel,
      allowEggs: employee.allowEggs,
      allowIncubators: employee.allowIncubators,
      allowHealth: employee.allowHealth
    });
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  }

  async function submitEmployee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const endpoint = editingEmployeeId ? `/api/employees/${editingEmployeeId}` : "/api/employees";
    const method = editingEmployeeId ? "PUT" : "POST";
    const body = editingEmployeeId && !form.password ? { ...form, password: undefined } : form;

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Não foi possível salvar o funcionário.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setIsModalOpen(false);
    setForm(emptyForm);
    setEditingEmployeeId(null);
    setSuccess(editingEmployeeId ? "Funcionário atualizado com sucesso." : "Funcionário criado com sucesso.");
    await loadEmployees();
  }

  async function copyEmployeeLoginLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/equipe/login`);
    setSuccess("Link de login da equipe copiado.");
  }

  async function disableEmployee(id: string) {
    const confirmed = window.confirm("Deseja desativar este funcionário agora?");
    if (!confirmed) return;

    setError(null);
    setSuccess(null);
    const response = await fetch(`/api/employees/${id}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Não foi possível desativar o funcionário.");
      return;
    }

    setSuccess("Funcionário desativado.");
    await loadEmployees();
  }

  return (
    <>
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Funcionários com login e senha</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Cadastre acessos da equipe com permissões por módulo. O funcionário pode criar, editar e excluir apenas dentro das áreas liberadas.
            </p>
            <p className="mt-2 text-xs text-zinc-500">A equipe entra pelo endereço `/equipe/login` com e-mail e senha definidos pelo titular.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={copyEmployeeLoginLink}>
              Copiar link da equipe
            </Button>
            <Button type="button" onClick={openCreateModal}>
              Adicionar funcionário
            </Button>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {success ? <p className="mt-4 text-sm text-emerald-700">{success}</p> : null}

        {loading ? <p className="mt-4 text-sm text-zinc-500">Carregando funcionários...</p> : null}

        {!loading && employees.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[color:var(--line)] bg-[color:var(--surface-soft)] px-4 py-6 text-sm text-zinc-600">
            Nenhum funcionário cadastrado ainda. Crie o primeiro acesso da equipe para liberar o lançamento com login próprio.
          </div>
        ) : null}

        {!loading && employees.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {employees.map((employee) => (
              <div key={employee.id} className="rounded-3xl border border-[color:var(--line)] bg-white/90 px-4 py-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold text-slate-900">{employee.name}</h4>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${employee.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                        {employee.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{employee.email}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Último acesso: {employee.lastLoginAt ? new Date(employee.lastLoginAt).toLocaleString("pt-BR") : "ainda não acessou"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => openEditModal(employee)}>
                      Editar
                    </Button>
                    <Button type="button" variant="danger" onClick={() => disableEmployee(employee.id)} disabled={!employee.isActive}>
                      Desativar
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className={`rounded-full px-3 py-1 ${employee.allowPlantel ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-400"}`}>Plantel</span>
                  <span className={`rounded-full px-3 py-1 ${employee.allowEggs ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"}`}>Coleta</span>
                  <span className={`rounded-full px-3 py-1 ${employee.allowIncubators ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>Chocadeiras</span>
                  <span className={`rounded-full px-3 py-1 ${employee.allowHealth ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-400"}`}>Sanidade</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 p-4">
          <div className="w-full max-w-2xl rounded-[32px] border border-[color:var(--line)] bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{modalTitle}</h3>
                <p className="mt-1 text-sm text-slate-500">Defina login, senha inicial e quais módulos o funcionário pode usar.</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-2xl border border-[color:var(--line)] px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Fechar
              </button>
            </div>

            <form className="mt-6 grid gap-4" onSubmit={submitEmployee}>
              <div className="grid gap-4 md:grid-cols-2">
                <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Nome do funcionário" />
                <Input value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="email@equipe.com" type="email" />
              </div>

              <Input
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder={editingEmployeeId ? "Nova senha (deixe em branco para manter)" : "Senha inicial do funcionário"}
                type="password"
              />

              <div className="grid gap-3 md:grid-cols-2">
                <Toggle label="Liberar Plantel" checked={form.allowPlantel} onChange={(value) => setForm((prev) => ({ ...prev, allowPlantel: value }))} />
                <Toggle label="Liberar Coleta de ovos" checked={form.allowEggs} onChange={(value) => setForm((prev) => ({ ...prev, allowEggs: value }))} />
                <Toggle label="Liberar Chocadeiras" checked={form.allowIncubators} onChange={(value) => setForm((prev) => ({ ...prev, allowIncubators: value }))} />
                <Toggle label="Liberar Sanidade" checked={form.allowHealth} onChange={(value) => setForm((prev) => ({ ...prev, allowHealth: value }))} />
              </div>

              <Toggle label="Acesso ativo" checked={form.isActive} onChange={(value) => setForm((prev) => ({ ...prev, isActive: value }))} />

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : editingEmployeeId ? "Salvar alterações" : "Criar funcionário"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
