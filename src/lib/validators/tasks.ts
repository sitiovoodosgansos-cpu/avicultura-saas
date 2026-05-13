import { z } from "zod";
import { TASK_PAGES } from "@/lib/tasks/pages";

const PAGE_KEYS = TASK_PAGES.map((p) => p.key) as [string, ...string[]];

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "Informe o titulo.").max(200, "Maximo 200 caracteres."),
  pageKey: z.enum(PAGE_KEYS, { message: "Selecione a pagina relacionada." }),
  notes: z.string().trim().max(1000, "Maximo 1000 caracteres.").optional()
});

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  pageKey: z.enum(PAGE_KEYS).optional(),
  notes: z.string().trim().max(1000).nullable().optional()
});

export const taskCompleteSchema = z.object({
  done: z.boolean()
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type TaskCompleteInput = z.infer<typeof taskCompleteSchema>;
