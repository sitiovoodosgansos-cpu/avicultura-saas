import { z } from "zod";

export const diseaseSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da doença."),
  description: z.string().trim().optional().nullable(),
  symptoms: z.string().trim().optional().nullable(),
  defaultTreatment: z.string().trim().optional().nullable()
});

export const medicationSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do medicamento."),
  defaultDosage: z.string().trim().optional().nullable(),
  route: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable()
});

export const periodUnitSchema = z.enum(["days", "weeks", "months"]);
export type PeriodUnit = z.infer<typeof periodUnitSchema>;

export const vaccineSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da vacina."),
  recommendedAgeMonths: z.coerce.number().int().min(0).max(999).optional().nullable(),
  recommendedAgeUnit: periodUnitSchema.optional().nullable(),
  intervalMonths: z.coerce.number().int().min(0).max(999).optional().nullable(),
  intervalUnit: periodUnitSchema.optional().nullable(),
  notes: z.string().trim().optional().nullable()
});

export const deathReasonSchema = z.object({
  name: z.string().trim().min(2, "Informe o motivo."),
  notes: z.string().trim().optional().nullable()
});

export const birdVaccinationSchema = z.object({
  birdId: z.string().cuid("Ave inválida."),
  vaccineId: z.string().cuid("Vacina inválida."),
  appliedAt: z.string().min(1, "Informe a data."),
  notes: z.string().trim().optional().nullable()
});

export const flockVaccinationSchema = z.object({
  flockGroupId: z.string().cuid("Lote inválido."),
  vaccineId: z.string().cuid("Vacina inválida."),
  appliedAt: z.string().min(1, "Informe a data."),
  notes: z.string().trim().optional().nullable()
});

export const multiFlockVaccinationSchema = z.object({
  flockGroupIds: z
    .array(z.string().cuid("Lote inválido."))
    .min(1, "Selecione ao menos um lote."),
  vaccineId: z.string().cuid("Vacina inválida."),
  appliedAt: z.string().min(1, "Informe a data."),
  notes: z.string().trim().optional().nullable()
});

export type DiseaseInput = z.infer<typeof diseaseSchema>;
export type MedicationInput = z.infer<typeof medicationSchema>;
export type VaccineInput = z.infer<typeof vaccineSchema>;
export type DeathReasonInput = z.infer<typeof deathReasonSchema>;
export type BirdVaccinationInput = z.infer<typeof birdVaccinationSchema>;
export type FlockVaccinationInput = z.infer<typeof flockVaccinationSchema>;
export type MultiFlockVaccinationInput = z.infer<typeof multiFlockVaccinationSchema>;
