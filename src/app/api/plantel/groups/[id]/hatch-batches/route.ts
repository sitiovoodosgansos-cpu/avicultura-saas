import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { materializeBirthsForParent } from "@/lib/vitrine/service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApiSessionOr401({ employeePermission: "plantel" });
  if (!auth.ok) return auth.response;

  const tenantId = auth.session.user.tenantId;
  const { id: parentId } = await params;

  const parent = await prisma.flockGroup.findFirst({
    where: { id: parentId, tenantId },
    select: { id: true, title: true }
  });
  if (!parent) {
    return NextResponse.json({ error: "Lote não encontrado." }, { status: 404 });
  }

  // Backfill idempotente antes de calcular: garante listing+FlockGroup+Birds
  // pra chocadas pre-feature ou sem listing.
  await materializeBirthsForParent(tenantId, parentId);

  const batches = await prisma.incubatorBatch.findMany({
    where: { tenantId, flockGroupId: parentId },
    select: {
      id: true,
      entryDate: true,
      eggsSet: true,
      events: { where: { type: "HATCHED" }, select: { eventDate: true, quantity: true } },
      vitrineListings: {
        where: { status: { not: "REMOVED" } },
        select: {
          id: true,
          flockGroupId: true,
          birthDate: true,
          initialQuantity: true,
          availableQuantity: true,
          title: true
        }
      }
    },
    orderBy: { entryDate: "desc" }
  });

  const allListingIds = batches.flatMap((b) => b.vitrineListings.map((l) => l.id));
  const childGroupIds = Array.from(
    new Set(
      batches.flatMap((b) =>
        b.vitrineListings
          .map((l) => l.flockGroupId)
          .filter((id): id is string => Boolean(id) && id !== parentId)
      )
    )
  );

  const [salesAgg, deathsAgg, deadBirds] = await Promise.all([
    allListingIds.length > 0
      ? prisma.vitrineSale.groupBy({
          by: ["listingId"],
          where: { tenantId, listingId: { in: allListingIds } },
          _sum: { quantitySold: true }
        })
      : Promise.resolve([] as Array<{ listingId: string; _sum: { quantitySold: number | null } }>),
    allListingIds.length > 0
      ? prisma.vitrineDeathRecord.groupBy({
          by: ["listingId"],
          where: { tenantId, listingId: { in: allListingIds } },
          _sum: { quantity: true }
        })
      : Promise.resolve([] as Array<{ listingId: string; _sum: { quantity: number | null } }>),
    childGroupIds.length > 0
      ? prisma.bird.groupBy({
          by: ["flockGroupId"],
          where: { tenantId, flockGroupId: { in: childGroupIds }, status: "DEAD" },
          _count: { _all: true }
        })
      : Promise.resolve([] as Array<{ flockGroupId: string; _count: { _all: number } }>)
  ]);

  const soldByListing = new Map<string, number>();
  for (const row of salesAgg) {
    soldByListing.set(row.listingId, row._sum.quantitySold ?? 0);
  }
  const deathRecordsByListing = new Map<string, number>();
  for (const row of deathsAgg) {
    deathRecordsByListing.set(row.listingId, row._sum.quantity ?? 0);
  }
  const deadBirdsByGroup = new Map<string, number>();
  for (const row of deadBirds) {
    deadBirdsByGroup.set(row.flockGroupId, row._count._all);
  }

  const hatchBatches = batches
    .map((batch) => {
      const totalHatched = batch.events.reduce((sum, e) => sum + (e.quantity ?? 0), 0);
      if (totalHatched <= 0 && batch.vitrineListings.length === 0) return null;
      const lastEvent = [...batch.events].sort(
        (a, b) => b.eventDate.getTime() - a.eventDate.getTime()
      )[0];
      const birthDate =
        lastEvent?.eventDate ?? batch.vitrineListings[0]?.birthDate ?? batch.entryDate;
      const childGroupId =
        batch.vitrineListings.find((l) => l.flockGroupId !== parentId)?.flockGroupId ?? null;

      const sold = batch.vitrineListings.reduce(
        (s, l) => s + (soldByListing.get(l.id) ?? 0),
        0
      );
      const deathFromRecords = batch.vitrineListings.reduce(
        (s, l) => s + (deathRecordsByListing.get(l.id) ?? 0),
        0
      );
      const deadBirdsCount = childGroupId ? deadBirdsByGroup.get(childGroupId) ?? 0 : 0;
      const dead = deathFromRecords + deadBirdsCount;

      return {
        batchId: batch.id,
        title: batch.vitrineListings[0]?.title ?? `Lote de ${batch.entryDate.toISOString().slice(0, 10)}`,
        birthDate: birthDate?.toISOString() ?? null,
        eggsSet: batch.eggsSet,
        born: totalHatched,
        dead,
        sold,
        childFlockGroupId: childGroupId
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return NextResponse.json({ parent, hatchBatches });
}
