import { BirdStatus, InfirmaryCaseStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type DashboardData = {
  kpis: {
    totalBirds: number;
    activeBirds: number;
    flockGroups: number;
    sickBirds: number;
    deadBirds: number;
    broodyBirds: number;
    matrixBirds: number;
    reproducerBirds: number;
    eggsToday: number;
    goodEggsToday: number;
    crackedEggsToday: number;
    goodEggRateToday: number;
    activeBatches: number;
    hatchRate: number;
    infertilityRate: number;
    birdsInInfirmary: number;
    recoveryRate: number;
    monthIncome: number;
    monthExpenses: number;
    monthNet: number;
  };
  periodSummary: {
    days7: { eggs: number; net: number; healthCases: number };
    days30: { eggs: number; net: number; healthCases: number };
    days365: { eggs: number; net: number; healthCases: number };
  };
  charts: {
    eggCollection: Array<{ label: string; total: number }>;
    aviaryGrowth: Array<{ label: string; arrivals: number }>;
    incubatorPerformance: Array<{ label: string; hatchRate: number }>;
    financialEvolution: Array<{ label: string; income: number; expenses: number; net: number }>;
    healthEvolution: Array<{ label: string; openCases: number; curedCases: number }>;
  };
  warning?: string;
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

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatDayLabel(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)}`;
}

function toNumber(decimal: Prisma.Decimal | number | null | undefined) {
  if (decimal === null || decimal === undefined) return 0;
  if (typeof decimal === "number") return decimal;
  return Number(decimal.toString());
}

function ratio(num: number, den: number) {
  if (!den) return 0;
  return Number(((num / den) * 100).toFixed(2));
}

async function sumEggsForRange(tenantId: string, from: Date) {
  const result = await prisma.eggCollection.aggregate({
    where: { tenantId, date: { gte: from } },
    _sum: { totalEggs: true }
  });
  return result._sum.totalEggs ?? 0;
}

async function netForRange(tenantId: string, from: Date) {
  const [income, expenses] = await Promise.all([
    prisma.financialEntry.aggregate({
      where: { tenantId, date: { gte: from } },
      _sum: { amount: true }
    }),
    prisma.financialExpense.aggregate({
      where: { tenantId, date: { gte: from } },
      _sum: { amount: true }
    })
  ]);

  const incomeValue = toNumber(income._sum.amount);
  const expensesValue = toNumber(expenses._sum.amount);
  return Number((incomeValue - expensesValue).toFixed(2));
}

async function healthCasesForRange(tenantId: string, from: Date) {
  const count = await prisma.infirmaryCase.count({
    where: { tenantId, openedAt: { gte: from } }
  });
  return count;
}

function dateBucketLastDays(days: number) {
  const today = startOfDay(new Date());
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(today, index - (days - 1));
    const key = startOfDay(date).toISOString();
    return { key, date, label: formatDayLabel(date) };
  });
}

function monthBucketLastMonths(months: number) {
  const now = new Date();
  return Array.from({ length: months }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (months - 1) + index, 1);
    const key = monthDate.toISOString();
    return { key, date: monthDate, label: formatMonthLabel(monthDate) };
  });
}

export async function getDashboardData(tenantId: string): Promise<DashboardData> {
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const monthStart = startOfMonth(now);
  const days7 = addDays(today, -6);
  const days30 = addDays(today, -29);
  const days365 = addDays(today, -364);

  const [
    totalBirds,
    activeBirds,
    flockGroups,
    sickBirds,
    deadBirds,
    broodyBirds,
    matrixBirds,
    reproducerBirds,
    eggsTodayAgg,
    activeBatches,
    batchEvents,
    treatingCases,
    caseStatusAgg,
    monthIncomeAgg,
    monthExpensesAgg,
    eggsLast30,
    entriesLast12,
    expensesLast12,
    healthOpenLast12,
    healthCuredLast12,
    birdsLast12Rows
  ] = await Promise.all([
    prisma.bird.count({ where: { tenantId } }),
    prisma.bird.count({ where: { tenantId, status: BirdStatus.ACTIVE } }),
    prisma.flockGroup.count({ where: { tenantId } }),
    prisma.bird.count({ where: { tenantId, status: BirdStatus.SICK } }),
    prisma.bird.count({ where: { tenantId, status: BirdStatus.DEAD } }),
    prisma.bird.count({ where: { tenantId, status: BirdStatus.BROODY } }),
    prisma.bird.count({ where: { tenantId, sex: "FEMALE", status: BirdStatus.ACTIVE } }),
    prisma.bird.count({ where: { tenantId, sex: "MALE", status: BirdStatus.ACTIVE } }),
    prisma.eggCollection.aggregate({
      where: { tenantId, date: { gte: today, lt: tomorrow } },
      _sum: { totalEggs: true, goodEggs: true, crackedEggs: true }
    }),
    prisma.incubatorBatch.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.incubatorBatchEvent.findMany({
      where: { tenantId },
      select: { type: true, quantity: true }
    }),
    prisma.infirmaryCase.count({
      where: { tenantId, status: InfirmaryCaseStatus.TREATING }
    }),
    prisma.infirmaryCase.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: { _all: true }
    }),
    prisma.financialEntry.aggregate({
      where: { tenantId, date: { gte: monthStart } },
      _sum: { amount: true }
    }),
    prisma.financialExpense.aggregate({
      where: { tenantId, date: { gte: monthStart } },
      _sum: { amount: true }
    }),
    prisma.eggCollection.findMany({
      where: { tenantId, date: { gte: days30 } },
      select: { date: true, totalEggs: true, goodEggs: true }
    }),
    prisma.financialEntry.findMany({
      where: { tenantId, date: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } },
      select: { date: true, amount: true }
    }),
    prisma.financialExpense.findMany({
      where: { tenantId, date: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } },
      select: { date: true, amount: true }
    }),
    prisma.infirmaryCase.findMany({
      where: { tenantId, openedAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } },
      select: { openedAt: true }
    }),
    prisma.infirmaryCase.findMany({
      where: {
        tenantId,
        status: InfirmaryCaseStatus.CURED,
        closedAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) }
      },
      select: { closedAt: true }
    }),
    prisma.bird.findMany({
      where: {
        tenantId,
        OR: [
          { acquisitionDate: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } },
          { createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } }
        ]
      },
      select: { acquisitionDate: true, createdAt: true }
    })
  ]);

  const eggsToday = eggsTodayAgg._sum.totalEggs ?? 0;
  const goodEggsToday = eggsTodayAgg._sum.goodEggs ?? 0;
  const crackedEggsToday = eggsTodayAgg._sum.crackedEggs ?? 0;

  const hatchCount = batchEvents
    .filter((e) => e.type === "HATCHED")
    .reduce((sum, event) => sum + event.quantity, 0);
  const infertileCount = batchEvents
    .filter((e) => e.type === "INFERTILE")
    .reduce((sum, event) => sum + event.quantity, 0);
  const incubationTotal = batchEvents
    .filter((e) => ["HATCHED", "INFERTILE", "EMBRYO_LOSS", "PIPPED_DIED"].includes(e.type))
    .reduce((sum, event) => sum + event.quantity, 0);

  const statusMap = Object.fromEntries(
    caseStatusAgg.map((entry) => [entry.status, entry._count._all])
  );
  const curedCases = Number(statusMap.CURED ?? 0);
  const deadCases = Number(statusMap.DEAD ?? 0);
  const closedCases = curedCases + deadCases;

  const monthIncome = toNumber(monthIncomeAgg._sum.amount);
  const monthExpenses = toNumber(monthExpensesAgg._sum.amount);
  const monthNet = Number((monthIncome - monthExpenses).toFixed(2));

  const dayBuckets = dateBucketLastDays(30);
  const eggsByDayMap = new Map<string, { total: number; good: number }>();
  for (const row of eggsLast30) {
    const key = startOfDay(row.date).toISOString();
    const prev = eggsByDayMap.get(key) ?? { total: 0, good: 0 };
    eggsByDayMap.set(key, {
      total: prev.total + row.totalEggs,
      good: prev.good + row.goodEggs
    });
  }

  const eggCollection = dayBuckets.map((bucket) => ({
    label: bucket.label,
    total: eggsByDayMap.get(bucket.key)?.total ?? 0
  }));

  const monthBuckets = monthBucketLastMonths(12);
  const financialMap = new Map<string, { income: number; expenses: number }>();

  for (const row of entriesLast12) {
    const keyDate = new Date(row.date.getFullYear(), row.date.getMonth(), 1).toISOString();
    const prev = financialMap.get(keyDate) ?? { income: 0, expenses: 0 };
    financialMap.set(keyDate, {
      income: prev.income + toNumber(row.amount),
      expenses: prev.expenses
    });
  }

  for (const row of expensesLast12) {
    const keyDate = new Date(row.date.getFullYear(), row.date.getMonth(), 1).toISOString();
    const prev = financialMap.get(keyDate) ?? { income: 0, expenses: 0 };
    financialMap.set(keyDate, {
      income: prev.income,
      expenses: prev.expenses + toNumber(row.amount)
    });
  }

  const financialEvolution = monthBuckets.map((bucket) => {
    const row = financialMap.get(bucket.key) ?? { income: 0, expenses: 0 };
    const net = Number((row.income - row.expenses).toFixed(2));
    return {
      label: bucket.label,
      income: Number(row.income.toFixed(2)),
      expenses: Number(row.expenses.toFixed(2)),
      net
    };
  });

  const healthMap = new Map<string, { openCases: number; curedCases: number }>();

  for (const row of healthOpenLast12) {
    const keyDate = new Date(row.openedAt.getFullYear(), row.openedAt.getMonth(), 1).toISOString();
    const prev = healthMap.get(keyDate) ?? { openCases: 0, curedCases: 0 };
    healthMap.set(keyDate, { openCases: prev.openCases + 1, curedCases: prev.curedCases });
  }

  for (const row of healthCuredLast12) {
    if (!row.closedAt) continue;
    const keyDate = new Date(row.closedAt.getFullYear(), row.closedAt.getMonth(), 1).toISOString();
    const prev = healthMap.get(keyDate) ?? { openCases: 0, curedCases: 0 };
    healthMap.set(keyDate, { openCases: prev.openCases, curedCases: prev.curedCases + 1 });
  }

  const healthEvolution = monthBuckets.map((bucket) => {
    const row = healthMap.get(bucket.key) ?? { openCases: 0, curedCases: 0 };
    return {
      label: bucket.label,
      openCases: row.openCases,
      curedCases: row.curedCases
    };
  });

  const incubatorPerformance = monthBuckets.map((bucket) => {
    return {
      label: bucket.label,
      hatchRate: ratio(hatchCount, incubationTotal || 1)
    };
  });

  const birdsArrivalsMap = new Map<string, number>();
  for (const row of birdsLast12Rows) {
    const baseDate = row.acquisitionDate ?? row.createdAt;
    const keyDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1).toISOString();
    birdsArrivalsMap.set(keyDate, (birdsArrivalsMap.get(keyDate) ?? 0) + 1);
  }

  const aviaryGrowth = monthBuckets.map((bucket) => ({
    label: bucket.label,
    arrivals: birdsArrivalsMap.get(bucket.key) ?? 0
  }));

  const eggsRange7 = await sumEggsForRange(tenantId, days7);
  const eggsRange30 = await sumEggsForRange(tenantId, days30);
  const eggsRange365 = await sumEggsForRange(tenantId, days365);
  const net7 = await netForRange(tenantId, days7);
  const net30 = await netForRange(tenantId, days30);
  const net365 = await netForRange(tenantId, days365);
  const health7 = await healthCasesForRange(tenantId, days7);
  const health30 = await healthCasesForRange(tenantId, days30);
  const health365 = await healthCasesForRange(tenantId, days365);

  return {
    kpis: {
      totalBirds,
      activeBirds,
      flockGroups,
      sickBirds,
      deadBirds,
      broodyBirds,
      matrixBirds,
      reproducerBirds,
      eggsToday,
      goodEggsToday,
      crackedEggsToday,
      goodEggRateToday: ratio(goodEggsToday, eggsToday),
      activeBatches,
      hatchRate: ratio(hatchCount, incubationTotal),
      infertilityRate: ratio(infertileCount, incubationTotal),
      birdsInInfirmary: treatingCases,
      recoveryRate: ratio(curedCases, closedCases),
      monthIncome,
      monthExpenses,
      monthNet
    },
    periodSummary: {
      days7: { eggs: eggsRange7, net: net7, healthCases: health7 },
      days30: { eggs: eggsRange30, net: net30, healthCases: health30 },
      days365: { eggs: eggsRange365, net: net365, healthCases: health365 }
    },
    charts: {
      eggCollection,
      aviaryGrowth,
      incubatorPerformance,
      financialEvolution,
      healthEvolution
    }
  };
}

export async function getDashboardDataSafe(tenantId: string): Promise<DashboardData> {
  try {
    return await getDashboardData(tenantId);
  } catch {
    return {
      kpis: {
        totalBirds: 0,
        activeBirds: 0,
        flockGroups: 0,
        sickBirds: 0,
        deadBirds: 0,
        broodyBirds: 0,
        matrixBirds: 0,
        reproducerBirds: 0,
        eggsToday: 0,
        goodEggsToday: 0,
        crackedEggsToday: 0,
        goodEggRateToday: 0,
        activeBatches: 0,
        hatchRate: 0,
        infertilityRate: 0,
        birdsInInfirmary: 0,
        recoveryRate: 0,
        monthIncome: 0,
        monthExpenses: 0,
        monthNet: 0
      },
      periodSummary: {
        days7: { eggs: 0, net: 0, healthCases: 0 },
        days30: { eggs: 0, net: 0, healthCases: 0 },
        days365: { eggs: 0, net: 0, healthCases: 0 }
      },
      charts: {
        eggCollection: [],
        aviaryGrowth: [],
        incubatorPerformance: [],
        financialEvolution: [],
        healthEvolution: []
      },
      warning: "Não foi possível carregar dados do banco. Verifique a conexão com PostgreSQL."
    };
  }
}
