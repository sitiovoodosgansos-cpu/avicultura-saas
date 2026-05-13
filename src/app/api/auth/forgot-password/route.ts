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

  // Busca em ambas as tabelas: User (proprietario do criatorio) e
  // EmployeeAccount (funcionario com login proprio). Antes so olhava
  // User — funcionarios nao conseguiam recuperar senha por design.
  const [user, employee] = await Promise.all([
    prisma.user.findFirst({
      where: {
        email: { equals: parsed.data.email, mode: "insensitive" },
        isActive: true
      },
      select: { id: true, name: true, email: true }
    }),
    prisma.employeeAccount.findFirst({
      where: {
        email: { equals: parsed.data.email, mode: "insensitive" },
        isActive: true
      },
      select: { id: true, name: true, email: true }
    })
  ]);

  const account = user
    ? { id: user.id, name: user.name, email: user.email, kind: "user" as const }
    : employee
      ? { id: employee.id, name: employee.name, email: employee.email, kind: "employee" as const }
      : null;

  if (!account) {
    console.warn("forgot-password: account not found", { emailAttempted: parsed.data.email });
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
    console.error("forgot-password: could not resolve reset base URL", {
      accountId: account.id,
      kind: account.kind
    });
    return NextResponse.json(
      { error: "Erro de configuracao no servidor. Contate o suporte." },
      { status: 500 }
    );
  }

  const issued = await issuePasswordResetToken(account.id, account.kind);
  if (!issued) {
    console.error("forgot-password: failed to issue reset token", {
      accountId: account.id,
      kind: account.kind
    });
    return NextResponse.json(
      { error: "Nao foi possivel gerar o link agora. Tente novamente." },
      { status: 500 }
    );
  }

  const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(issued.rawToken)}`;

  const emailOk = await sendPasswordResetEmail({
    to: account.email,
    name: account.name,
    resetLink
  });

  if (!emailOk) {
    console.error("forgot-password: sendPasswordResetEmail returned false", {
      accountId: account.id,
      kind: account.kind
    });
    return NextResponse.json(
      { error: "Falha ao enviar o e-mail. Tente novamente em alguns minutos." },
      { status: 502 }
    );
  }

  console.log("forgot-password: email sent", { accountId: account.id, kind: account.kind });
  return NextResponse.json({ ok: true, message: successMessage });
}
