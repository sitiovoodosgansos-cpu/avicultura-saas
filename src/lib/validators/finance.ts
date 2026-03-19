import { z } from "zod";

const baseFinanceSchema = z.object({
  date: z.string().min(1, "Informe a data."),
  category: z.string().trim().min(2, "Informe a categoria."),
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
