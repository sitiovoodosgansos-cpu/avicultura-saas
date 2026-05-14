import { prisma } from "@/lib/db/prisma";
import type { TaskCreateInput, TaskUpdateInput } from "@/lib/validators/tasks";
import type { TaskPageKey } from "@/lib/tasks/pages";

// Janela de visibilidade: tarefas mais velhas que isso sao "arquivadas
// implicitamente" (filtradas no GET). Sem cron, sem mutacao — apenas
// some da UI no dia 8.
const VISIBILITY_DAYS = 7;

function visibilityCutoff(): Date {
  return new Date(Date.now() - VISIBILITY_DAYS * 24 * 60 * 60 * 1000);
}

export type TaskTone = "fresh" | "warning" | "expired";

export function ageInDays(createdAt: Date, now: Date = new Date()): number {
  const diffMs = now.getTime() - createdAt.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

// Mesma logica do prateleira-manager.tsx mas em escala de 7 dias:
// dias 0-2 = fresh (verde), 3-4 = warning (amarelo), 5+ = expired (vermelho).
export function toneFor(createdAt: Date): TaskTone {
  const age = ageInDays(createdAt);
  if (age <= 2) return "fresh";
  if (age <= 4) return "warning";
  return "expired";
}

export type Actor = { kind: "owner"; id: string } | { kind: "employee"; id: string };

function authorshipForCreate(actor: Actor) {
  return actor.kind === "owner"
    ? { createdByUserId: actor.id, createdByEmployeeId: null }
    : { createdByUserId: null, createdByEmployeeId: actor.id };
}

function authorshipForComplete(actor: Actor) {
  return actor.kind === "owner"
    ? { completedByUserId: actor.id, completedByEmployeeId: null }
    : { completedByUserId: null, completedByEmployeeId: actor.id };
}

export type TaskAssignee = { id: string; name: string } | null;

export type TaskDTO = {
  id: string;
  title: string;
  notes: string | null;
  pageKey: TaskPageKey;
  completedAt: string | null;
  createdAt: string;
  ageInDays: number;
  daysRemaining: number;
  tone: TaskTone;
  assignee: TaskAssignee;
};

function toDTO(task: {
  id: string;
  title: string;
  notes: string | null;
  pageKey: string;
  completedAt: Date | null;
  createdAt: Date;
  assignedToEmployee: { id: string; name: string } | null;
}): TaskDTO {
  const age = ageInDays(task.createdAt);
  return {
    id: task.id,
    title: task.title,
    notes: task.notes,
    pageKey: task.pageKey as TaskPageKey,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    ageInDays: age,
    daysRemaining: Math.max(0, VISIBILITY_DAYS - age),
    tone: toneFor(task.createdAt),
    assignee: task.assignedToEmployee
  };
}

// Inclui o nome do employee atribuido pra hidratar a UI sem segunda query
const TASK_SELECT = {
  id: true,
  title: true,
  notes: true,
  pageKey: true,
  completedAt: true,
  createdAt: true,
  assignedToEmployee: { select: { id: true, name: true } }
} as const;

export async function listActiveTasks(
  tenantId: string,
  opts?: { pageKey?: TaskPageKey; includeCompleted?: boolean }
): Promise<TaskDTO[]> {
  const tasks = await prisma.task.findMany({
    where: {
      tenantId,
      archivedAt: null,
      createdAt: { gt: visibilityCutoff() },
      ...(opts?.pageKey ? { pageKey: opts.pageKey } : {}),
      ...(opts?.includeCompleted ? {} : { completedAt: null })
    },
    orderBy: [{ completedAt: "asc" }, { createdAt: "desc" }],
    select: TASK_SELECT
  });
  return tasks.map(toDTO);
}

export async function createTask(
  tenantId: string,
  actor: Actor,
  input: TaskCreateInput
): Promise<TaskDTO> {
  // Valida que o assignee, se informado, eh um employee do MESMO tenant
  if (input.assignedToEmployeeId) {
    const emp = await prisma.employeeAccount.findFirst({
      where: { id: input.assignedToEmployeeId, tenantId, isActive: true },
      select: { id: true }
    });
    if (!emp) {
      throw new Error("Funcionario invalido ou inativo.");
    }
  }
  const created = await prisma.task.create({
    data: {
      tenantId,
      title: input.title,
      notes: input.notes ?? null,
      pageKey: input.pageKey,
      assignedToEmployeeId: input.assignedToEmployeeId ?? null,
      ...authorshipForCreate(actor)
    },
    select: TASK_SELECT
  });
  return toDTO(created);
}

export async function updateTask(
  tenantId: string,
  id: string,
  input: TaskUpdateInput
): Promise<TaskDTO | null> {
  // Garante que o task pertence ao tenant E nao foi arquivado
  const existing = await prisma.task.findFirst({
    where: { id, tenantId, archivedAt: null },
    select: { id: true }
  });
  if (!existing) return null;

  // Valida assignee (se passado e nao-null) — mesma checagem do create
  if (input.assignedToEmployeeId) {
    const emp = await prisma.employeeAccount.findFirst({
      where: { id: input.assignedToEmployeeId, tenantId, isActive: true },
      select: { id: true }
    });
    if (!emp) {
      throw new Error("Funcionario invalido ou inativo.");
    }
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.pageKey !== undefined ? { pageKey: input.pageKey } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.assignedToEmployeeId !== undefined
        ? { assignedToEmployeeId: input.assignedToEmployeeId }
        : {})
    },
    select: TASK_SELECT
  });
  return toDTO(updated);
}

export async function setTaskCompletion(
  tenantId: string,
  id: string,
  actor: Actor,
  done: boolean
): Promise<TaskDTO | null> {
  const existing = await prisma.task.findFirst({
    where: { id, tenantId, archivedAt: null },
    select: { id: true }
  });
  if (!existing) return null;

  const updated = await prisma.task.update({
    where: { id },
    data: done
      ? { completedAt: new Date(), ...authorshipForComplete(actor) }
      : { completedAt: null, completedByUserId: null, completedByEmployeeId: null },
    select: TASK_SELECT
  });
  return toDTO(updated);
}

export async function listAssignees(tenantId: string) {
  return prisma.employeeAccount.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });
}

export async function archiveTask(tenantId: string, id: string): Promise<boolean> {
  const existing = await prisma.task.findFirst({
    where: { id, tenantId, archivedAt: null },
    select: { id: true }
  });
  if (!existing) return false;

  await prisma.task.update({
    where: { id },
    data: { archivedAt: new Date() }
  });
  return true;
}
