import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db/prisma";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function hashResetToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function issuePasswordResetToken(userId: string) {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: {
        userId,
        usedAt: null
      }
    }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt
      }
    })
  ]);

  return {
    rawToken,
    expiresAt
  };
}

export async function consumePasswordResetToken(rawToken: string) {
  const tokenHash = hashResetToken(rawToken);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const token = await tx.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now }
      },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            isActive: true
          }
        }
      }
    });

    if (!token || !token.user.isActive) {
      return null;
    }

    const markUsed = await tx.passwordResetToken.updateMany({
      where: {
        id: token.id,
        usedAt: null
      },
      data: {
        usedAt: now
      }
    });

    if (markUsed.count === 0) {
      return null;
    }

    return token.userId;
  });
}

export async function completePasswordReset(userId: string, passwordHash: string) {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId }
    })
  ]);
}