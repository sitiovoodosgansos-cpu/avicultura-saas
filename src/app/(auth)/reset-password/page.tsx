"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z
  .object({
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

type FormInput = z.infer<typeof formSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormInput>({
    resolver: zodResolver(formSchema)
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!token) {
      setServerError("Token invalido. Solicite um novo link de recuperacao.");
      return;
    }

    setLoading(true);
    setServerError(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: values.password,
          confirmPassword: values.confirmPassword
        })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setServerError(data.error ?? "Nao foi possivel redefinir a senha.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login?reset=1");
      }, 1200);
    } catch {
      setServerError("Falha de conexao. Tente novamente.");
    } finally {
      setLoading(false);
    }
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#ecfeff,_#f8f6f2_50%)] p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Redefinir senha</h1>
        <p className="mt-1 text-sm text-zinc-500">Digite a nova senha da sua conta.</p>

        {!token ? (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            Link invalido ou incompleto. Solicite uma nova recuperacao de senha.
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium">Nova senha</label>
              <Input type="password" placeholder="Nova senha" {...register("password")} />
              {errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password.message}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Confirmar senha</label>
              <Input type="password" placeholder="Repita a senha" {...register("confirmPassword")} />
              {errors.confirmPassword ? (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
              ) : null}
            </div>

            {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}
            {success ? <p className="text-sm text-emerald-700">Senha alterada com sucesso. Redirecionando...</p> : null}

            <Button className="w-full" type="submit" disabled={loading || success}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        )}

        <p className="mt-4 text-sm text-zinc-500">
          <Link href="/login" className="font-semibold text-[#0f766e] hover:underline">
            Voltar para login
          </Link>
        </p>
      </Card>
    </main>
  );
}