import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: "health" });
  if (!auth.ok) return auth.response;

  const tenantId = auth.session.user.tenantId;

  const [plantelGroups, listings] = await Promise.all([
    prisma.flockGroup.findMany({
      where: {
        tenantId,
        NOT: { title: { startsWith: "Chocada " } }
      },
      select: {
        id: true,
        title: true,
        species: { select: { name: true } },
        breed: { select: { name: true } },
        variety: { select: { name: true } },
        _count: {
          select: { birds: { where: { status: { not: "DEAD" } } } }
        }
      },
      orderBy: { title: "asc" }
    }),
    prisma.vitrineListing.findMany({
      where: { tenantId, status: { not: "REMOVED" } },
      select: {
        id: true,
        title: true,
        flockGroupId: true,
        availableQuantity: true,
        flockGroup: {
          select: {
            id: true,
            title: true,
            species: { select: { name: true } },
            breed: { select: { name: true } },
            variety: { select: { name: true } }
          }
        },
        sourceIncubatorBatch: {
          select: {
            flockGroup: {
              select: {
                title: true,
                species: { select: { name: true } },
                breed: { select: { name: true } },
                variety: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const flockGroupIds = listings.map((l) => l.flockGroupId);
  const birdCountsByGroup = flockGroupIds.length
    ? await prisma.bird.groupBy({
        by: ["flockGroupId"],
        where: {
          tenantId,
          flockGroupId: { in: flockGroupIds },
          status: { not: "DEAD" }
        },
        _count: { _all: true }
      })
    : [];
  const birdCountByGroup = new Map(
    birdCountsByGroup.map((row) => [row.flockGroupId, row._count._all])
  );

  return NextResponse.json({
    plantelGroups: plantelGroups.map((g) => ({
      id: g.id,
      flockGroupId: g.id,
      title: g.title,
      taxonomy: [g.species?.name, g.breed?.name, g.variety?.name].filter(Boolean).join(" · "),
      birdCount: g._count.birds
    })),
    vitrineListings: listings.map((listing) => {
      const parent = listing.sourceIncubatorBatch?.flockGroup ?? listing.flockGroup;
      const taxonomy = [parent.species?.name, parent.breed?.name, parent.variety?.name]
        .filter(Boolean)
        .join(" · ");
      const fallbackTitle =
        listing.title?.trim() || `Lote ${listing.id.slice(-4).toUpperCase()}`;
      return {
        id: listing.id,
        flockGroupId: listing.flockGroupId,
        title: fallbackTitle,
        parentTitle: parent.title,
        taxonomy,
        birdCount: birdCountByGroup.get(listing.flockGroupId) ?? 0
      };
    })
  });
}
