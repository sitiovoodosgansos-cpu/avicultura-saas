import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { resetPasswordSchema } from "@/lib/validators/auth";
import { completePasswordReset, consumePasswordResetToken } from "@/lib/auth/password-reset";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const guard = rateLimit({
    key: `reset-password:${ip}`,
    limit: 20,
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

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
      { status: 400 }
    );
  }

  const userId = await consumePasswordResetToken(parsed.data.token);
  if (!userId) {
    return NextResponse.json(
      { error: "Token invalido ou expirado. Solicite uma nova recuperacao." },
      { status: 400 }
    );
  }

  const passwordHash = await hash(parsed.data.password, 12);
  await completePasswordReset(userId, passwordHash);

  return NextResponse.json({ ok: true });
}