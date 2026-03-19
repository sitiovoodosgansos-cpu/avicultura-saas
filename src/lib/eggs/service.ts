import { prisma } from "@/lib/db/prisma";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ratio(num: number, den: number) {
  if (!den) return 0;
  return Number(((num / den) * 100).toFixed(2));
}

export async function listEggCollections(tenantId: string, opts?: { from?: string; to?: string; groupId?: string }) {
  const where = {
    tenantId,
    date: {
      gte: opts?.from ? new Date(`${opts.from}T00:00:00`) : undefined,
      lte: opts?.to ? new Date(`${opts.to}T23:59:59`) : undefined
    },
    flockGroupId: opts?.groupId || undefined
  };

  const collections = await prisma.eggCollection.findMany({
    where,
    include: {
      flockGroup: {
        select: {
          id: true,
          title: true,
          species: { select: { name: true } },
          breed: { select: { name: true } },
          variety: { select: { name: true } }
        }
      }
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }]
  });

  return collections.map((row) => ({
    ...row,
    goodRate: ratio(row.goodEggs, row.totalEggs),
    crackedRate: ratio(row.crackedEggs, row.totalEggs)
  }));
}

export async function createEggCollection(
  tenantId: string,
  userId: string,
  input: {
    date: string;
    flockGroupId: string;
    totalEggs: number;
    crackedEggs: number;
    notes?: string;
  }
) {
  const group = await prisma.flockGroup.findFirst({ where: { id: input.flockGroupId, tenantId } });
  if (!group) return null;

  const goodEggs = Math.max(input.totalEggs - input.crackedEggs, 0);

  const created = await prisma.eggCollection.create({
    data: {
      tenantId,
      date: new Date(`${input.date}T12:00:00`),
      flockGroupId: input.flockGroupId,
      totalEggs: input.totalEggs,
      goodEggs,
      crackedEggs: input.crackedEggs,
      notes: input.notes
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "EGG_COLLECTION_CREATE",
      entity: "EggCollection",
      entityId: created.id,
      after: {
        totalEggs: created.totalEggs,
        goodEggs: created.goodEggs,
        crackedEggs: created.crackedEggs
      }
    }
  });

  return created;
}

export async function updateEggCollection(
  tenantId: string,
  userId: string,
  id: string,
  input: {
    date: string;
    flockGroupId: string;
    totalEggs: number;
    crackedEggs: number;
    notes?: string;
  }
) {
  const existing = await prisma.eggCollection.findFirst({ where: { id, tenantId } });
  if (!existing) return null;

  const goodEggs = Math.max(input.totalEggs - input.crackedEggs, 0);

  const updated = await prisma.eggCollection.update({
    where: { id },
    data: {
      date: new Date(`${input.date}T12:00:00`),
      flockGroupId: input.flockGroupId,
      totalEggs: input.totalEggs,
      goodEggs,
      crackedEggs: input.crackedEggs,
      notes: input.notes
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "EGG_COLLECTION_UPDATE",
      entity: "EggCollection",
      entityId: id,
      before: {
        totalEggs: existing.totalEggs,
        goodEggs: existing.goodEggs,
        crackedEggs: existing.crackedEggs
      },
      after: {
        totalEggs: updated.totalEggs,
        goodEggs: updated.goodEggs,
        crackedEggs: updated.crackedEggs
      }
    }
  });

  return updated;
}

export async function deleteEggCollection(tenantId: string, userId: string, id: string) {
  const existing = await prisma.eggCollection.findFirst({ where: { id, tenantId } });
  if (!existing) return false;

  await prisma.eggCollection.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "EGG_COLLECTION_DELETE",
      entity: "EggCollection",
      entityId: id
    }
  });

  return true;
}

export async function updateGroupLayCapacity(tenantId: string, id: string, expectedLayCapacity: number) {
  const existing = await prisma.flockGroup.findFirst({ where: { id, tenantId } });
  if (!existing) return null;

  return prisma.flockGroup.update({
    where: { id },
    data: { expectedLayCapacity }
  });
}

export async function getEggMetrics(tenantId: string) {
  const today = startOfDay(new Date());
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const days7 = addDays(today, -6);
  const days30 = addDays(today, -29);
  const days365 = addDays(today, -364);

  const [groups, rows365, rows30] = await Promise.all([
    prisma.flockGroup.findMany({
      where: { tenantId },
      select: {
        id: true,
        title: true,
        expectedLayCapacity: true,
        species: { select: { name: true } },
        breed: { select: { name: true } },
        variety: { select: { name: true } }
      },
      orderBy: { title: "asc" }
    }),
    prisma.eggCollection.findMany({
      where: { tenantId, date: { gte: days365 } },
      select: {
        date: true,
        flockGroupId: true,
        totalEggs: true,
        goodEggs: true,
        crackedEggs: true
      }
    }),
    prisma.eggCollection.findMany({
      where: { tenantId, date: { gte: days30 } },
      select: { date: true, flockGroupId: true, totalEggs: true }
    })
  ]);

  const calendarMap = new Map<string, { total: number; good: number; cracked: number }>();
  for (const row of rows365) {
    const key = isoDate(row.date);
    const prev = calendarMap.get(key) ?? { total: 0, good: 0, cracked: 0 };
    calendarMap.set(key, {
      total: prev.total + row.totalEggs,
      good: prev.good + row.goodEggs,
      cracked: prev.cracked + row.crackedEggs
    });
  }

  const groupMap = new Map<
    string,
    {
      eggs7: number;
      eggs30: number;
      eggs365: number;
      good: number;
      total: number;
      activeDays30: Set<string>;
    }
  >();

  const makeGroupBucket = () => ({
    eggs7: 0,
    eggs30: 0,
    eggs365: 0,
    good: 0,
    total: 0,
    activeDays30: new Set<string>()
  });

  for (const row of rows365) {
    const bucket = groupMap.get(row.flockGroupId) ?? makeGroupBucket();

    const dateKey = isoDate(row.date);

    bucket.eggs365 += row.totalEggs;
    bucket.good += row.goodEggs;
    bucket.total += row.totalEggs;

    if (row.date >= days30) {
      bucket.eggs30 += row.totalEggs;
      bucket.activeDays30.add(dateKey);
    }

    if (row.date >= days7) {
      bucket.eggs7 += row.totalEggs;
    }

    groupMap.set(row.flockGroupId, bucket);
  }

  // Guarantee active day info even if we only loaded rows30 slice.
  for (const row of rows30) {
    const bucket = groupMap.get(row.flockGroupId) ?? makeGroupBucket();
    bucket.activeDays30.add(isoDate(row.date));
    groupMap.set(row.flockGroupId, bucket);
  }

  const groupCards = groups.map((group) => {
    const bucket = groupMap.get(group.id) ?? {
      eggs7: 0,
      eggs30: 0,
      eggs365: 0,
      good: 0,
      total: 0,
      activeDays30: new Set<string>()
    };

    const activeDays = bucket.activeDays30.size || 1;
    const averageDaily = Number((bucket.eggs30 / activeDays).toFixed(2));
    const averageWeekly = Number((averageDaily * 7).toFixed(2));
    const averageMonthly = Number((averageDaily * 30).toFixed(2));

    const expected = group.expectedLayCapacity ? Number(group.expectedLayCapacity) : 0;
    const progress = expected > 0 ? Number(((bucket.eggs30 / expected) * 100).toFixed(2)) : 0;

    let performance: "below" | "on_track" | "above" = "on_track";
    if (expected > 0 && progress < 85) performance = "below";
    if (expected > 0 && progress > 105) performance = "above";

    return {
      groupId: group.id,
      title: group.title,
      species: group.species.name,
      breed: group.breed.name,
      variety: group.variety?.name ?? null,
      expectedLayCapacity: expected,
      eggs7: bucket.eggs7,
      eggs30: bucket.eggs30,
      eggs365: bucket.eggs365,
      goodEggRate: ratio(bucket.good, bucket.total),
      averageDaily,
      averageWeekly,
      averageMonthly,
      progress,
      performance
    };
  });

  const todayRow = calendarMap.get(isoDate(today)) ?? { total: 0, good: 0, cracked: 0 };

  const monthRows = Array.from(calendarMap.entries())
    .filter(([key]) => key >= isoDate(monthStart))
    .map(([date, values]) => ({ date, ...values }));

  return {
    summary: {
      eggsToday: todayRow.total,
      goodEggsToday: todayRow.good,
      crackedEggsToday: todayRow.cracked,
      goodRateToday: ratio(todayRow.good, todayRow.total)
    },
    calendar: Array.from(calendarMap.entries()).map(([date, values]) => ({ date, ...values })),
    monthlySeries: monthRows,
    groupCards
  };
}
