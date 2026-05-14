"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { TaskDTO } from "@/lib/tasks/service";
import type { TaskPageKey } from "@/lib/tasks/pages";

export type Assignee = { id: string; name: string };

type TasksContextValue = {
  tasks: TaskDTO[];
  assignees: Assignee[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createTask: (input: {
    title: string;
    pageKey: TaskPageKey;
    notes?: string;
    assignedToEmployeeId?: string | null;
  }) => Promise<void>;
  toggleComplete: (id: string, done: boolean) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  showCompleted: boolean;
  setShowCompleted: (v: boolean) => void;
};

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Carrega tarefas + assignees em paralelo. Se o usuario nao for
      // autenticado os dois retornam 401 e a UI fica vazia (silencioso).
      const [tasksRes, assigneesRes] = await Promise.all([
        fetch(`/api/tasks?includeCompleted=true`, { cache: "no-store" }),
        fetch(`/api/tasks/assignees`, { cache: "no-store" })
      ]);

      if (!tasksRes.ok) {
        if (tasksRes.status === 401) {
          setTasks([]);
          setAssignees([]);
          return;
        }
        const body = (await tasksRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Erro ao carregar tarefas.");
      }
      const tasksData = (await tasksRes.json()) as { tasks: TaskDTO[] };
      setTasks(tasksData.tasks);

      // Assignees nao eh critico — se falhar deixa lista vazia (so esconde dropdown)
      if (assigneesRes.ok) {
        const a = (await assigneesRes.json()) as { assignees: Assignee[] };
        setAssignees(a.assignees);
      } else {
        setAssignees([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar tarefas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createTask = useCallback(
    async (input: {
      title: string;
      pageKey: TaskPageKey;
      notes?: string;
      assignedToEmployeeId?: string | null;
    }) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Erro ao criar tarefa.");
      }
      const created = (await res.json()) as TaskDTO;
      setTasks((prev) => [created, ...prev]);
    },
    []
  );

  const toggleComplete = useCallback(async (id: string, done: boolean) => {
    // Otimismo local: atualiza antes da resposta pra UX instantanea
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, completedAt: done ? new Date().toISOString() : null } : t
      )
    );
    try {
      const res = await fetch(`/api/tasks/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done })
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Erro ao atualizar tarefa.");
      }
      const updated = (await res.json()) as TaskDTO;
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      // Rollback otimismo se falhar
      await reload();
      throw err;
    }
  }, [reload]);

  const removeTask = useCallback(async (id: string) => {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "Erro ao remover tarefa.");
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const value = useMemo<TasksContextValue>(
    () => ({
      tasks,
      assignees,
      loading,
      error,
      reload,
      createTask,
      toggleComplete,
      removeTask,
      isModalOpen,
      openModal,
      closeModal,
      showCompleted,
      setShowCompleted
    }),
    [
      tasks,
      assignees,
      loading,
      error,
      reload,
      createTask,
      toggleComplete,
      removeTask,
      isModalOpen,
      openModal,
      closeModal,
      showCompleted
    ]
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) {
    throw new Error("useTasks must be used within <TasksProvider>");
  }
  return ctx;
}
