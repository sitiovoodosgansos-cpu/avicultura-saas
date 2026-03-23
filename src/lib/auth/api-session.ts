import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { getTenantBilling } from "@/lib/billing/service";
import { getCurrentEmployeeSession } from "@/lib/employees/auth";

type EmployeePermission = "plantel" | "eggs" | "incubators" | "health";

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

      const allowed =
        (options.employeePermission === "plantel" && employeeSession.employee.allowPlantel) ||
        (options.employeePermission === "eggs" && employeeSession.employee.allowEggs) ||
        (options.employeePermission === "incubators" && employeeSession.employee.allowIncubators) ||
        (options.employeePermission === "health" && employeeSession.employee.allowHealth);

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
              allowHealth: employeeSession.employee.allowHealth
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
    const allowed =
      (options.employeePermission === "plantel" && employeeSession.employee.allowPlantel) ||
      (options.employeePermission === "eggs" && employeeSession.employee.allowEggs) ||
      (options.employeePermission === "incubators" && employeeSession.employee.allowIncubators) ||
      (options.employeePermission === "health" && employeeSession.employee.allowHealth);

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
          allowHealth: employeeSession.employee.allowHealth
        }
      }
    }
  };
}
