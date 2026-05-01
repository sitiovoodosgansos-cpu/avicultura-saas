import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";

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

  const childGroupIds = Array.from(
    new Set(
      batches.flatMap((b) =>
        b.vitrineListings
          .map((l) => l.flockGroupId)
          .filter((id): id is string => Boolean(id) && id !== parentId)
      )
    )
  );

  const aliveByChild = new Map<string, number>();
  if (childGroupIds.length > 0) {
    const aliveBirds = await prisma.bird.findMany({
      where: {
        tenantId,
        flockGroupId: { in: childGroupIds },
        status: { not: "DEAD" }
      },
      select: { flockGroupId: true }
    });
    for (const b of aliveBirds) {
      aliveByChild.set(b.flockGroupId, (aliveByChild.get(b.flockGroupId) ?? 0) + 1);
    }
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
      const aliveCount = childGroupId ? aliveByChild.get(childGroupId) ?? 0 : 0;
      const availableInVitrine = batch.vitrineListings.reduce(
        (s, l) => s + (l.availableQuantity ?? 0),
        0
      );
      return {
        batchId: batch.id,
        title: batch.vitrineListings[0]?.title ?? `Lote de ${batch.entryDate.toISOString().slice(0, 10)}`,
        birthDate: birthDate?.toISOString() ?? null,
        eggsSet: batch.eggsSet,
        born: totalHatched,
        alive: aliveCount,
        availableInVitrine,
        childFlockGroupId: childGroupId
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return NextResponse.json({ parent, hatchBatches });
}
