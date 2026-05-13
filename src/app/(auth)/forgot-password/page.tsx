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
          "Se este e-mail estiver cadastrado, voce recebera um link em ate 2 minutos. Verifique tambem a pasta de spam."
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
            <Input type="email" autoComplete="email" placeholder="voce@sitio.com" {...register("email")} />
            {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email.message}</p> : null}
          </div>

          {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}

          {message ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <p className="font-medium">E-mail enviado!</p>
              <p className="mt-1 text-emerald-800">{message}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-emerald-700">
                <li>Procure por <strong>&quot;Ornabird&quot;</strong> ou <strong>send.ornabird.app</strong></li>
                <li>Verifique a pasta de <strong>spam / lixo eletronico</strong></li>
                <li>O link expira em 1 hora</li>
                <li>Nao chegou? Confirme se o e-mail digitado e o mesmo do cadastro</li>
              </ul>
            </div>
          ) : null}

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

        <p className="mt-3 text-xs text-zinc-400">
          Continua sem conseguir? Entre em contato em{" "}
          <a href="mailto:sitiovoodosgansos@gmail.com" className="underline hover:text-zinc-600">
            sitiovoodosgansos@gmail.com
          </a>
        </p>
      </Card>
    </main>
  );
}