import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { forgotPasswordSchema } from "@/lib/validators/auth";
import { issuePasswordResetToken } from "@/lib/auth/password-reset";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";

function resolveResetBaseUrl(request: Request) {
  const configured =
    process.env.PASSWORD_RESET_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const host = request.headers.get("host");
  if (!host) {
    return null;
  }

  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const guard = rateLimit({
    key: `forgot-password:${ip}`,
    limit: 8,
    windowMs: 15 * 60 * 1000
  });

  if (!guard.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
      { status: 400 }
    );
  }

  const successMessage =
    "Link enviado! Verifique a caixa de entrada E a pasta de spam/lixo eletronico — pode levar ate 2 minutos.";

  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: parsed.data.email,
        mode: "insensitive"
      },
      isActive: true
    },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  if (!user) {
    // DECISAO DE PRODUTO: antes retornavamos 200 OK silenciosamente
    // (anti-enumeration). Pra um SaaS pequeno como o Ornabird o ganho
    // de seguranca eh marginal e o custo de UX eh alto — pessoas
    // digitavam email errado, recebiam mensagem 'se existir voce
    // recebera' e ficavam esperando email que nunca chegava.
    // Agora retornamos 404 explicito com sugestao pra criar conta.
    console.warn("forgot-password: user not found", { emailAttempted: parsed.data.email });
    return NextResponse.json(
      {
        error:
          "Nao encontramos uma conta com este e-mail. Verifique se digitou o e-mail correto (atencao a domínio: gmail.com x hotmail.com, etc) ou crie uma conta.",
        code: "USER_NOT_FOUND"
      },
      { status: 404 }
    );
  }

  const baseUrl = resolveResetBaseUrl(request);
  if (!baseUrl) {
    console.error("forgot-password: could not resolve reset base URL", { userId: user.id });
    return NextResponse.json(
      { error: "Erro de configuracao no servidor. Contate o suporte." },
      { status: 500 }
    );
  }

  const issued = await issuePasswordResetToken(user.id);
  if (!issued) {
    console.error("forgot-password: failed to issue reset token", { userId: user.id });
    return NextResponse.json(
      { error: "Nao foi possivel gerar o link agora. Tente novamente." },
      { status: 500 }
    );
  }

  const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(issued.rawToken)}`;

  const emailOk = await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetLink
  });

  if (!emailOk) {
    console.error("forgot-password: sendPasswordResetEmail returned false", { userId: user.id });
    return NextResponse.json(
      { error: "Falha ao enviar o e-mail. Tente novamente em alguns minutos." },
      { status: 502 }
    );
  }

  console.log("forgot-password: email sent", { userId: user.id });
  return NextResponse.json({ ok: true, message: successMessage });
}
