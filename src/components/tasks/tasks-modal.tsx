"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HardHat, Trash2 } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTasks } from "@/components/tasks/tasks-context";
import { TASK_PAGES, type TaskPageKey, getTaskPage } from "@/lib/tasks/pages";
import type { TaskDTO } from "@/lib/tasks/service";

// Mesma paleta do prateleira-manager.tsx, ajustada pra escala de 7 dias.
function tonePalette(tone: TaskDTO["tone"]) {
  if (tone === "expired") {
    return {
      bar: "bg-rose-500",
      chipBg: "bg-rose-100",
      chipText: "text-rose-700",
      border: "border-rose-200"
    };
  }
  if (tone === "warning") {
    return {
      bar: "bg-amber-500",
      chipBg: "bg-amber-100",
      chipText: "text-amber-700",
      border: "border-amber-200"
    };
  }
  return {
    bar: "bg-emerald-500",
    chipBg: "bg-emerald-100",
    chipText: "text-emerald-700",
    border: "border-emerald-200"
  };
}

function countdownLabel(daysRemaining: number) {
  if (daysRemaining <= 0) return "Vence hoje";
  if (daysRemaining === 1) return "Resta 1 dia";
  return `Restam ${daysRemaining} dias`;
}

export function TasksModal() {
  const {
    tasks,
    assignees,
    loading,
    error,
    createTask,
    toggleComplete,
    removeTask,
    isModalOpen,
    closeModal,
    showCompleted,
    setShowCompleted
  } = useTasks();

  const [newTitle, setNewTitle] = useState("");
  const [newPageKey, setNewPageKey] = useState<TaskPageKey>("plantel");
  const [newAssigneeId, setNewAssigneeId] = useState<string>(""); // "" = sem responsavel
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { active, completed } = useMemo(() => {
    const act: TaskDTO[] = [];
    const done: TaskDTO[] = [];
    for (const t of tasks) {
      if (t.completedAt) done.push(t);
      else act.push(t);
    }
    return { active: act, completed: done };
  }, [tasks]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSubmitting(true);
    setLocalError(null);
    try {
      await createTask({
        title: newTitle.trim(),
        pageKey: newPageKey,
        assignedToEmployeeId: newAssigneeId || null
      });
      setNewTitle("");
      // Mantem pageKey e assignee selecionados pra criar varias tarefas seguidas
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Erro ao criar tarefa.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppModal
      open={isModalOpen}
      title="Minhas Tarefas"
      onClose={closeModal}
      error={localError ?? error}
    >
      {/* Form de criacao */}
      <form
        onSubmit={handleCreate}
        className="mb-4 grid gap-2 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-soft)] p-3"
      >
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Ex: Construir nova baia"
          maxLength={200}
          required
        />
        <select
          value={newPageKey}
          onChange={(e) => setNewPageKey(e.target.value as TaskPageKey)}
          className="rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm text-slate-700"
        >
          {TASK_PAGES.map((p) => (
            <option key={p.key} value={p.key}>
              {p.emoji} {p.label}
            </option>
          ))}
        </select>
        {/* Dropdown de funcionario — so aparece se ha employees cadastrados */}
        {assignees.length > 0 ? (
          <div className="flex items-center gap-2">
            <HardHat className="size-4 shrink-0 text-slate-500" aria-hidden />
            <select
              value={newAssigneeId}
              onChange={(e) => setNewAssigneeId(e.target.value)}
              className="flex-1 rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm text-slate-700"
              aria-label="Atribuir a funcionario"
            >
              <option value="">Sem responsavel</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <Button type="submit" disabled={submitting || !newTitle.trim()}>
          {submitting ? "Adicionando..." : "Adicionar tarefa"}
        </Button>
      </form>

      {/* Toggle "mostrar concluidas" */}
      {completed.length > 0 ? (
        <label className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="size-4 rounded border-slate-300"
          />
          Mostrar concluidas ({completed.length})
        </label>
      ) : null}

      {/* Lista de ativas */}
      {loading && tasks.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Carregando...</p>
      ) : active.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center">
          <p className="text-2xl">📝</p>
          <p className="mt-2 text-sm font-medium text-slate-700">Nenhuma tarefa ativa</p>
          <p className="mt-1 text-xs text-slate-500">Crie a primeira tarefa usando o campo acima.</p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {active.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={(done) => toggleComplete(task.id, done)}
              onRemove={() => removeTask(task.id)}
              onLinkClick={closeModal}
            />
          ))}
        </ul>
      )}

      {/* Lista de concluidas */}
      {showCompleted && completed.length > 0 ? (
        <>
          <h4 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Concluidas
          </h4>
          <ul className="grid gap-2 opacity-70">
            {completed.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={(done) => toggleComplete(task.id, done)}
                onRemove={() => removeTask(task.id)}
                onLinkClick={closeModal}
              />
            ))}
          </ul>
        </>
      ) : null}
    </AppModal>
  );
}

function TaskCard({
  task,
  onToggle,
  onRemove,
  onLinkClick
}: {
  task: TaskDTO;
  onToggle: (done: boolean) => void;
  onRemove: () => void;
  onLinkClick: () => void;
}) {
  const palette = tonePalette(task.tone);
  const isDone = task.completedAt !== null;
  const page = getTaskPage(task.pageKey);

  return (
    <li
      className={`overflow-hidden rounded-2xl border bg-white ${palette.border}`}
    >
      {/* Faixa colorida horizontal de urgencia */}
      <div className={`h-1.5 ${palette.bar}`} />

      <div className="flex items-start gap-3 p-3">
        {/* Checkbox quadrado */}
        <button
          type="button"
          onClick={() => onToggle(!isDone)}
          aria-label={isDone ? "Desmarcar como feita" : "Marcar como feita"}
          className={`
            mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition
            ${
              isDone
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-300 bg-white hover:border-emerald-500"
            }
          `}
        >
          {isDone ? (
            <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden>
              <path d="M16.7 5.3a1 1 0 010 1.4l-7.4 7.4a1 1 0 01-1.4 0L3.3 9.5a1 1 0 011.4-1.4l3.9 3.9 6.7-6.7a1 1 0 011.4 0z" />
            </svg>
          ) : null}
        </button>

        {/* Conteudo */}
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold leading-tight ${
              isDone ? "text-slate-500 line-through" : "text-slate-900"
            }`}
          >
            {task.title}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Link
              href={page.href}
              onClick={onLinkClick}
              className="inline-flex items-center gap-1 rounded-full bg-[color:var(--surface-soft)] px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
            >
              <span aria-hidden>{page.emoji}</span>
              {page.label}
            </Link>
            {task.assignee ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800"
                title={`Responsavel: ${task.assignee.name}`}
              >
                <HardHat className="size-3" aria-hidden />
                {task.assignee.name}
              </span>
            ) : null}
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${palette.chipBg} ${palette.chipText}`}
            >
              {countdownLabel(task.daysRemaining)}
            </span>
          </div>
        </div>

        {/* Lixeira */}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remover tarefa"
          title="Remover"
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
    </li>
  );
}
