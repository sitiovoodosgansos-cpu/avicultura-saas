import { NextRequest, NextResponse } from "next/server";
import { authenticateEmployee, createEmployeeSession, getEmployeeRedirectPath } from "@/lib/employees/auth";
import { employeeLoginSchema } from "@/lib/validators/employees";
import { getTenantBilling } from "@/lib/billing/service";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = employeeLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const employee = await authenticateEmployee(parsed.data.email, parsed.data.password);
  if (!employee) {
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  }

  const billing = await getTenantBilling(employee.tenantId);
  if (!billing?.isAccessAllowed) {
    return NextResponse.json(
      { error: "A conta principal está bloqueada. Avise o titular da assinatura." },
      { status: 402 }
    );
  }

  await createEmployeeSession(employee.id, employee.tenantId);

  return NextResponse.json({ ok: true, redirectTo: getEmployeeRedirectPath(employee) });
}
