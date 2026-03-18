"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerSchema, type RegisterInput } from "@/lib/validators/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    setServerError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        signal: controller.signal
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setServerError(data.error ?? "Falha ao criar conta.");
        return;
      }

      await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false
      });

      router.push("/dashboard");
      router.refresh();
    } catch {
      setServerError("NÃ£o foi possÃ­vel criar a conta agora. Verifique a conexÃ£o com o banco e tente novamente.");
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#fefce8,_#f8f6f2_45%)] p-4">
      <Card className="w-full max-w-lg p-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Criar conta</h1>
        <p className="mt-1 text-sm text-zinc-500">Período de teste grátis de 7 dias.</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium">Seu nome</label>
            <Input placeholder="Nome completo" {...register("name")} />
            {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Nome do sítio</label>
            <Input placeholder="Sítio Exemplo" {...register("farmName")} />
            {errors.farmName ? <p className="mt-1 text-xs text-red-600">{errors.farmName.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <Input type="email" placeholder="voce@sitio.com" {...register("email")} />
            {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Senha</label>
            <Input type="password" placeholder="Senha forte" {...register("password")} />
            {errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password.message}</p> : null}
          </div>

          {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-zinc-500">
          Já possui conta?{" "}
          <Link href="/login" className="font-semibold text-[#0f766e] hover:underline">
            Fazer login
          </Link>
        </p>
      </Card>
    </main>
  );
}
