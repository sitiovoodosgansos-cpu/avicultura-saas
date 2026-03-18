import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { registerSchema } from "@/lib/validators/auth";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit({ key: `register:${ip}`, limit: 10, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas de cadastro. Aguarde alguns minutos." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const { email, password, name, farmName } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
  }

  const baseSlug = slugify(farmName) || "meu-sitio";
  const slugCount = await prisma.tenant.count({
    where: { slug: { startsWith: baseSlug } }
  });
  const slug = slugCount === 0 ? baseSlug : `${baseSlug}-${slugCount + 1}`;

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);

  const passwordHash = await hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: farmName,
        slug,
        trialEndsAt,
        status: "TRIAL"
      }
    });

    const user = await tx.user.create({
      data: { email, passwordHash, name, role: "OWNER" }
    });

    await tx.tenantMember.create({
      data: { tenantId: tenant.id, userId: user.id, role: "OWNER" }
    });

    await tx.farm.create({
      data: { tenantId: tenant.id, name: farmName }
    });

    await tx.subscription.create({
      data: {
        tenantId: tenant.id,
        status: "TRIALING",
        planCode: "starter",
        trialEndsAt
      }
    });
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
