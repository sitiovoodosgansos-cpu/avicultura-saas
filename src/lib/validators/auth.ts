import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres.")
});

export const registerSchema = z.object({
  name: z.string().min(2, "Informe seu nome."),
  farmName: z.string().min(2, "Informe o nome do sítio."),
  email: z.email("Informe um e-mail válido."),
  password: z
    .string()
    .min(8, "A senha deve ter ao menos 8 caracteres.")
    .regex(/[A-Z]/, "Use ao menos uma letra maiúscula.")
    .regex(/[a-z]/, "Use ao menos uma letra minúscula.")
    .regex(/[0-9]/, "Use ao menos um número.")
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

