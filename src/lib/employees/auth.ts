import { randomUUID } from "crypto";
import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

export const EMPLOYEE_SESSION_COOKIE = "employee_session";

export async function authenticateEmployee(email: string, password: string) {
  const employee = await prisma.employeeAccount.findFirst({
    where: { email: email.trim().toLowerCase() },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          status: true
        }
      }
    }
  });

  if (!employee || !employee.isActive) return null;

  const ok = await compare(password, employee.passwordHash);
  if (!ok) return null;

  return employee;
}

export function getEmployeeRedirectPath(employee: {
  allowPlantel: boolean;
  allowEggs: boolean;
  allowIncubators: boolean;
  allowHealth: boolean;
}) {
  if (employee.allowPlantel) return "/equipe/plantel";
  if (employee.allowEggs) return "/equipe/coleta-ovos";
  if (employee.allowIncubators) return "/equipe/chocadeiras";
  if (employee.allowHealth) return "/equipe/sanidade";
  return "/equipe/sem-acesso";
}

export async function createEmployeeSession(employeeId: string, tenantId: string) {
  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

  await prisma.employeeSession.create({
    data: {
      employeeId,
      tenantId,
      token,
      expiresAt
    }
  });

  await prisma.employeeAccount.update({
    where: { id: employeeId },
    data: { lastLoginAt: new Date() }
  });

  const cookieStore = await cookies();
  cookieStore.set(EMPLOYEE_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function destroyEmployeeSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(EMPLOYEE_SESSION_COOKIE)?.value;

  if (token) {
    await prisma.employeeSession.deleteMany({
      where: { token }
    });
  }

  cookieStore.set(EMPLOYEE_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });
}

export async function getCurrentEmployeeSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(EMPLOYEE_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.employeeSession.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() }
    },
    include: {
      employee: true,
      tenant: {
        select: {
          id: true,
          name: true,
          status: true,
          trialStartsAt: true,
          trialEndsAt: true
        }
      }
    }
  });

  if (!session || !session.employee.isActive) return null;
  return session;
}
