import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: "health" });
  if (!auth.ok) return auth.response;

  const groups = await prisma.flockGroup.findMany({
    where: {
      tenantId: auth.session.user.tenantId,
      NOT: { title: { startsWith: "Chocada " } }
    },
    select: {
      id: true,
      title: true,
      species: { select: { name: true } },
      breed: { select: { name: true } },
      variety: { select: { name: true } },
      _count: {
        select: {
          birds: { where: { status: { not: "DEAD" } } }
        }
      }
    },
    orderBy: { title: "asc" }
  });

  return NextResponse.json({
    groups: groups.map((g) => ({
      id: g.id,
      title: g.title,
      species: g.species,
      breed: g.breed,
      variety: g.variety,
      birdCount: g._count.birds
    }))
  });
}
