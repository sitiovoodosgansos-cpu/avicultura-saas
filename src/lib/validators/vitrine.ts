import { z } from "zod";

export const priceTierSchema = z.object({
  speciesId: z.string().cuid("Espécie inválida."),
  breedId: z.string().cuid().optional().nullable(),
  varietyId: z.string().cuid().optional().nullable(),
  ageInMonths: z.coerce.number().int().min(0, "Idade inválida.").max(999),
  price: z.coerce.number().min(0, "Preço inválido.")
});

export const listingCreateSchema = z.object({
  title: z.string().trim().optional().nullable(),
  species: z.string().trim().min(2, "Informe a espécie."),
  breed: z.string().trim().optional().nullable(),
  variety: z.string().trim().optional().nullable(),
  birthDate: z.string().min(1, "Informe a data de nascimento."),
  initialQuantity: z.coerce.number().int().min(1, "Quantidade mínima 1."),
  description: z.string().trim().optional().nullable()
});

export const listingUpdateSchema = z.object({
  title: z.string().trim().optional().nullable(),
  birthDate: z.string().min(1).optional(),
  availableQuantity: z.coerce.number().int().min(0).optional(),
  description: z.string().trim().optional().nullable(),
  status: z.enum(["AVAILABLE", "SOLD_OUT", "REMOVED"]).optional()
});

export type PriceTierInput = z.infer<typeof priceTierSchema>;
export type ListingCreateInput = z.infer<typeof listingCreateSchema>;
export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>;
