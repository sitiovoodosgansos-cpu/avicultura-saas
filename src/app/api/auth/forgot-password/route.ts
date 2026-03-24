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

  const genericMessage =
    "Se este e-mail existir, voce recebera um link para redefinir sua senha em alguns minutos.";

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
    return NextResponse.json({ ok: true, message: genericMessage });
  }

  const baseUrl = resolveResetBaseUrl(request);
  if (!baseUrl) {
    console.error("Could not resolve reset password base URL.");
    return NextResponse.json({ ok: true, message: genericMessage });
  }

  const issued = await issuePasswordResetToken(user.id);
  const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(issued.rawToken)}`;

  await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetLink
  });

  return NextResponse.json({ ok: true, message: genericMessage });
}