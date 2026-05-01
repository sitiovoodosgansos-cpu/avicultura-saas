import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await getApiSessionOr401({ employeePermission: "plantel" });
  if (!auth.ok) return auth.response;

  const tenantId = auth.session.user.tenantId;
  const parentId = params.id;

  const parent = await prisma.flockGroup.findFirst({
    where: { id: parentId, tenantId },
    select: { id: true, title: true }
  });
  if (!parent) {
    return NextResponse.json({ error: "Lote não encontrado." }, { status: 404 });
  }

  const hatchedListings = await prisma.vitrineListing.findMany({
    where: {
      tenantId,
      sourceIncubatorBatch: { flockGroupId: parentId }
    },
    select: { flockGroupId: true }
  });

  const childGroupIds = Array.from(
    new Set(hatchedListings.map((listing) => listing.flockGroupId).filter((id) => id !== parentId))
  );

  if (childGroupIds.length === 0) {
    return NextResponse.json({ parent, childGroups: [], birds: [] });
  }

  const [childGroups, birds, listings] = await Promise.all([
    prisma.flockGroup.findMany({
      where: { id: { in: childGroupIds }, tenantId },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.bird.findMany({
      where: { tenantId, flockGroupId: { in: childGroupIds }, status: { not: "DEAD" } },
      orderBy: [{ flockGroupId: "asc" }, { ringNumber: "asc" }]
    }),
    prisma.vitrineListing.findMany({
      where: { tenantId, sourceBirdId: { not: null }, status: "AVAILABLE" },
      select: { sourceBirdId: true }
    })
  ]);

  const inVitrineSet = new Set(listings.map((l) => l.sourceBirdId!));
  const childGroupTitleById = new Map(childGroups.map((g) => [g.id, g.title]));

  const enriched = birds.map((bird) => ({
    ...bird,
    purchaseValue: bird.purchaseValue ? Number(bird.purchaseValue) : null,
    inVitrine: inVitrineSet.has(bird.id),
    flockGroupTitle: childGroupTitleById.get(bird.flockGroupId) ?? "Chocada"
  }));

  return NextResponse.json({ parent, childGroups, birds: enriched });
}
