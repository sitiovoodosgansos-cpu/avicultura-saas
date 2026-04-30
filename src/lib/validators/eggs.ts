import { z } from "zod";

export const eggCollectionSchema = z
  .object({
    date: z.string().min(1, "Informe a data da coleta."),
    flockGroupId: z.string().cuid("Grupo inválido."),
    totalEggs: z.coerce.number().int().min(0),
    crackedEggs: z.coerce.number().int().min(0),
    notes: z.string().trim().optional()
  })
  .superRefine((value, ctx) => {
    if (value.crackedEggs > value.totalEggs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["crackedEggs"],
        message: "Ovos trincados não pode ultrapassar o total coletado."
      });
    }
  });

export const groupCapacitySchema = z.object({
  expectedLayCapacity: z.coerce.number().min(0).max(365)
});

export type EggCollectionInput = z.infer<typeof eggCollectionSchema>;
export type GroupCapacityInput = z.infer<typeof groupCapacitySchema>;

export const externalTraySchema = z
  .object({
    flockGroupId: z.string().cuid().optional().nullable(),
    speciesLabel: z.string().trim().min(1, "Informe a espécie."),
    breedLabel: z.string().trim().min(1, "Informe a raça."),
    varietyLabel: z.string().trim().optional().nullable(),
    entryDate: z.string().min(1, "Informe a data."),
    initialCount: z.coerce.number().int().min(1, "Quantidade deve ser maior que zero."),
    expiryDays: z.coerce.number().int().min(1).max(60).default(10),
    notes: z.string().trim().optional()
  });

export const trayDiscardSchema = z.object({
  trayEntryId: z.string().cuid("Entrada inválida."),
  quantity: z.coerce.number().int().min(1, "Quantidade deve ser maior que zero."),
  notes: z.string().trim().optional()
});

export const trayDiscardBulkSchema = z.object({
  items: z
    .array(
      z.object({
        trayEntryId: z.string().cuid("Entrada inválida."),
        quantity: z.coerce.number().int().min(1, "Quantidade deve ser maior que zero.")
      })
    )
    .min(1, "Adicione ao menos um item."),
  notes: z.string().trim().optional()
});

export const trayTransferSchema = z.object({
  trayId: z.string().cuid("Bandeja inválida."),
  incubatorId: z.string().cuid("Chocadeira inválida."),
  quantity: z.coerce.number().int().min(1, "Quantidade deve ser maior que zero."),
  notes: z.string().trim().optional()
});

export const trayTransferBulkSchema = z.object({
  incubatorId: z.string().cuid("Chocadeira inválida."),
  items: z
    .array(
      z.object({
        trayId: z.string().cuid("Bandeja inválida."),
        quantity: z.coerce.number().int().min(1, "Quantidade deve ser maior que zero.")
      })
    )
    .min(1, "Adicione ao menos um item."),
  notes: z.string().trim().optional()
});

export const eggSaleSchema = z
  .object({
    customer: z.string().trim().optional(),
    soldAt: z.string().min(1, "Informe a data."),
    items: z
      .array(
        z.object({
          trayId: z.string().cuid("Bandeja inválida."),
          quantity: z.coerce.number().int().min(1, "Quantidade deve ser maior que zero."),
          unitPrice: z.coerce.number().min(0, "Preço inválido.")
        })
      )
      .min(1, "Adicione ao menos um item."),
    notes: z.string().trim().optional()
  });

export type ExternalTrayInput = z.infer<typeof externalTraySchema>;
export type TrayDiscardInput = z.infer<typeof trayDiscardSchema>;
export type TrayDiscardBulkInput = z.infer<typeof trayDiscardBulkSchema>;
export type TrayTransferInput = z.infer<typeof trayTransferSchema>;
export type TrayTransferBulkInput = z.infer<typeof trayTransferBulkSchema>;
export type EggSaleInput = z.infer<typeof eggSaleSchema>;
