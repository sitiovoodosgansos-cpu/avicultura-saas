import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: "eggs" });
  if (!auth.ok) return auth.response;

  const groups = await prisma.flockGroup.findMany({
    where: {
      tenantId: auth.session.user.tenantId,
      NOT: {
        OR: [
          { title: { startsWith: "Chocada " } },
          { title: { startsWith: "Recria " } }
        ]
      }
    },
    select: {
      id: true,
      title: true,
      species: { select: { name: true } },
      breed: { select: { name: true } },
      variety: { select: { name: true } }
    },
    orderBy: { title: "asc" }
  });

  return NextResponse.json({ groups });
}
