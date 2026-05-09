import { z } from "zod";

const stageEnum = z.enum(["NOVO_CONTATO", "EM_NEGOCIACAO", "EM_ESPERA", "COMPROU", "DESISTIU"]);
const channelEnum = z.enum([
  "WHATSAPP",
  "OLX",
  "INSTAGRAM",
  "TIKTOK",
  "ORNAMARKET",
  "SITE",
  "ADS_OFFLINE",
  "INDICACAO",
  "OUTRO"
]);
const interestEnum = z.enum(["AVES", "OVOS", "MAMIFEROS", "OUTROS"]);

export const leadCreateSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto."),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")).nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().max(2, "Use a UF (2 letras).").optional().nullable(),
  channel: channelEnum,
  channelOther: z.string().trim().optional().nullable(),
  interestType: interestEnum.optional().nullable(),
  interestText: z.string().trim().optional().nullable(),
  observation: z.string().trim().optional().nullable(),
  tags: z.array(z.string().trim()).optional().default([]),
  stage: stageEnum.optional(),
  subStatus: z.string().trim().optional().nullable()
});

export const leadUpdateSchema = leadCreateSchema.partial();

export const leadMoveSchema = z.object({
  stage: stageEnum,
  position: z.coerce.number(),
  subStatus: z.string().trim().optional().nullable()
});

export const leadArchiveSchema = z.object({
  reason: z.string().trim().optional().default("manual")
});

// Venda originada do CRM. type indica de onde sai o estoque.
export const leadSaleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("eggs"),
    paymentMethod: z.enum(["PIX", "CARD", "CASH"]),
    soldAt: z.string().min(1, "Data inválida."),
    shippingFee: z.coerce.number().min(0).optional(),
    notes: z.string().trim().optional().nullable(),
    items: z
      .array(
        z.object({
          trayEntryId: z.string().cuid(),
          quantity: z.coerce.number().int().min(1),
          unitPrice: z.coerce.number().min(0)
        })
      )
      .min(1, "Adicione pelo menos um item da Prateleira.")
  }),
  z.object({
    type: z.literal("vitrine"),
    paymentMethod: z.enum(["PIX", "CARD", "CASH"]),
    notes: z.string().trim().optional().nullable(),
    items: z
      .array(
        z.object({
          listingId: z.string().cuid(),
          quantity: z.coerce.number().int().min(1),
          unitPrice: z.coerce.number().min(0)
        })
      )
      .min(1, "Adicione pelo menos um item da Vitrine.")
  }),
  z.object({
    type: z.literal("raw"),
    paymentMethod: z.enum(["PIX", "CARD", "CASH"]).optional(),
    category: z.string().trim().min(1, "Categoria obrigatória."),
    item: z.string().trim().min(1, "Descrição do item."),
    amount: z.coerce.number().min(0.01, "Valor inválido."),
    notes: z.string().trim().optional().nullable()
  })
]);

export const leadDedupeSchema = z.object({
  phone: z.string().trim().min(3)
});

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
export type LeadMoveInput = z.infer<typeof leadMoveSchema>;
export type LeadArchiveInput = z.infer<typeof leadArchiveSchema>;
export type LeadSaleInput = z.infer<typeof leadSaleSchema>;
export type LeadDedupeInput = z.infer<typeof leadDedupeSchema>;
