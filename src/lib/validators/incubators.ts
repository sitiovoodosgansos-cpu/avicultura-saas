import { z } from "zod";

export const incubatorSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da chocadeira."),
  description: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"])
});

export const batchSchema = z.object({
  incubatorId: z.string().cuid("Chocadeira inválida."),
  flockGroupId: z.string().cuid("Grupo inválido."),
  entryDate: z.string().min(1, "Informe a data de entrada."),
  eggsSet: z.coerce.number().int().min(1),
  expectedHatchDate: z.string().optional(),
  notes: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "HATCHED", "FAILED", "CANCELED"])
});

export const batchEventSchema = z.object({
  type: z.enum(["HATCHED", "INFERTILE", "EMBRYO_LOSS", "PIPPED_DIED", "IN_PROGRESS", "OTHER"]),
  quantity: z.coerce.number().int().min(0),
  eventDate: z.string().min(1, "Informe a data do evento."),
  notes: z.string().trim().optional()
});

export type IncubatorInput = z.infer<typeof incubatorSchema>;
export type BatchInput = z.infer<typeof batchSchema>;
export type BatchEventInput = z.infer<typeof batchEventSchema>;
