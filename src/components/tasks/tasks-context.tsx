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

type TasksContextValue = {
  tasks: TaskDTO[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  createTask: (input: { title: string; pageKey: TaskPageKey; notes?: string }) => Promise<void>;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks?includeCompleted=true`, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401) {
          // Usuario nao autenticado — silencia (paginas publicas tambem
          // montam o provider via layout).
          setTasks([]);
          return;
        }
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Erro ao carregar tarefas.");
      }
      const data = (await res.json()) as { tasks: TaskDTO[] };
      setTasks(data.tasks);
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
    async (input: { title: string; pageKey: TaskPageKey; notes?: string }) => {
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
