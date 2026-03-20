import { z } from "zod";

const employeeObjectSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do funcionário."),
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
  isActive: z.boolean().optional(),
  allowPlantel: z.boolean().optional(),
  allowEggs: z.boolean().optional(),
  allowIncubators: z.boolean().optional(),
  allowHealth: z.boolean().optional()
});

type ModuleShape = {
  allowPlantel?: boolean;
  allowEggs?: boolean;
  allowIncubators?: boolean;
  allowHealth?: boolean;
};

function hasAtLeastOneModule(value: ModuleShape) {
  return Boolean(value.allowPlantel) || Boolean(value.allowEggs) || Boolean(value.allowIncubators) || Boolean(value.allowHealth);
}

export const employeeSchema = employeeObjectSchema.refine(hasAtLeastOneModule, {
  message: "Libere ao menos um módulo para o funcionário."
});

export const employeeUpdateSchema = employeeObjectSchema
  .extend({
    password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres.").optional()
  })
  .refine(hasAtLeastOneModule, {
    message: "Libere ao menos um módulo para o funcionário."
  });

export const employeeLoginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe a senha.")
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
export type EmployeeLoginInput = z.infer<typeof employeeLoginSchema>;
