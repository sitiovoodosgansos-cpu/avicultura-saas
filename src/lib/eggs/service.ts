import { prisma } from "@/lib/db/prisma";
import { createTrayEntryFromCollection } from "@/lib/eggs/tray-service";

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
  userId: string | null,
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
      userId: userId ?? undefined,
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

  if (goodEggs > 0) {
    await createTrayEntryFromCollection(tenantId, created.id, input.flockGroupId, created.date, goodEggs);
  }

  return created;
}

export async function updateEggCollection(
  tenantId: string,
  userId: string | null,
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

  // Sincroniza a bandeja correspondente. Tres cenarios:
  //
  // 1) Sem entry ainda + agora tem ovo bom → cria entry novo (caso normal).
  // 2) Tem entry, consumed === 0 → atualiza initialCount (ou deleta se 0).
  // 3) Tem entry, consumed > 0 → entry original ja tem ovo vendido/
  //    transferido/descartado. Nao da pra mexer no initialCount sem
  //    quebrar contabilidade. Se o user AUMENTOU os ovos da coleta
  //    (delta > 0), criamos um SEGUNDO entry no mesmo tray pra contar
  //    o acrescimo — eggCollectionId NULL porque a @unique impede 2
  //    entries linkados na mesma coleta. Esse foi o bug reportado:
  //    user adicionava mais ovos numa coleta cujos ovos ja tinham ido
  //    pra chocadeira e nada aparecia na prateleira.
  const trayEntry = await prisma.eggTrayEntry.findFirst({
    where: { eggCollectionId: id, tenantId }
  });
  if (trayEntry) {
    const consumed = trayEntry.soldCount + trayEntry.transferredCount + trayEntry.discardedCount;
    if (consumed === 0) {
      if (goodEggs === 0) {
        // Coleta sem ovos bons agora -> bandeja vazia, deleta
        await prisma.eggTrayEntry.delete({ where: { id: trayEntry.id } });
      } else {
        await prisma.eggTrayEntry.update({
          where: { id: trayEntry.id },
          data: { initialCount: goodEggs, entryDate: new Date(`${input.date}T12:00:00`) }
        });
      }
    } else {
      // Consumed > 0: cria entry adicional pra o delta de aumento.
      // Decremento nao da pra fazer sem reverter na prateleira primeiro.
      const delta = goodEggs - existing.goodEggs;
      if (delta > 0) {
        await prisma.eggTrayEntry.create({
          data: {
            tenantId,
            trayId: trayEntry.trayId,
            source: "COLLECTION",
            entryDate: new Date(`${input.date}T12:00:00`),
            initialCount: delta,
            notes: `Acrescimo pos-consumo (entry original ${trayEntry.id} ja tinha ovo vendido/transferido/descartado)`
          }
        });
      }
    }
  } else if (goodEggs > 0) {
    // Coleta nao tinha bandeja (talvez goodEggs era 0 antes) e agora tem.
    await createTrayEntryFromCollection(tenantId, id, input.flockGroupId, updated.date, goodEggs);
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
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

export async function deleteEggCollection(tenantId: string, userId: string | null, id: string) {
  const existing = await prisma.eggCollection.findFirst({
    where: { id, tenantId },
    include: { trayEntry: true }
  });
  if (!existing) return false;

  // Se ja teve venda/transferencia/descarte na bandeja gerada por essa
  // coleta, nao da pra deletar a entry sem corromper EggSaleItem (Restrict)
  // ou perder historico. Nesse caso bloqueia a delecao da coleta e pede
  // pro usuario lidar com a bandeja antes.
  const entry = existing.trayEntry;
  if (entry && (entry.soldCount > 0 || entry.transferredCount > 0 || entry.discardedCount > 0)) {
    return {
      ok: false as const,
      reason: "BLOCKED_BY_TRAY_ACTIVITY" as const,
      message: "Esta coleta ja tem ovos vendidos/enviados/descartados na prateleira. Reverta as acoes na prateleira antes de excluir a coleta."
    };
  }

  await prisma.$transaction(async (tx) => {
    if (entry) {
      await tx.eggTrayEntry.delete({ where: { id: entry.id } });
    }
    await tx.eggCollection.delete({ where: { id } });
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "EGG_COLLECTION_DELETE",
      entity: "EggCollection",
      entityId: id,
      after: { trayEntryDeleted: Boolean(entry) }
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

  const [groups, rows365, rows30, matrixCounts] = await Promise.all([
    prisma.flockGroup.findMany({
      where: {
        tenantId,
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
    }),
    // Conta as fêmeas ativas reais por grupo (FEMALE + ACTIVE) — antes
    // estavamos usando flockGroup.matrixCount (campo de config) que ficava
    // em 0 e travava a barra de progresso da meta.
    prisma.bird.groupBy({
      by: ["flockGroupId"],
      where: { tenantId, sex: "FEMALE", status: "ACTIVE" },
      _count: { _all: true }
    })
  ]);

  const matrixCountByGroup = new Map<string, number>();
  for (const row of matrixCounts) {
    matrixCountByGroup.set(row.flockGroupId, row._count._all);
  }

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

    const matrixCount = matrixCountByGroup.get(group.id) ?? 0;
    const expectedPerMatrixAnnual = group.expectedLayCapacity ? Number(group.expectedLayCapacity) : 0;
    const expectedGroupAnnual = Number((expectedPerMatrixAnnual * matrixCount).toFixed(2));
    const progress = expectedGroupAnnual > 0 ? Number(((bucket.eggs365 / expectedGroupAnnual) * 100).toFixed(2)) : 0;

    let performance: "below" | "on_track" | "above" = "on_track";
    if (expectedGroupAnnual > 0 && progress < 85) performance = "below";
    if (expectedGroupAnnual > 0 && progress > 105) performance = "above";

    return {
      groupId: group.id,
      title: group.title,
      species: group.species.name,
      breed: group.breed.name,
      variety: group.variety?.name ?? null,
      matrixCount,
      expectedLayCapacity: expectedPerMatrixAnnual,
      expectedGroupAnnual,
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

