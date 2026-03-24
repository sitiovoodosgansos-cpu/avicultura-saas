"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validators/auth";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema)
  });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    setServerError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });

      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setServerError(data.error ?? "Nao foi possivel enviar o e-mail agora.");
        return;
      }

      setMessage(
        data.message ??
          "Se este e-mail existir, voce recebera um link para redefinir sua senha em alguns minutos."
      );
    } catch {
      setServerError("Falha de conexao. Tente novamente.");
    } finally {
      setLoading(false);
    }
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#ecfeff,_#f8f6f2_50%)] p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Esqueci minha senha</h1>
        <p className="mt-1 text-sm text-zinc-500">Informe seu e-mail para receber o link de recuperacao.</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <Input type="email" placeholder="voce@sitio.com" {...register("email")} />
            {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email.message}</p> : null}
          </div>

          {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link de recuperacao"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-zinc-500">
          Lembrou a senha?{" "}
          <Link href="/login" className="font-semibold text-[#0f766e] hover:underline">
            Voltar para login
          </Link>
        </p>
      </Card>
    </main>
  );
}