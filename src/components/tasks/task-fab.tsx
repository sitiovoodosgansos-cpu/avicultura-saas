"use client";

import { NotebookPen } from "lucide-react";
import { useTasks } from "@/components/tasks/tasks-context";

export function TaskFab() {
  const { openModal } = useTasks();
  return (
    <button
      type="button"
      onClick={openModal}
      aria-label="Abrir lista de tarefas"
      title="Abrir lista de tarefas"
      className="
        fixed right-3 top-[5.5rem] z-40 flex size-12 items-center justify-center
        rounded-full bg-[linear-gradient(135deg,var(--brand),var(--brand-strong))] text-white
        shadow-[0_18px_50px_rgba(15,157,138,0.35)] transition
        hover:scale-105 active:scale-95
        md:right-8 md:bottom-8 md:top-auto md:size-14
      "
    >
      <NotebookPen className="size-5 md:size-6" aria-hidden />
    </button>
  );
}
