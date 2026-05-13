"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { useTasks } from "@/components/tasks/tasks-context";
import { getTaskPage, pathnameToPageKey } from "@/lib/tasks/pages";

export function TasksBell() {
  const pathname = usePathname() ?? "/";
  const pageKey = pathnameToPageKey(pathname);
  const { tasks, openModal } = useTasks();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tarefas ativas (nao concluidas) vinculadas a pagina atual
  const relevant = useMemo(
    () => tasks.filter((t) => t.pageKey === pageKey && !t.completedAt),
    [tasks, pageKey]
  );

  // Fecha popover ao clicar fora
  useEffect(() => {
    if (!popoverOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popoverOpen]);

  if (!pageKey) {
    // Pagina nao mapeada (improvavel — todas as paginas autenticadas estao
    // no TASK_PAGES). Esconde o sininho pra nao confundir.
    return null;
  }

  const count = relevant.length;
  const page = getTaskPage(pageKey);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setPopoverOpen((v) => !v)}
        aria-label={
          count > 0
            ? `${count} tarefa${count > 1 ? "s" : ""} ativa${count > 1 ? "s" : ""} em ${page.label}`
            : `Sem tarefas em ${page.label}`
        }
        title={count > 0 ? `${count} tarefa${count > 1 ? "s" : ""} em ${page.label}` : "Sem tarefas"}
        className="relative flex size-10 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-white text-slate-600 transition hover:bg-[color:var(--surface-soft)]"
      >
        <Bell className={`size-5 ${count > 0 ? "text-[color:var(--brand-strong)]" : ""}`} aria-hidden />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {popoverOpen ? (
        <div className="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[color:var(--line)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tarefas em {page.label}
            </p>
          </div>
          {relevant.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-slate-500">Sem tarefas ativas aqui.</p>
            </div>
          ) : (
            <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
              {relevant.slice(0, 5).map((task) => (
                <li key={task.id} className="px-3 py-2">
                  <p className="text-sm font-medium leading-tight text-slate-800">{task.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {task.daysRemaining <= 0
                      ? "Vence hoje"
                      : task.daysRemaining === 1
                        ? "Resta 1 dia"
                        : `Restam ${task.daysRemaining} dias`}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-slate-100 bg-[color:var(--surface-soft)] px-3 py-2">
            <button
              type="button"
              onClick={() => {
                setPopoverOpen(false);
                openModal();
              }}
              className="w-full rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-[color:var(--brand-strong)] transition hover:bg-slate-100"
            >
              Ver todas as tarefas
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
