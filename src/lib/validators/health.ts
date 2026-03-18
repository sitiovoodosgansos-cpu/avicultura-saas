import { z } from "zod";

export const infirmarySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da enfermaria."),
  notes: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"])
});

export const caseSchema = z.object({
  birdId: z.string().cuid("Ave inválida."),
  infirmaryId: z.string().cuid("Enfermaria inválida."),
  openedAt: z.string().min(1, "Informe a data de entrada."),
  diagnosis: z.string().trim().optional(),
  symptoms: z.string().trim().optional(),
  medication: z.string().trim().optional(),
  dosage: z.string().trim().optional(),
  responsible: z.string().trim().optional(),
  notes: z.string().trim().optional()
});

export const caseEventSchema = z.object({
  action: z.enum(["CONTINUE", "CURE", "DEATH", "TRANSFER"]),
  date: z.string().min(1, "Informe a data do evento."),
  notes: z.string().trim().optional(),
  toInfirmaryId: z.string().cuid().optional()
});

export type InfirmaryInput = z.infer<typeof infirmarySchema>;
export type InfirmaryCaseInput = z.infer<typeof caseSchema>;
export type InfirmaryCaseEventInput = z.infer<typeof caseEventSchema>;
