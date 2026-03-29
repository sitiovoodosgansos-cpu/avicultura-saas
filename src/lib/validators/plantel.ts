import { z } from "zod";

export const flockGroupSchema = z.object({
  species: z.string().trim().min(2, "Informe a espécie."),
  breed: z.string().trim().min(2, "Informe a raça."),
  variety: z.string().trim().optional(),
  title: z.string().trim().min(3, "Informe o título do grupo."),
  bayNumber: z.coerce.number().int().min(1, "Informe o número da baia.").optional(),
  matrixCount: z.coerce.number().int().min(0),
  reproducerCount: z.coerce.number().int().min(0),
  // Meta anual por ave matriz (ovos/ano), limite máximo de 1 ovo por dia.
  expectedLayCapacity: z.coerce.number().min(0).max(365).optional(),
  purchaseInvestmentTotal: z.coerce.number().min(0).optional(),
  notes: z.string().trim().optional()
});

export const birdSchema = z.object({
  flockGroupId: z.string().cuid("Grupo inválido."),
  bayNumber: z.coerce.number().int().min(1, "Informe o número da baia.").optional(),
  ringNumber: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || value.length >= 2, "Informe uma anilha válida."),
  nickname: z.string().trim().optional(),
  sex: z.enum(["FEMALE", "MALE", "UNKNOWN"]),
  acquisitionDate: z.string().optional(),
  purchaseValue: z.coerce.number().min(0).optional(),
  origin: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "SICK", "DEAD", "BROODY"])
});

export const birdStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SICK", "DEAD", "BROODY"]),
  reason: z.string().trim().optional()
});

export type FlockGroupInput = z.infer<typeof flockGroupSchema>;
export type BirdInput = z.infer<typeof birdSchema>;
export type BirdStatusInput = z.infer<typeof birdStatusSchema>;
