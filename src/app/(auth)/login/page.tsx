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
import { loginSchema, type LoginInput } from "@/lib/validators/auth";

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    setServerError(null);
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false
    });
    setLoading(false);

    if (result?.error) {
      setServerError("Credenciais inválidas.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#ecfeff,_#f8f6f2_50%)] p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Entrar</h1>
        <p className="mt-1 text-sm text-zinc-500">Acesse os dados do seu criatório.</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <Input type="email" {...register("email")} placeholder="voce@sitio.com" />
            {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Senha</label>
            <Input type="password" {...register("password")} placeholder="********" />
            {errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password.message}</p> : null}
          </div>
          {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-zinc-500">
          Ainda não tem conta?{" "}
          <Link href="/register" className="font-semibold text-[#0f766e] hover:underline">
            Criar conta
          </Link>
        </p>
      </Card>
    </main>
  );
}

