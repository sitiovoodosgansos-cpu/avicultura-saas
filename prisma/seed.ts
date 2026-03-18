import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@gestaoaves.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  const passwordHash = await hash("Demo@123456", 12);
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);

  const tenant = await prisma.tenant.create({
    data: {
      name: "Sitio Modelo",
      slug: "sitio-modelo",
      trialEndsAt,
      farms: { create: { name: "Sitio Modelo" } },
      subscriptions: {
        create: {
          status: "TRIALING",
          planCode: "starter",
          trialEndsAt
        }
      }
    }
  });

  const user = await prisma.user.create({
    data: {
      email,
      name: "Usuário Demo",
      passwordHash,
      role: "OWNER"
    }
  });

  await prisma.tenantMember.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      role: "OWNER"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

