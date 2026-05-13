import { createHash, createHmac } from "crypto";
import { prisma } from "@/lib/db/prisma";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

// kind: distingue conta de proprietario (User) de conta de funcionario
// (EmployeeAccount), pra que o consume saiba em qual tabela atualizar
// a senha. Tokens antigos sem `k` sao tratados como user (back-compat).
export type AccountKind = "user" | "employee";

type ResetPayload = {
  uid: string;
  exp: number;
  fp: string;
  k?: AccountKind;
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

export async function issuePasswordResetToken(
  accountId: string,
  kind: AccountKind = "user"
) {
  const account =
    kind === "employee"
      ? await prisma.employeeAccount.findUnique({
          where: { id: accountId },
          select: { id: true, isActive: true, passwordHash: true }
        })
      : await prisma.user.findUnique({
          where: { id: accountId },
          select: { id: true, isActive: true, passwordHash: true }
        });

  if (!account || !account.isActive) {
    return null;
  }

  const secret = getResetSecret();
  if (!secret) {
    throw new Error("PASSWORD_RESET_SECRET or NEXTAUTH_SECRET is required.");
  }

  const payload: ResetPayload = {
    uid: account.id,
    exp: Date.now() + RESET_TOKEN_TTL_MS,
    fp: fingerprintPasswordHash(account.passwordHash),
    k: kind
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

  const kind: AccountKind = payload.k === "employee" ? "employee" : "user";

  const account =
    kind === "employee"
      ? await prisma.employeeAccount.findUnique({
          where: { id: payload.uid },
          select: { id: true, isActive: true, passwordHash: true }
        })
      : await prisma.user.findUnique({
          where: { id: payload.uid },
          select: { id: true, isActive: true, passwordHash: true }
        });

  if (!account || !account.isActive) {
    return null;
  }

  const currentFingerprint = fingerprintPasswordHash(account.passwordHash);
  if (currentFingerprint !== payload.fp) {
    return null;
  }

  return { accountId: account.id, kind };
}

export async function completePasswordReset(
  accountId: string,
  passwordHash: string,
  kind: AccountKind = "user"
) {
  if (kind === "employee") {
    await prisma.employeeAccount.update({
      where: { id: accountId },
      data: { passwordHash }
    });
    return;
  }
  await prisma.user.update({
    where: { id: accountId },
    data: { passwordHash }
  });
}