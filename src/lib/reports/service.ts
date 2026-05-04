import { BirdStatus, InfirmaryCaseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type ReportFocus = "GENERAL" | "PLANTEL" | "EGGS" | "HEALTH" | "FINANCE";
export type ReportGranularity = "EXECUTIVE" | "DETAILED" | "ANALYTICAL";
export type ReportPreset = "7d" | "30d" | "90d" | "365d" | "ytd" | "custom";

export type Trend = {
  current: number;
  previous: number;
  delta: number;
  deltaPct: number | null;
};

export type Insight = {
  severity: "info" | "warning" | "critical";
  text: string;
};

export type ReportData = {
  focus: ReportFocus;
  granularity: ReportGranularity;
  period: {
    from: string;
    to: string;
    label: string;
  };
  comparisonPeriod: { from: string; to: string; label: string } | null;
  generatedAt: string;
  kpis: {
    totalBirds: number;
    activeBirds: number;
    sickBirds: number;
    deadBirds: number;
    eggsTotal: number;
    goodEggRate: number;
    activeBatches: number;
    hatchRate: number;
    inTreatment: number;
    cureRate: number;
    monthIncome: number;
    monthExpenses: number;
    monthNet: number;
    mortalityRate: number;
    vaccinatedRate: number;
    costPerHatched: number;
    avgTicket: number;
    avgDaysToSale: number;
    totalHatched: number;
    totalSoldVitrine: number;
    totalRevenueVitrine: number;
  };
  trends: {
    eggsTotal: Trend;
    hatchRate: Trend;
    monthNet: Trend;
    monthIncome: Trend;
    monthExpenses: Trend;
    totalHatched: Trend;
    totalRevenueVitrine: Trend;
    totalSoldVitrine: Trend;
  };
  charts: {
    eggsByDay: Array<{ date: string; total: number }>;
    financeByMonth: Array<{ month: string; income: number; expenses: number; net: number }>;
    healthByMonth: Array<{ month: string; opened: number; cured: number; dead: number }>;
  };
  tables: {
    flockGroups: Array<{
      title: string;
      species: string;
      breed: string;
      variety: string | null;
      totalBirds: number;
      active: number;
      sick: number;
      dead: number;
    }>;
    incubatorBatches: Array<{
      incubator: string;
      group: string;
      eggsSet: number;
      hatched: number;
      infertile: number;
      hatchRate: number;
    }>;
    topDiagnoses: Array<{ diagnosis: string; count: number }>;
    eggCollectionsByGroup: Array<{
      group: string;
      total: number;
      good: number;
      cracked: number;
      goodRate: number;
    }>;
    vitrineSnapshot: Array<{
      group: string;
      title: string;
      ageMonths: number;
      available: number;
      currentPrice: number | null;
      stockValue: number;
    }>;
    vitrineSales: {
      totalSold: number;
      totalRevenue: number;
      byGroup: Array<{ group: string; sold: number; revenue: number }>;
    };
    quarantineCases: Array<{
      ringNumber: string;
      group: string;
      infirmary: string;
      entryDate: string;
      expectedExitDate: string;
      status: string;
      treatmentsCount: number;
    }>;
    newBirds: Array<{
      ringNumber: string;
      group: string;
      sex: "FEMALE" | "MALE" | "UNKNOWN";
      acquisitionDate: string;
      origin: string | null;
      purchaseValue: number | null;
    }>;
    topReproducers: Array<{ group: string; daughters: number; matrices: number; productivity: number }>;
    bestHatching: Array<{ incubator: string; group: string; hatched: number; hatchRate: number; eggsSet: number }>;
    worstHatching: Array<{ incubator: string; group: string; hatched: number; hatchRate: number; eggsSet: number }>;
    bestPosture: Array<{ group: string; total: number; goodRate: number }>;
    worstPosture: Array<{ group: string; total: number; goodRate: number }>;
  };
  insights: Insight[];
  conclusion: string;
};

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
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function ratio(num: number, den: number) {
  if (!den) return 0;
  return Number(((num / den) * 100).toFixed(2));
}

function toNumber(value: { toString(): string } | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

function makeTrend(current: number, previous: number): Trend {
  const delta = Number((current - previous).toFixed(2));
  const deltaPct = previous === 0 ? null : Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
  return { current, previous, delta, deltaPct };
}

export function resolvePeriod(preset: ReportPreset, from?: string, to?: string) {
  const today = startOfDay(new Date());

  if (preset === "custom") {
    const safeFrom = from ? startOfDay(new Date(`${from}T00:00:00`)) : addDays(today, -29);
    const safeTo = to ? startOfDay(new Date(`${to}T00:00:00`)) : today;
    return {
      from: safeFrom,
      to: addDays(safeTo, 1),
      label: `${isoDate(safeFrom)} a ${isoDate(safeTo)}`
    };
  }

  if (preset === "ytd") {
    const yearStart = new Date(today.getFullYear(), 0, 1);
    return {
      from: yearStart,
      to: addDays(today, 1),
      label: `${isoDate(yearStart)} a ${isoDate(today)}`
    };
  }

  const delta = preset === "7d" ? 6 : preset === "30d" ? 29 : preset === "90d" ? 89 : 364;
  const periodFrom = addDays(today, -delta);

  return {
    from: periodFrom,
    to: addDays(today, 1),
    label: `${isoDate(periodFrom)} a ${isoDate(today)}`
  };
}

function previousPeriod(period: { from: Date; to: Date }) {
  const ms = period.to.getTime() - period.from.getTime();
  const prevTo = new Date(period.from.getTime());
  const prevFrom = new Date(period.from.getTime() - ms);
  return {
    from: prevFrom,
    to: prevTo,
    label: `${isoDate(prevFrom)} a ${isoDate(addDays(prevTo, -1))}`
  };
}

type PeriodAggregates = {
  eggsTotal: number;
  hatched: number;
  eggsSet: number;
  hatchRate: number;
  income: number;
  expenses: number;
  net: number;
  vitrineSold: number;
  vitrineRevenue: number;
};

async function loadPeriodAggregates(
  tenantId: string,
  period: { from: Date; to: Date }
): Promise<PeriodAggregates> {
  const [eggRows, batchEvents, batches, entries, expenses, vitrineSales] = await Promise.all([
    prisma.eggCollection.findMany({
      where: { tenantId, date: { gte: period.from, lt: period.to } },
      select: { totalEggs: true }
    }),
    prisma.incubatorBatchEvent.findMany({
      where: { tenantId, eventDate: { gte: period.from, lt: period.to }, type: "HATCHED" },
      select: { quantity: true }
    }),
    prisma.incubatorBatch.findMany({
      where: { tenantId, entryDate: { gte: period.from, lt: period.to } },
      select: { eggsSet: true }
    }),
    prisma.financialEntry.findMany({
      where: { tenantId, date: { gte: period.from, lt: period.to } },
      select: { amount: true }
    }),
    prisma.financialExpense.findMany({
      where: { tenantId, date: { gte: period.from, lt: period.to } },
      select: { amount: true }
    }),
    prisma.vitrineSale.findMany({
      where: { tenantId, soldAt: { gte: period.from, lt: period.to } },
      select: { quantitySold: true, totalPrice: true }
    })
  ]);

  const eggsTotal = eggRows.reduce((sum, r) => sum + r.totalEggs, 0);
  const hatched = batchEvents.reduce((sum, e) => sum + e.quantity, 0);
  const eggsSet = batches.reduce((sum, b) => sum + b.eggsSet, 0);
  const income = Number(entries.reduce((s, e) => s + toNumber(e.amount), 0).toFixed(2));
  const expenseTotal = Number(expenses.reduce((s, e) => s + toNumber(e.amount), 0).toFixed(2));
  const net = Number((income - expenseTotal).toFixed(2));
  const vitrineSold = vitrineSales.reduce((s, v) => s + v.quantitySold, 0);
  const vitrineRevenue = Number(
    vitrineSales.reduce((s, v) => s + toNumber(v.totalPrice), 0).toFixed(2)
  );

  return {
    eggsTotal,
    hatched,
    eggsSet,
    hatchRate: ratio(hatched, eggsSet),
    income,
    expenses: expenseTotal,
    net,
    vitrineSold,
    vitrineRevenue
  };
}

export async function getReportData(
  tenantId: string,
  options: { focus: ReportFocus; granularity: ReportGranularity },
  period: { from: Date; to: Date; label: string }
): Promise<ReportData> {
  const prev = previousPeriod(period);

  const [
    birds,
    groups,
    eggRows,
    eggRowsDetailed,
    batches,
    healthCases,
    entries,
    expenses,
    vitrineListings,
    vitrineSales,
    quarantineCases,
    newBirdsRaw,
    feedAndMedExpenses,
    vaccinatedAliveCount,
    aliveBirdsCount,
    hatchedEventsForReproducers,
    prevAggregates
  ] = await Promise.all([
    prisma.bird.findMany({ where: { tenantId }, select: { status: true, flockGroupId: true } }),
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
      include: {
        species: { select: { name: true } },
        breed: { select: { name: true } },
        variety: { select: { name: true } },
        birds: { select: { status: true, sex: true } }
      }
    }),
    prisma.eggCollection.findMany({
      where: { tenantId, date: { gte: period.from, lt: period.to } },
      select: { date: true, totalEggs: true, goodEggs: true }
    }),
    prisma.eggCollection.findMany({
      where: { tenantId, date: { gte: period.from, lt: period.to } },
      select: {
        totalEggs: true,
        goodEggs: true,
        crackedEggs: true,
        flockGroup: { select: { title: true } }
      }
    }),
    prisma.incubatorBatch.findMany({
      where: { tenantId, entryDate: { gte: period.from, lt: period.to } },
      include: {
        incubator: { select: { name: true } },
        flockGroup: { select: { title: true } },
        events: true
      }
    }),
    prisma.infirmaryCase.findMany({
      where: { tenantId, openedAt: { gte: period.from, lt: period.to } },
      select: { openedAt: true, status: true, diagnosis: true }
    }),
    prisma.financialEntry.findMany({
      where: { tenantId, date: { gte: period.from, lt: period.to } },
      select: { date: true, amount: true }
    }),
    prisma.financialExpense.findMany({
      where: { tenantId, date: { gte: period.from, lt: period.to } },
      select: { date: true, amount: true, category: true }
    }),
    prisma.vitrineListing.findMany({
      where: { tenantId, status: "AVAILABLE", availableQuantity: { gt: 0 } },
      include: {
        flockGroup: { select: { title: true } },
        sourceIncubatorBatch: { select: { flockGroup: { select: { title: true } } } }
      }
    }),
    prisma.vitrineSale.findMany({
      where: { tenantId, soldAt: { gte: period.from, lt: period.to } },
      include: {
        listing: {
          include: {
            flockGroup: { select: { title: true } },
            sourceIncubatorBatch: { select: { flockGroup: { select: { title: true } } } }
          }
        }
      }
    }),
    prisma.quarantineCase.findMany({
      where: {
        tenantId,
        OR: [{ status: "ACTIVE" }, { entryDate: { gte: period.from, lt: period.to } }]
      },
      include: {
        bird: {
          select: { ringNumber: true, flockGroup: { select: { title: true } } }
        },
        infirmary: { select: { name: true } },
        treatments: { select: { id: true } }
      },
      orderBy: { entryDate: "desc" }
    }),
    prisma.bird.findMany({
      where: {
        tenantId,
        acquisitionDate: { gte: period.from, lt: period.to }
      },
      select: {
        ringNumber: true,
        sex: true,
        acquisitionDate: true,
        origin: true,
        purchaseValue: true,
        flockGroup: { select: { title: true } }
      },
      orderBy: { acquisitionDate: "desc" }
    }),
    prisma.financialExpense.findMany({
      where: {
        tenantId,
        date: { gte: period.from, lt: period.to },
        category: { in: ["FEED", "MEDICATION"] }
      },
      select: { amount: true }
    }),
    prisma.bird.count({
      where: {
        tenantId,
        status: { not: "DEAD" },
        vaccinations: { some: {} }
      }
    }),
    prisma.bird.count({
      where: { tenantId, status: { not: "DEAD" } }
    }),
    prisma.incubatorBatchEvent.findMany({
      where: { tenantId, type: "HATCHED", eventDate: { gte: period.from, lt: period.to } },
      select: {
        quantity: true,
        batch: {
          select: {
            flockGroup: {
              select: { id: true, title: true }
            }
          }
        }
      }
    }),
    loadPeriodAggregates(tenantId, prev)
  ]);

  const totalBirds = birds.length;
  const activeBirds = birds.filter((b) => b.status === BirdStatus.ACTIVE).length;
  const sickBirds = birds.filter((b) => b.status === BirdStatus.SICK).length;
  const deadBirds = birds.filter((b) => b.status === BirdStatus.DEAD).length;

  const eggsTotal = eggRows.reduce((sum, row) => sum + row.totalEggs, 0);
  const eggsGood = eggRows.reduce((sum, row) => sum + row.goodEggs, 0);

  const activeBatches = batches.filter((b) => b.status === "ACTIVE").length;
  const batchHatched = batches
    .flatMap((b) => b.events)
    .filter((e) => e.type === "HATCHED")
    .reduce((sum, e) => sum + e.quantity, 0);
  const eggsSet = batches.reduce((sum, b) => sum + b.eggsSet, 0);
  const hatchRate = ratio(batchHatched, eggsSet);

  const inTreatment = healthCases.filter((c) => c.status === InfirmaryCaseStatus.TREATING).length;
  const cured = healthCases.filter((c) => c.status === InfirmaryCaseStatus.CURED).length;
  const deadInHealth = healthCases.filter((c) => c.status === InfirmaryCaseStatus.DEAD).length;

  const monthIncome = Number(entries.reduce((sum, e) => sum + toNumber(e.amount), 0).toFixed(2));
  const monthExpenses = Number(expenses.reduce((sum, e) => sum + toNumber(e.amount), 0).toFixed(2));
  const monthNet = Number((monthIncome - monthExpenses).toFixed(2));

  // KPIs derivados
  const mortalityRate = ratio(deadBirds, totalBirds);
  const vaccinatedRate = ratio(vaccinatedAliveCount, aliveBirdsCount);
  const feedAndMedTotal = feedAndMedExpenses.reduce((s, e) => s + toNumber(e.amount), 0);
  const costPerHatched = batchHatched > 0 ? Number((feedAndMedTotal / batchHatched).toFixed(2)) : 0;

  const totalSoldVitrine = vitrineSales.reduce((s, v) => s + v.quantitySold, 0);
  const totalRevenueVitrine = Number(
    vitrineSales.reduce((s, v) => s + toNumber(v.totalPrice), 0).toFixed(2)
  );
  const avgTicket = totalSoldVitrine > 0 ? Number((totalRevenueVitrine / totalSoldVitrine).toFixed(2)) : 0;

  const daysSpan = vitrineSales
    .map((s) => {
      if (!s.listing?.birthDate || !s.soldAt) return null;
      const diff = new Date(s.soldAt).getTime() - new Date(s.listing.birthDate).getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      return days >= 0 ? days : null;
    })
    .filter((v): v is number => v !== null);
  const avgDaysToSale =
    daysSpan.length > 0 ? Math.round(daysSpan.reduce((s, d) => s + d, 0) / daysSpan.length) : 0;

  // Charts
  const eggsByDayMap = new Map<string, number>();
  for (const row of eggRows) {
    const key = isoDate(row.date);
    eggsByDayMap.set(key, (eggsByDayMap.get(key) ?? 0) + row.totalEggs);
  }
  const eggsByDay = Array.from(eggsByDayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, total]) => ({ date, total }));

  const financeMonthMap = new Map<string, { income: number; expenses: number }>();
  for (const row of entries) {
    const key = monthKey(row.date);
    const bucket = financeMonthMap.get(key) ?? { income: 0, expenses: 0 };
    bucket.income += toNumber(row.amount);
    financeMonthMap.set(key, bucket);
  }
  for (const row of expenses) {
    const key = monthKey(row.date);
    const bucket = financeMonthMap.get(key) ?? { income: 0, expenses: 0 };
    bucket.expenses += toNumber(row.amount);
    financeMonthMap.set(key, bucket);
  }
  const financeByMonth = Array.from(financeMonthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, value]) => ({
      month,
      income: Number(value.income.toFixed(2)),
      expenses: Number(value.expenses.toFixed(2)),
      net: Number((value.income - value.expenses).toFixed(2))
    }));

  const healthMonthMap = new Map<string, { opened: number; cured: number; dead: number }>();
  for (const row of healthCases) {
    const key = monthKey(row.openedAt);
    const bucket = healthMonthMap.get(key) ?? { opened: 0, cured: 0, dead: 0 };
    bucket.opened += 1;
    if (row.status === InfirmaryCaseStatus.CURED) bucket.cured += 1;
    if (row.status === InfirmaryCaseStatus.DEAD) bucket.dead += 1;
    healthMonthMap.set(key, bucket);
  }
  const healthByMonth = Array.from(healthMonthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, value]) => ({ month, ...value }));

  const diagnosisMap = new Map<string, number>();
  for (const row of healthCases) {
    const key = row.diagnosis?.trim() || "Nao informado";
    diagnosisMap.set(key, (diagnosisMap.get(key) ?? 0) + 1);
  }
  const topDiagnoses = Array.from(diagnosisMap.entries())
    .map(([diagnosis, count]) => ({ diagnosis, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const flockGroups = groups.map((group) => {
    const all = group.birds;
    return {
      title: group.title,
      species: group.species?.name ?? "—",
      breed: group.breed?.name ?? "—",
      variety: group.variety?.name ?? null,
      totalBirds: all.length,
      active: all.filter((b) => b.status === BirdStatus.ACTIVE).length,
      sick: all.filter((b) => b.status === BirdStatus.SICK).length,
      dead: all.filter((b) => b.status === BirdStatus.DEAD).length
    };
  });

  const incubatorBatches = batches.map((batch) => {
    const hatched = batch.events.filter((e) => e.type === "HATCHED").reduce((sum, e) => sum + e.quantity, 0);
    const infertile = batch.events.filter((e) => e.type === "INFERTILE").reduce((sum, e) => sum + e.quantity, 0);
    return {
      incubator: batch.incubator?.name ?? "—",
      group: batch.flockGroup?.title ?? "—",
      eggsSet: batch.eggsSet,
      hatched,
      infertile,
      hatchRate: ratio(hatched, batch.eggsSet)
    };
  });

  const eggsByGroupMap = new Map<string, { total: number; good: number; cracked: number }>();
  for (const c of eggRowsDetailed) {
    const key = c.flockGroup?.title ?? "—";
    const prev = eggsByGroupMap.get(key) ?? { total: 0, good: 0, cracked: 0 };
    eggsByGroupMap.set(key, {
      total: prev.total + (c.totalEggs ?? 0),
      good: prev.good + (c.goodEggs ?? 0),
      cracked: prev.cracked + (c.crackedEggs ?? 0)
    });
  }
  const eggCollectionsByGroup = Array.from(eggsByGroupMap.entries())
    .map(([group, v]) => ({
      group,
      total: v.total,
      good: v.good,
      cracked: v.cracked,
      goodRate: ratio(v.good, v.total)
    }))
    .sort((a, b) => b.total - a.total);

  const vitrineSnapshot = vitrineListings
    .map((l) => {
      const ageMonths = Math.max(
        0,
        Math.floor((Date.now() - new Date(l.birthDate).getTime()) / (30 * 24 * 60 * 60 * 1000))
      );
      const price = l.priceOverride !== null && l.priceOverride !== undefined ? Number(l.priceOverride) : null;
      const stockValue = price !== null ? Number((price * l.availableQuantity).toFixed(2)) : 0;
      const groupLabel =
        l.sourceIncubatorBatch?.flockGroup?.title ?? l.flockGroup?.title ?? "—";
      return {
        group: groupLabel,
        title: l.title?.trim() || groupLabel,
        ageMonths,
        available: l.availableQuantity,
        currentPrice: price,
        stockValue
      };
    })
    .sort((a, b) => b.available - a.available);

  const vitrineSalesByGroupMap = new Map<string, { sold: number; revenue: number }>();
  for (const s of vitrineSales) {
    const groupLabel =
      s.listing?.sourceIncubatorBatch?.flockGroup?.title ?? s.listing?.flockGroup?.title ?? "—";
    const prev = vitrineSalesByGroupMap.get(groupLabel) ?? { sold: 0, revenue: 0 };
    const revenue = toNumber(s.totalPrice);
    vitrineSalesByGroupMap.set(groupLabel, {
      sold: prev.sold + s.quantitySold,
      revenue: prev.revenue + revenue
    });
  }
  const vitrineSalesPayload = {
    totalSold: totalSoldVitrine,
    totalRevenue: totalRevenueVitrine,
    byGroup: Array.from(vitrineSalesByGroupMap.entries())
      .map(([group, v]) => ({ group, sold: v.sold, revenue: Number(v.revenue.toFixed(2)) }))
      .sort((a, b) => b.revenue - a.revenue)
  };

  const quarantineCasesPayload = quarantineCases.map((q) => ({
    ringNumber: q.bird?.ringNumber ?? "—",
    group: q.bird?.flockGroup?.title ?? "—",
    infirmary: q.infirmary?.name ?? "—",
    entryDate: isoDate(q.entryDate),
    expectedExitDate: isoDate(q.expectedExitDate),
    status: q.status,
    treatmentsCount: q.treatments?.length ?? 0
  }));

  const newBirdsPayload = newBirdsRaw.map((b) => ({
    ringNumber: b.ringNumber,
    group: b.flockGroup?.title ?? "—",
    sex: b.sex,
    acquisitionDate: isoDate(b.acquisitionDate ?? new Date()),
    origin: b.origin ?? null,
    purchaseValue: b.purchaseValue ? Number(b.purchaseValue) : null
  }));

  // Top reprodutores: agrupa eventos HATCHED por flockGroup pai
  const reproducerMap = new Map<string, { groupTitle: string; daughters: number }>();
  for (const ev of hatchedEventsForReproducers) {
    const fg = ev.batch?.flockGroup;
    if (!fg?.id) continue;
    const prev = reproducerMap.get(fg.id) ?? { groupTitle: fg.title, daughters: 0 };
    prev.daughters += ev.quantity;
    reproducerMap.set(fg.id, prev);
  }
  const matricesByGroupId = new Map<string, number>();
  for (const g of groups) {
    matricesByGroupId.set(
      g.id,
      g.birds.filter((b) => b.sex === "FEMALE" && b.status !== BirdStatus.DEAD).length
    );
  }
  const topReproducers = Array.from(reproducerMap.entries())
    .map(([id, v]) => {
      const matrices = matricesByGroupId.get(id) ?? 0;
      const productivity = matrices > 0 ? Number((v.daughters / matrices).toFixed(2)) : v.daughters;
      return { group: v.groupTitle, daughters: v.daughters, matrices, productivity };
    })
    .sort((a, b) => b.daughters - a.daughters)
    .slice(0, 5);

  // Best/Worst hatching: ranqueia chocadeiras com pelo menos 5 ovos
  const rankableBatches = incubatorBatches
    .filter((b) => b.eggsSet >= 5)
    .map((b) => ({ ...b }));
  const bestHatching = [...rankableBatches]
    .sort((a, b) => b.hatchRate - a.hatchRate)
    .slice(0, 5);
  const worstHatching = [...rankableBatches]
    .sort((a, b) => a.hatchRate - b.hatchRate)
    .slice(0, 5);

  // Best/Worst postura: rankeia grupos com pelo menos 1 coleta
  const posturaRanked = eggCollectionsByGroup.filter((e) => e.total > 0);
  const bestPosture = [...posturaRanked].sort((a, b) => b.total - a.total).slice(0, 5);
  const worstPosture = [...posturaRanked].sort((a, b) => a.total - b.total).slice(0, 5);

  // Trends vs período anterior
  const trends = {
    eggsTotal: makeTrend(eggsTotal, prevAggregates.eggsTotal),
    hatchRate: makeTrend(hatchRate, prevAggregates.hatchRate),
    monthNet: makeTrend(monthNet, prevAggregates.net),
    monthIncome: makeTrend(monthIncome, prevAggregates.income),
    monthExpenses: makeTrend(monthExpenses, prevAggregates.expenses),
    totalHatched: makeTrend(batchHatched, prevAggregates.hatched),
    totalRevenueVitrine: makeTrend(totalRevenueVitrine, prevAggregates.vitrineRevenue),
    totalSoldVitrine: makeTrend(totalSoldVitrine, prevAggregates.vitrineSold)
  };

  // Insights acionaveis
  const insights: Insight[] = [];
  if (monthNet < 0) {
    insights.push({
      severity: "critical",
      text: `Resultado financeiro negativo de R$ ${Math.abs(monthNet).toFixed(2)}. Revisar custos e perdas biológicas.`
    });
  }
  if (mortalityRate > 5) {
    insights.push({
      severity: "warning",
      text: `Mortalidade de ${mortalityRate.toFixed(1)}% acima do limite seguro de 5% — investigar causas no plantel.`
    });
  }
  if (eggsSet >= 10 && hatchRate < 50) {
    insights.push({
      severity: "warning",
      text: `Taxa de eclosão de ${hatchRate.toFixed(1)}% está baixa (referência 65%+). Verificar temperatura/umidade das chocadeiras.`
    });
  }
  if (aliveBirdsCount > 0 && vaccinatedRate < 80) {
    insights.push({
      severity: "info",
      text: `${(100 - vaccinatedRate).toFixed(0)}% das aves vivas sem vacinação registrada. Aves vacinadas valorizam mais para venda.`
    });
  }
  if (eggsTotal > 0 && eggCollectionsByGroup.some((g) => g.goodRate < 80)) {
    const worstGood = eggCollectionsByGroup
      .filter((g) => g.total >= 10)
      .sort((a, b) => a.goodRate - b.goodRate)[0];
    if (worstGood) {
      insights.push({
        severity: "warning",
        text: `Grupo "${worstGood.group}" com ${worstGood.goodRate.toFixed(1)}% ovos bons — revisar manejo de ninhos.`
      });
    }
  }
  const noPriceCount = vitrineListings.filter((l) => l.priceOverride === null || l.priceOverride === undefined).length;
  if (noPriceCount > 0) {
    insights.push({
      severity: "warning",
      text: `${noPriceCount} ${noPriceCount === 1 ? "anúncio" : "anúncios"} na vitrine sem preço cadastrado.`
    });
  }
  if (batchHatched > 0 && costPerHatched > 0) {
    insights.push({
      severity: "info",
      text: `Custo médio por filhote produzido: R$ ${costPerHatched.toFixed(2)} (ração + medicamentos no período).`
    });
  }
  if (bestPosture.length > 0 && worstPosture.length > 0 && bestPosture[0].total > 2 * worstPosture[0].total) {
    insights.push({
      severity: "info",
      text: `Lote "${bestPosture[0].group}" produziu ${Math.round(bestPosture[0].total / Math.max(1, worstPosture[0].total))}x mais ovos que "${worstPosture[0].group}".`
    });
  }
  if (trends.monthNet.deltaPct !== null && trends.monthNet.deltaPct < -20) {
    insights.push({
      severity: "warning",
      text: `Resultado caiu ${Math.abs(trends.monthNet.deltaPct).toFixed(0)}% vs período anterior — analisar causa.`
    });
  }
  if (trends.monthNet.deltaPct !== null && trends.monthNet.deltaPct > 20) {
    insights.push({
      severity: "info",
      text: `Resultado cresceu ${trends.monthNet.deltaPct.toFixed(0)}% vs período anterior. Manter o ritmo.`
    });
  }
  if (insights.length === 0) {
    insights.push({ severity: "info", text: "Nenhum alerta detectado no período. Operação saudável." });
  }

  const conclusion =
    monthNet >= 0
      ? `Periodo com resultado positivo de R$ ${monthNet.toFixed(2)} e taxa de eclosao de ${hatchRate.toFixed(2)}%.`
      : `Periodo com resultado negativo de R$ ${Math.abs(monthNet).toFixed(2)}. Recomendado revisar custos e perdas biologicas.`;

  return {
    focus: options.focus,
    granularity: options.granularity,
    period: {
      from: isoDate(period.from),
      to: isoDate(addDays(period.to, -1)),
      label: period.label
    },
    comparisonPeriod: {
      from: isoDate(prev.from),
      to: isoDate(addDays(prev.to, -1)),
      label: prev.label
    },
    generatedAt: new Date().toISOString(),
    kpis: {
      totalBirds,
      activeBirds,
      sickBirds,
      deadBirds,
      eggsTotal,
      goodEggRate: ratio(eggsGood, eggsTotal),
      activeBatches,
      hatchRate,
      inTreatment,
      cureRate: ratio(cured, cured + deadInHealth),
      monthIncome,
      monthExpenses,
      monthNet,
      mortalityRate,
      vaccinatedRate,
      costPerHatched,
      avgTicket,
      avgDaysToSale,
      totalHatched: batchHatched,
      totalSoldVitrine,
      totalRevenueVitrine
    },
    trends,
    charts: {
      eggsByDay,
      financeByMonth,
      healthByMonth
    },
    tables: {
      flockGroups,
      incubatorBatches,
      topDiagnoses,
      eggCollectionsByGroup,
      vitrineSnapshot,
      vitrineSales: vitrineSalesPayload,
      quarantineCases: quarantineCasesPayload,
      newBirds: newBirdsPayload,
      topReproducers,
      bestHatching,
      worstHatching,
      bestPosture,
      worstPosture
    },
    insights,
    conclusion
  };
}
