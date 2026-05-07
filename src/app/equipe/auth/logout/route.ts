import { NextRequest, NextResponse } from "next/server";
import { destroyEmployeeSession, EMPLOYEE_SESSION_COOKIE } from "@/lib/employees/auth";

export async function GET(request: NextRequest) {
  await destroyEmployeeSession();
  const response = NextResponse.redirect(new URL("/equipe/login", request.url));
  // Limpa o cookie tambem na resposta pra garantir que o browser solte
  // (analogo ao login: NextResponse.cookies eh o caminho confiavel).
  response.cookies.delete(EMPLOYEE_SESSION_COOKIE);
  return response;
}
