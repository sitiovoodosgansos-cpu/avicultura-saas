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

export type PriceTierEntryInput = z.infer<typeof priceTierEntrySchema>;
export type PriceTierBatchInput = z.infer<typeof priceTierBatchSchema>;
export type ListingCreateInput = z.infer<typeof listingCreateSchema>;
export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>;
