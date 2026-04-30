import { z } from "zod";

export const priceTierEntrySchema = z.object({
  ageInMonths: z.coerce.number().int().min(0, "Idade inválida.").max(999),
  price: z.coerce.number().min(0, "Preço inválido.")
});

export const priceTierBatchSchema = z.object({
  flockGroupId: z.string().cuid("Card inválido."),
  tiers: z.array(priceTierEntrySchema).min(1, "Adicione pelo menos uma idade.")
});

export const listingCreateSchema = z.object({
  flockGroupId: z.string().cuid("Card inválido."),
  title: z.string().trim().optional().nullable(),
  ageInMonths: z.coerce.number().int().min(0, "Idade inválida.").max(999),
  initialQuantity: z.coerce.number().int().min(1, "Quantidade mínima 1."),
  priceOverride: z.coerce.number().min(0).optional().nullable(),
  description: z.string().trim().optional().nullable()
});

export const listingUpdateSchema = z.object({
  title: z.string().trim().optional().nullable(),
  ageInMonths: z.coerce.number().int().min(0).max(999).optional(),
  availableQuantity: z.coerce.number().int().min(0).optional(),
  priceOverride: z.coerce.number().min(0).optional().nullable(),
  description: z.string().trim().optional().nullable(),
  status: z.enum(["AVAILABLE", "SOLD_OUT", "REMOVED"]).optional()
});

export const saleSchema = z.object({
  quantity: z.coerce.number().int().min(1, "Quantidade mínima 1."),
  unitPrice: z.coerce.number().min(0, "Preço inválido."),
  paymentMethod: z.enum(["PIX", "CARD", "CASH"]),
  customer: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable()
});

export const deathSchema = z.object({
  quantity: z.coerce.number().int().min(1, "Quantidade mínima 1."),
  cause: z.string().trim().optional().nullable()
});

export type PriceTierEntryInput = z.infer<typeof priceTierEntrySchema>;
export type PriceTierBatchInput = z.infer<typeof priceTierBatchSchema>;
export type ListingCreateInput = z.infer<typeof listingCreateSchema>;
export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type DeathInput = z.infer<typeof deathSchema>;
