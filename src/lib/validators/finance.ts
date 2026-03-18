import { z } from "zod";

const categoryEnum = z.enum([
  "EGG_SALE",
  "CHICK_SALE",
  "ADULT_BIRD_SALE",
  "FEED",
  "MEDICATION",
  "STRUCTURE",
  "MAINTENANCE",
  "OTHER"
]);

const baseFinanceSchema = z.object({
  date: z.string().min(1, "Informe a data."),
  category: categoryEnum,
  item: z.string().trim().min(2, "Informe o item."),
  amount: z.coerce.number().min(0.01, "Informe um valor maior que zero."),
  description: z.string().trim().optional(),
  notes: z.string().trim().optional()
});

export const financialEntrySchema = baseFinanceSchema.extend({
  customer: z.string().trim().optional()
});

export const financialExpenseSchema = baseFinanceSchema.extend({
  supplier: z.string().trim().optional()
});

export type FinancialEntryInput = z.infer<typeof financialEntrySchema>;
export type FinancialExpenseInput = z.infer<typeof financialExpenseSchema>;
