import { BirdStatus, InfirmaryCaseStatus, ReportType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type ReportPreset = "7d" | "30d" | "365d" | "custom";

export type ReportData = {
  reportType: ReportType;
  period: {
    from: string;
    to: string;
    label: string;
  };
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
  };
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

  const delta = preset === "7d" ? 6 : preset === "30d" ? 29 : 364;
  const periodFrom = addDays(today, -delta);

  return {
    from: periodFrom,
    to: addDays(today, 1),
    label: `${isoDate(periodFrom)} a ${isoDate(today)}`
  };
}

export async function getReportData(
  tenantId: string,
  reportType: ReportType,
  period: { from: Date; to: Date; label: string }
): Promise<ReportData> {
  const [birds, groups, eggRows, batches, healthCases, entries, expenses] = await Promise.all([
    prisma.bird.findMany({ where: { tenantId }, select: { status: true, flockGroupId: true } }),
    prisma.flockGroup.findMany({
      where: { tenantId },
      include: {
        species: { select: { name: true } },
        breed: { select: { name: true } },
        variety: { select: { name: true } },
        birds: { select: { status: true } }
      }
    }),
    prisma.eggCollection.findMany({
      where: { tenantId, date: { gte: period.from, lt: period.to } },
      select: { date: true, totalEggs: true, goodEggs: true }
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
      select: { date: true, amount: true }
    })
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

  const inTreatment = healthCases.filter((c) => c.status === InfirmaryCaseStatus.TREATING).length;
  const cured = healthCases.filter((c) => c.status === InfirmaryCaseStatus.CURED).length;
  const deadInHealth = healthCases.filter((c) => c.status === InfirmaryCaseStatus.DEAD).length;

  const monthIncome = Number(entries.reduce((sum, e) => sum + toNumber(e.amount), 0).toFixed(2));
  const monthExpenses = Number(expenses.reduce((sum, e) => sum + toNumber(e.amount), 0).toFixed(2));
  const monthNet = Number((monthIncome - monthExpenses).toFixed(2));

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
      species: group.species.name,
      breed: group.breed.name,
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
      incubator: batch.incubator.name,
      group: batch.flockGroup.title,
      eggsSet: batch.eggsSet,
      hatched,
      infertile,
      hatchRate: ratio(hatched, batch.eggsSet)
    };
  });

  const conclusion =
    monthNet >= 0
      ? `Periodo com resultado positivo de ${monthNet.toFixed(2)} e taxa de eclosao de ${ratio(batchHatched, eggsSet).toFixed(2)}%.`
      : `Periodo com resultado negativo de ${monthNet.toFixed(2)}. Recomendado revisar custos e perdas biologicas.`;

  return {
    reportType,
    period: {
      from: isoDate(period.from),
      to: isoDate(addDays(period.to, -1)),
      label: period.label
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
      hatchRate: ratio(batchHatched, eggsSet),
      inTreatment,
      cureRate: ratio(cured, cured + deadInHealth),
      monthIncome,
      monthExpenses,
      monthNet
    },
    charts: {
      eggsByDay,
      financeByMonth,
      healthByMonth
    },
    tables: {
      flockGroups,
      incubatorBatches,
      topDiagnoses
    },
    conclusion
  };
}
