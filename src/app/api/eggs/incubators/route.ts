import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: "eggs" });
  if (!auth.ok) return auth.response;

  const incubators = await prisma.incubator.findMany({
    where: { tenantId: auth.session.user.tenantId, status: "ACTIVE" },
    select: { id: true, name: true, status: true },
    orderBy: { name: "asc" }
  });

  return NextResponse.json({ incubators });
}
