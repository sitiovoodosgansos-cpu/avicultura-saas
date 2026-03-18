import { z } from "zod";

export const eggCollectionSchema = z
  .object({
    date: z.string().min(1, "Informe a data da coleta."),
    flockGroupId: z.string().cuid("Grupo inválido."),
    totalEggs: z.coerce.number().int().min(0),
    goodEggs: z.coerce.number().int().min(0),
    crackedEggs: z.coerce.number().int().min(0),
    notes: z.string().trim().optional()
  })
  .superRefine((value, ctx) => {
    if (value.goodEggs + value.crackedEggs > value.totalEggs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["goodEggs"],
        message: "Bons + trincados não pode ultrapassar o total."
      });
    }
  });

export const groupCapacitySchema = z.object({
  expectedLayCapacity: z.coerce.number().min(0).max(100000)
});

export type EggCollectionInput = z.infer<typeof eggCollectionSchema>;
export type GroupCapacityInput = z.infer<typeof groupCapacitySchema>;
