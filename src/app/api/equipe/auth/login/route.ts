import { NextRequest, NextResponse } from "next/server";
import { authenticateEmployee, createEmployeeSession, getEmployeeRedirectPath } from "@/lib/employees/auth";
import { getTenantBilling } from "@/lib/billing/service";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { employeeLoginSchema } from "@/lib/validators/employees";

const EMPLOYEE_LOGIN_RATE_LIMIT = 10;
const EMPLOYEE_LOGIN_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }

  const email =
    body && typeof body === "object" && "email" in body && typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "unknown";

  const guard = rateLimit({
    key: `employee-login:${getClientIp(request)}:${email}`,
    limit: EMPLOYEE_LOGIN_RATE_LIMIT,
    windowMs: EMPLOYEE_LOGIN_WINDOW_MS
  });

  if (!guard.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil((guard.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Muitas tentativas de login. Tente novamente em alguns minutos." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds)
        }
      }
    );
  }

  const parsed = employeeLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos." }, { status: 400 });
  }

  const employee = await authenticateEmployee(parsed.data.email, parsed.data.password);
  if (!employee) {
    return NextResponse.json({ error: "E-mail ou senha invalidos." }, { status: 401 });
  }

  const billing = await getTenantBilling(employee.tenantId);
  if (!billing?.isAccessAllowed) {
    return NextResponse.json(
      { error: "A conta principal esta bloqueada. Avise o titular da assinatura." },
      { status: 402 }
    );
  }

  await createEmployeeSession(employee.id, employee.tenantId);

  return NextResponse.json({ ok: true, redirectTo: getEmployeeRedirectPath(employee) });
}
