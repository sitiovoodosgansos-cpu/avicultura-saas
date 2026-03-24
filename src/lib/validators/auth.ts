import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Informe um e-mail valido."),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres.")
});

export const registerSchema = z.object({
  name: z.string().min(2, "Informe seu nome."),
  farmName: z.string().min(2, "Informe o nome do sitio."),
  email: z.email("Informe um e-mail valido."),
  password: z
    .string()
    .min(8, "A senha deve ter ao menos 8 caracteres.")
    .regex(/[A-Z]/, "Use ao menos uma letra maiuscula.")
    .regex(/[a-z]/, "Use ao menos uma letra minuscula.")
    .regex(/[0-9]/, "Use ao menos um numero.")
});

export const forgotPasswordSchema = z.object({
  email: z.email("Informe um e-mail valido.")
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20, "Token invalido."),
    password: z
      .string()
      .min(8, "A senha deve ter ao menos 8 caracteres.")
      .regex(/[A-Z]/, "Use ao menos uma letra maiuscula.")
      .regex(/[a-z]/, "Use ao menos uma letra minuscula.")
      .regex(/[0-9]/, "Use ao menos um numero."),
    confirmPassword: z.string().min(8, "Confirme sua senha.")
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "As senhas nao conferem.",
    path: ["confirmPassword"]
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;