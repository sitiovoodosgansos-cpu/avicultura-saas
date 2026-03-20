import { NextRequest, NextResponse } from "next/server";
import { destroyEmployeeSession } from "@/lib/employees/auth";

export async function GET(request: NextRequest) {
  await destroyEmployeeSession();
  return NextResponse.redirect(new URL("/equipe/login", request.url));
}
