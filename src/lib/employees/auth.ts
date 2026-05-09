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
  allowDashboard: boolean;
  allowPlantel: boolean;
  allowEggs: boolean;
  allowPrateleira: boolean;
  allowIncubators: boolean;
  allowVitrine: boolean;
  allowHealth: boolean;
  allowFinanceiro: boolean;
  allowRelatorios: boolean;
  allowCrm: boolean;
}) {
  if (employee.allowDashboard) return "/equipe/dashboard";
  if (employee.allowCrm) return "/equipe/crm";
  if (employee.allowPlantel) return "/equipe/plantel";
  if (employee.allowEggs) return "/equipe/coleta-ovos";
  if (employee.allowPrateleira) return "/equipe/prateleira";
  if (employee.allowIncubators) return "/equipe/chocadeiras";
  if (employee.allowVitrine) return "/equipe/vitrine";
  if (employee.allowHealth) return "/equipe/sanidade";
  if (employee.allowFinanceiro) return "/equipe/financeiro";
  // Relatorios saiu do menu titular — funcionario que tem permissao
  // ainda acessa via /equipe/relatorios (rota mantida).
  if (employee.allowRelatorios) return "/equipe/relatorios";
  return "/equipe/sem-acesso";
}

// Opcoes do cookie da sessao do funcionario. Centraliza pra garantir que
// route handlers e qualquer consumidor anexem o mesmo formato (httpOnly,
// secure em prod, sameSite lax, path "/", maxAge de 14 dias).
export const EMPLOYEE_SESSION_MAX_AGE = 60 * 60 * 24 * 14; // segundos
export function buildEmployeeSessionCookieOptions(maxAge = EMPLOYEE_SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge
  };
}

// Cria a sessao no banco e devolve o token. NAO seta cookie aqui;
// quem chamar (route handler) deve anexar via NextResponse.cookies.set
// pra garantir que o Set-Cookie va de fato na resposta — em alguns
// edge runtimes o cookies().set() de "next/headers" nao se anexava
// automaticamente, deixando o usuario "deslogado" no proximo refresh.
export async function createEmployeeSession(employeeId: string, tenantId: string) {
  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + EMPLOYEE_SESSION_MAX_AGE * 1000);

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

  return { token, expiresAt };
}

// Apaga a sessao do banco (se ainda existir) e devolve o nome do cookie
// pra quem chamar limpar via NextResponse.cookies.delete.
export async function destroyEmployeeSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(EMPLOYEE_SESSION_COOKIE)?.value;

  if (token) {
    await prisma.employeeSession.deleteMany({
      where: { token }
    });
  }
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
