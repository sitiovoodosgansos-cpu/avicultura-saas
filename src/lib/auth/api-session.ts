import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getTenantBilling } from "@/lib/billing/service";
import { getCurrentEmployeeSession } from "@/lib/employees/auth";

type EmployeePermission =
  | "plantel"
  | "eggs"
  | "incubators"
  | "health"
  | "dashboard"
  | "prateleira"
  | "vitrine"
  | "financeiro"
  | "relatorios"
  | "crm";

function isPermissionAllowed(
  permission: EmployeePermission,
  emp: {
    allowPlantel: boolean;
    allowEggs: boolean;
    allowIncubators: boolean;
    allowHealth: boolean;
    allowDashboard: boolean;
    allowPrateleira: boolean;
    allowVitrine: boolean;
    allowFinanceiro: boolean;
    allowRelatorios: boolean;
    allowCrm: boolean;
  }
): boolean {
  switch (permission) {
    case "plantel": return emp.allowPlantel;
    case "eggs": return emp.allowEggs;
    case "incubators": return emp.allowIncubators;
    case "health": return emp.allowHealth;
    case "dashboard": return emp.allowDashboard;
    case "prateleira": return emp.allowPrateleira;
    case "vitrine": return emp.allowVitrine;
    case "financeiro": return emp.allowFinanceiro;
    case "relatorios": return emp.allowRelatorios;
    case "crm": return emp.allowCrm;
  }
}

export async function getApiSessionOr401(options?: {
  allowBlocked?: boolean;
  ownerOnly?: boolean;
  employeePermission?: EmployeePermission;
}) {
  const session = await getServerSession(authOptions);

  // For employee module routes, prefer employee session first to avoid
  // accidentally using an owner session from another open tab/account.
  if (options?.employeePermission) {
    const employeeSession = await getCurrentEmployeeSession();
    // If the owner is logged in, owner session must take precedence.
    // This avoids blocking the main account when an old employee cookie still exists.
    if (employeeSession && !(session?.user?.id && session.user.tenantId)) {
      if (!options?.allowBlocked) {
        const billing = await getTenantBilling(employeeSession.tenantId);
        if (!billing?.isAccessAllowed) {
          return {
            ok: false as const,
            response: NextResponse.json(
              { error: "Acesso bloqueado. Regularize sua assinatura na página Perfil." },
              { status: 402 }
            )
          };
        }
      }

      const allowed = isPermissionAllowed(options.employeePermission, employeeSession.employee);

      if (!allowed) {
        return {
          ok: false as const,
          response: NextResponse.json({ error: "Sem permissão para este módulo." }, { status: 403 })
        };
      }

      return {
        ok: true as const,
        session: {
          user: {
            id: employeeSession.employee.id,
            tenantId: employeeSession.tenantId,
            role: "EMPLOYEE",
            name: employeeSession.employee.name,
            email: employeeSession.employee.email,
            kind: "employee" as const,
            permissions: {
              allowPlantel: employeeSession.employee.allowPlantel,
              allowEggs: employeeSession.employee.allowEggs,
              allowIncubators: employeeSession.employee.allowIncubators,
              allowHealth: employeeSession.employee.allowHealth,
              allowDashboard: employeeSession.employee.allowDashboard,
              allowPrateleira: employeeSession.employee.allowPrateleira,
              allowVitrine: employeeSession.employee.allowVitrine,
              allowFinanceiro: employeeSession.employee.allowFinanceiro,
              allowRelatorios: employeeSession.employee.allowRelatorios,
              allowCrm: employeeSession.employee.allowCrm
            }
          }
        }
      };
    }
  }

  if (session?.user?.id && session.user.tenantId) {
    if (!options?.allowBlocked) {
      const billing = await getTenantBilling(session.user.tenantId);
      if (!billing?.isAccessAllowed) {
        return {
          ok: false as const,
          response: NextResponse.json(
            { error: "Acesso bloqueado. Regularize sua assinatura na página Perfil." },
            { status: 402 }
          )
        };
      }
    }

    return {
      ok: true as const,
      session: {
        user: {
          id: session.user.id,
          tenantId: session.user.tenantId,
          role: session.user.role,
          name: session.user.name ?? "Titular",
          email: session.user.email ?? null,
          kind: "owner" as const
        }
      }
    };
  }

  const employeeSession = await getCurrentEmployeeSession();
  if (!employeeSession) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Não autenticado." }, { status: 401 })
    };
  }

  if (options?.ownerOnly) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Acesso restrito ao titular da conta." }, { status: 403 })
    };
  }

  if (!options?.allowBlocked) {
    const billing = await getTenantBilling(employeeSession.tenantId);
    if (!billing?.isAccessAllowed) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: "Acesso bloqueado. Regularize sua assinatura na página Perfil." },
          { status: 402 }
        )
      };
    }
  }

  if (options?.employeePermission) {
    const allowed = isPermissionAllowed(options.employeePermission, employeeSession.employee);

    if (!allowed) {
      return {
        ok: false as const,
        response: NextResponse.json({ error: "Sem permissão para este módulo." }, { status: 403 })
      };
    }
  }

  return {
    ok: true as const,
    session: {
      user: {
        id: employeeSession.employee.id,
        tenantId: employeeSession.tenantId,
        role: "EMPLOYEE",
        name: employeeSession.employee.name,
        email: employeeSession.employee.email,
        kind: "employee" as const,
        permissions: {
          allowPlantel: employeeSession.employee.allowPlantel,
          allowEggs: employeeSession.employee.allowEggs,
          allowIncubators: employeeSession.employee.allowIncubators,
          allowHealth: employeeSession.employee.allowHealth,
          allowDashboard: employeeSession.employee.allowDashboard,
          allowPrateleira: employeeSession.employee.allowPrateleira,
          allowVitrine: employeeSession.employee.allowVitrine,
          allowFinanceiro: employeeSession.employee.allowFinanceiro,
          allowRelatorios: employeeSession.employee.allowRelatorios
        }
      }
    }
  };
}
