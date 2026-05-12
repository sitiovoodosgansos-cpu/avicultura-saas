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

// Venda agregada (carrinho da Vitrine): N listings sob 1 cliente/pagamento
export const bulkSaleSchema = z.object({
  paymentMethod: z.enum(["PIX", "CARD", "CASH"]),
  customer: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  items: z
    .array(
      z.object({
        listingId: z.string().cuid("Listing inválido."),
        quantity: z.coerce.number().int().min(1, "Quantidade mínima 1."),
        unitPrice: z.coerce.number().min(0, "Preço inválido.")
      })
    )
    .min(1, "Adicione pelo menos um item ao carrinho.")
});

export const deathSchema = z.object({
  quantity: z.coerce.number().int().min(1, "Quantidade mínima 1."),
  cause: z.string().trim().optional().nullable()
});

// Insercao de aves "avulsas" — aves que ja existiam antes do usuario comecar
// a usar o sistema (nao tem registro de eclosao). Cria N Birds + N
// VitrineListings de uma vez, agrupados num FlockGroup existente.
export const avulsasInsertSchema = z
  .object({
    flockGroupId: z.string().cuid("Card inválido."),
    ageInMonths: z.coerce.number().int().min(0, "Idade inválida.").max(999),
    females: z.coerce.number().int().min(0).max(500).default(0),
    males: z.coerce.number().int().min(0).max(500).default(0),
    unknownSex: z.coerce.number().int().min(0).max(500).default(0)
  })
  .refine(
    (d) => d.females + d.males + d.unknownSex >= 1,
    "Adicione pelo menos 1 ave (fêmea, macho ou indefinido)."
  )
  .refine(
    (d) => d.females + d.males + d.unknownSex <= 500,
    "Limite de 500 aves por leva. Divida em duas operações pra mais."
  );
export type AvulsasInsertInput = z.infer<typeof avulsasInsertSchema>;

export const purchasedListingSchema = z.object({
  speciesId: z.string().cuid("Espécie inválida."),
  breedId: z.string().cuid("Raça inválida."),
  varietyId: z.string().cuid("Variedade inválida.").optional().nullable(),
  title: z.string().trim().optional().nullable(),
  ageInMonths: z.coerce.number().int().min(0, "Idade inválida.").max(999),
  initialQuantity: z.coerce.number().int().min(1, "Quantidade mínima 1."),
  purchaseDate: z.string().min(1, "Informe a data de compra."),
  purchaseCost: z.coerce.number().min(0, "Custo inválido."),
  vendorName: z.string().trim().optional().nullable(),
  priceOverride: z.coerce.number().min(0).optional().nullable(),
  description: z.string().trim().optional().nullable()
});

export type PriceTierEntryInput = z.infer<typeof priceTierEntrySchema>;
export type PriceTierBatchInput = z.infer<typeof priceTierBatchSchema>;
export type BulkSaleInput = z.infer<typeof bulkSaleSchema>;
export type ListingCreateInput = z.infer<typeof listingCreateSchema>;
export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type DeathInput = z.infer<typeof deathSchema>;
export type PurchasedListingInput = z.infer<typeof purchasedListingSchema>;
