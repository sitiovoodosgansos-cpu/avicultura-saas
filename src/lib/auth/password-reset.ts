import { createHash, createHmac } from "crypto";
import { prisma } from "@/lib/db/prisma";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

type ResetPayload = {
  uid: string;
  exp: number;
  fp: string;
};

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getResetSecret() {
  return process.env.PASSWORD_RESET_SECRET || process.env.NEXTAUTH_SECRET || "";
}

function signPayload(payloadBase64: string) {
  return createHmac("sha256", getResetSecret()).update(payloadBase64).digest("base64url");
}

function fingerprintPasswordHash(passwordHash: string) {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 24);
}

export async function issuePasswordResetToken(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true, passwordHash: true }
  });

  if (!user || !user.isActive) {
    return null;
  }

  const secret = getResetSecret();
  if (!secret) {
    throw new Error("PASSWORD_RESET_SECRET or NEXTAUTH_SECRET is required.");
  }

  const payload: ResetPayload = {
    uid: user.id,
    exp: Date.now() + RESET_TOKEN_TTL_MS,
    fp: fingerprintPasswordHash(user.passwordHash)
  };

  const payloadBase64 = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(payloadBase64);

  return {
    rawToken: `${payloadBase64}.${signature}`,
    expiresAt: new Date(payload.exp)
  };
}

export async function consumePasswordResetToken(rawToken: string) {
  const [payloadBase64, signature] = rawToken.split(".");
  if (!payloadBase64 || !signature) {
    return null;
  }

  const secret = getResetSecret();
  if (!secret) {
    return null;
  }

  const expectedSignature = signPayload(payloadBase64);
  if (signature !== expectedSignature) {
    return null;
  }

  let payload: ResetPayload;
  try {
    payload = JSON.parse(fromBase64Url(payloadBase64)) as ResetPayload;
  } catch {
    return null;
  }

  if (!payload?.uid || !payload?.exp || !payload?.fp) {
    return null;
  }

  if (Date.now() > payload.exp) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.uid },
    select: { id: true, isActive: true, passwordHash: true }
  });

  if (!user || !user.isActive) {
    return null;
  }

  const currentFingerprint = fingerprintPasswordHash(user.passwordHash);
  if (currentFingerprint !== payload.fp) {
    return null;
  }

  return user.id;
}

export async function completePasswordReset(userId: string, passwordHash: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  });
}