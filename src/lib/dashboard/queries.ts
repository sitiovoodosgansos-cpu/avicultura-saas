import { BirdStatus, InfirmaryCaseStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// Aplicado em todas as contagens do dashboard pra alinhar com a Plantel:
// grupos auto-criados de chocada (filhotes) e recria (compra revenda) ficam
// invisiveis na Plantel e portanto nao devem entrar nos KPIs aqui.
const visibleGroupFilter = {
  NOT: {
    OR: [
      { title: { startsWith: "Chocada " } },
      { title: { startsWith: "Recria " } }
    ]
  }
} satisfies Prisma.FlockGroupWhereInput;

const birdInVisibleGroupFilter = {
  flockGroup: visibleGroupFilter,
  // Aves arquivadas (soft-archive em /plantel) saiem das contagens
  // do dashboard pra ficar consistente com o card do Plantel.
  archivedAt: null,
  // Aves criadas via 'aves avulsas' da Vitrine (aggregatedListingId)
  // tambem ficam de fora — nao sao aves do criatorio, sao revenda.
  aggregatedListingId: null
} satisfies Prisma.BirdWhereInput;

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
    days7: { eggs: number; net: number; healthCases: number; sales: number; itemsSold: number; revenue: number };
    days30: { eggs: number; net: number; healthCases: number; sales: number; itemsSold: number; revenue: number };
    days365: { eggs: number; net: number; healthCases: number; sales: number; itemsSold: number; revenue: number };
  };
  charts: {
    eggCollection: Array<{ label: string; total: number }>;
    aviaryGrowth: Array<{ label: string; arrivals: number }>;
    incubatorPerformance: Array<{ label: string; hatchRate: number }>;
    financialEvolution: Array<{ label: string; income: number; expenses: number; net: number }>;
    healthEvolution: Array<{ label: string; openCases: number; curedCases: number }>;
    hatchByMonth: Array<{ label: string; born: number }>;
    salesByMonth: Array<{ label: string; total: number }>;
    plantelComposition: Array<{ label: string; value: number }>;
    topGroups: Array<{ label: string; value: number }>;
    /** Filhotes vivos agrupados por raca-pai (substituiu top groups por raca) */
    filhotesByGroup: Array<{ label: string; value: number }>;
    /** Vendas Ovos vs Aves nos ultimos 30 dias (count diario) */
    salesComparisonDaily: Array<{ label: string; eggs: number; birds: number }>;
    /** Vendas Ovos vs Aves nos ultimos 12 meses (count mensal) */
    salesComparisonMonthly: Array<{ label: string; eggs: number; birds: number }>;
    /** Obitos diarios nos ultimos 30 dias (Bird DEAD + VitrineDeathRecord lots) */
    deathsDaily: Array<{ label: string; value: number }>;
    postureHeatmap: Array<{ date: string; value: number }>;
    hatchGauge: { current: number; previous: number };
    batchResultsByMonth: Array<{ label: string; hatched: number; infertile: number; lost: number }>;
    funnelStages: Array<{ label: string; value: number }>;
    revenueByGroup: Array<{ label: string; value: number }>;
    expensesByCategory: Array<{ label: string; value: number }>;
    deathCauses: Array<{ label: string; value: number }>;
  };
  warning?: string;
};

// Brasil opera em UTC-3 (sem horario de verao desde 2019). Como o
// Vercel roda em UTC, todas as funcoes de data abaixo trabalham com
// 'BRT shifted UTC': representam meia-noite/start-of-month NO HORARIO
// DE BRASILIA, salvas como Date em UTC. Sem isso, depois das 21h BRT
// o sistema ja considerava o dia seguinte (UTC virou).
const BRT_TO_UTC_HOURS = 3;
const BRT_OFFSET_MS = BRT_TO_UTC_HOURS * 3600 * 1000;

function startOfDay(date: Date) {
  // 1. Subtrai 3h: getUTC* agora le os componentes em horario BRT
  const asBrt = new Date(date.getTime() - BRT_OFFSET_MS);
  // 2. Zera o relogio (BRT midnight)
  asBrt.setUTCHours(0, 0, 0, 0);
  // 3. Adiciona 3h: volta pro UTC real (BRT midnight = UTC 03:00 do mesmo dia)
  return new Date(asBrt.getTime() + BRT_OFFSET_MS);
}

function addDays(date: Date, days: number) {
  const next = new Date(date.getTime() + days * 86400 * 1000);
  return next;
}

function startOfMonth(date: Date) {
  const asBrt = new Date(date.getTime() - BRT_OFFSET_MS);
  const year = asBrt.getUTCFullYear();
  const month = asBrt.getUTCMonth();
  // BRT dia 1 00:00 = UTC dia 1 03:00 do mesmo mes
  return new Date(Date.UTC(year, month, 1, BRT_TO_UTC_HOURS, 0, 0, 0));
}

function formatDayLabel(date: Date) {
  // Le componentes em BRT (subtraindo o offset antes de getUTC*)
  const asBrt = new Date(date.getTime() - BRT_OFFSET_MS);
  return `${String(asBrt.getUTCDate()).padStart(2, "0")}/${String(asBrt.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(date: Date) {
  const asBrt = new Date(date.getTime() - BRT_OFFSET_MS);
  return `${String(asBrt.getUTCMonth() + 1).padStart(2, "0")}/${String(asBrt.getUTCFullYear()).slice(-2)}`;
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

// Vendas (EggSale + VitrineSale) num intervalo: numero de transacoes,
// itens vendidos (somatorio quantidades) e receita total agregada.
async function salesForRange(tenantId: string, from: Date) {
  const [eggSales, vitrineSales] = await Promise.all([
    prisma.eggSale.findMany({
      where: { tenantId, soldAt: { gte: from } },
      select: {
        totalAmount: true,
        items: { select: { quantity: true } }
      }
    }),
    prisma.vitrineSale.findMany({
      where: { tenantId, soldAt: { gte: from } },
      select: { totalPrice: true, quantitySold: true }
    })
  ]);

  const eggSalesCount = eggSales.length;
  const vitrineSalesCount = vitrineSales.length;
  const eggItems = eggSales.reduce((s, sale) => s + sale.items.reduce((a, i) => a + i.quantity, 0), 0);
  const vitrineItems = vitrineSales.reduce((s, sale) => s + sale.quantitySold, 0);
  const eggRevenue = eggSales.reduce((s, sale) => s + toNumber(sale.totalAmount), 0);
  const vitrineRevenue = vitrineSales.reduce((s, sale) => s + toNumber(sale.totalPrice), 0);

  return {
    sales: eggSalesCount + vitrineSalesCount,
    itemsSold: eggItems + vitrineItems,
    revenue: Number((eggRevenue + vitrineRevenue).toFixed(2))
  };
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
  // Pega o mes atual em BRT primeiro
  const currentMonthBrt = startOfMonth(now);
  return Array.from({ length: months }, (_, index) => {
    // Recua N meses a partir do mes atual (operacao via Date.UTC pra
    // nao depender de timezone local)
    const offset = index - (months - 1);
    const monthDate = new Date(
      Date.UTC(
        currentMonthBrt.getUTCFullYear(),
        currentMonthBrt.getUTCMonth() + offset,
        1,
        BRT_TO_UTC_HOURS,
        0,
        0,
        0
      )
    );
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
    flockGroupsForTotal,
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
    birdsLast12Rows,
    filhotesAlive,
    eggsLast60,
    vitrineSalesAll,
    vitrineAvailableAgg,
    expensesThisMonth,
    chocadaBirdsForChart,
    eggSalesLast30,
    vitrineSalesLast30,
    eggSalesLast12Months,
    vitrineSalesLast12Months,
    deadBirdsLast30,
    vitrineDeathsLast30,
    eggSaleItemsAll,
    manualSaleEntriesAll
  ] = await Promise.all([
    prisma.flockGroup.findMany({
      where: { tenantId, ...visibleGroupFilter },
      select: {
        id: true,
        title: true,
        matrixCount: true,
        reproducerCount: true,
        // Conta apenas aves vivas (status != DEAD), nao arquivadas e que
        // pertencem ao plantel real (sem aggregatedListingId — Vitrine
        // 'avulsas' nao contam). Bate com a regra do Plantel: Total =
        // vivas no criatorio (inclui doentes/chocas), Mortas separadas.
        _count: {
          select: {
            birds: {
              where: {
                status: { not: BirdStatus.DEAD },
                archivedAt: null,
                aggregatedListingId: null
              }
            }
          }
        }
      }
    }),
    prisma.bird.count({ where: { tenantId, status: BirdStatus.ACTIVE, ...birdInVisibleGroupFilter } }),
    prisma.flockGroup.count({ where: { tenantId, ...visibleGroupFilter } }),
    prisma.bird.count({ where: { tenantId, status: BirdStatus.SICK, ...birdInVisibleGroupFilter } }),
    prisma.bird.count({ where: { tenantId, status: BirdStatus.DEAD, ...birdInVisibleGroupFilter } }),
    prisma.bird.count({ where: { tenantId, status: BirdStatus.BROODY, ...birdInVisibleGroupFilter } }),
    prisma.bird.count({ where: { tenantId, sex: "FEMALE", status: BirdStatus.ACTIVE, ...birdInVisibleGroupFilter } }),
    prisma.bird.count({ where: { tenantId, sex: "MALE", status: BirdStatus.ACTIVE, ...birdInVisibleGroupFilter } }),
    prisma.eggCollection.aggregate({
      where: { tenantId, date: { gte: today, lt: tomorrow }, flockGroup: visibleGroupFilter },
      _sum: { totalEggs: true, goodEggs: true, crackedEggs: true }
    }),
    prisma.incubatorBatch.count({ where: { tenantId, status: "ACTIVE", flockGroup: visibleGroupFilter } }),
    prisma.incubatorBatchEvent.findMany({
      where: { tenantId, batch: { flockGroup: visibleGroupFilter } },
      select: { type: true, quantity: true, eventDate: true }
    }),
    prisma.infirmaryCase.count({
      where: { tenantId, status: InfirmaryCaseStatus.TREATING, bird: birdInVisibleGroupFilter }
    }),
    prisma.infirmaryCase.groupBy({
      by: ["status"],
      where: { tenantId, bird: birdInVisibleGroupFilter },
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
      where: { tenantId, date: { gte: days30 }, flockGroup: visibleGroupFilter },
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
      where: {
        tenantId,
        openedAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) },
        bird: birdInVisibleGroupFilter
      },
      select: { openedAt: true }
    }),
    prisma.infirmaryCase.findMany({
      where: {
        tenantId,
        status: InfirmaryCaseStatus.CURED,
        closedAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) },
        bird: birdInVisibleGroupFilter
      },
      select: { closedAt: true }
    }),
    prisma.bird.findMany({
      where: {
        tenantId,
        OR: [
          { acquisitionDate: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } },
          { createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } }
        ],
        ...birdInVisibleGroupFilter
      },
      select: { acquisitionDate: true, createdAt: true }
    }),
    // Filhotes vivos: aves em grupos Chocada (auto-criados de eclosao)
    prisma.bird.count({
      where: {
        tenantId,
        status: { not: BirdStatus.DEAD },
        flockGroup: { title: { startsWith: "Chocada " } }
      }
    }),
    // Postura ultimos 60 dias pra heatmap calendar
    prisma.eggCollection.findMany({
      where: {
        tenantId,
        date: { gte: addDays(today, -59) },
        flockGroup: visibleGroupFilter
      },
      select: { date: true, totalEggs: true }
    }),
    // Vendas da vitrine all-time pra funnel + receita por grupo.
    // Resolve grupo via listing.flockGroup (preferindo o pai via
    // sourceIncubatorBatch quando o listing aponta pra Chocada).
    prisma.vitrineSale.findMany({
      where: { tenantId },
      select: {
        quantitySold: true,
        totalPrice: true,
        listing: {
          select: {
            flockGroup: { select: { title: true } },
            sourceIncubatorBatch: { select: { flockGroup: { select: { title: true } } } }
          }
        }
      }
    }),
    // Aves disponiveis na vitrine agora
    prisma.vitrineListing.aggregate({
      where: { tenantId, status: "AVAILABLE" },
      _sum: { availableQuantity: true }
    }),
    // Despesas do mes agrupadas por categoria
    prisma.financialExpense.groupBy({
      by: ["category"],
      where: { tenantId, date: { gte: monthStart } },
      _sum: { amount: true }
    }),
    // Filhotes vivos por grupo Chocada (titulo do grupo expansivel pra raca-pai)
    prisma.bird.findMany({
      where: {
        tenantId,
        status: { not: BirdStatus.DEAD },
        flockGroup: { title: { startsWith: "Chocada " } }
      },
      select: { flockGroup: { select: { title: true } } }
    }),
    // Vendas Ovos (Prateleira) ultimos 30 dias agrupadas por dia
    prisma.eggSale.findMany({
      where: { tenantId, soldAt: { gte: days30 } },
      select: { soldAt: true }
    }),
    // Vendas Aves (Vitrine) ultimos 30 dias agrupadas por dia
    prisma.vitrineSale.findMany({
      where: { tenantId, soldAt: { gte: days30 } },
      select: { soldAt: true, quantitySold: true }
    }),
    // Vendas Ovos ultimos 12 meses
    prisma.eggSale.findMany({
      where: {
        tenantId,
        soldAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) }
      },
      select: { soldAt: true }
    }),
    // Vendas Aves ultimos 12 meses
    prisma.vitrineSale.findMany({
      where: {
        tenantId,
        soldAt: { gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) }
      },
      select: { soldAt: true, quantitySold: true }
    }),
    // Obitos: aves do plantel marcadas como DEAD nos ultimos 30 dias
    // (proxy: updatedAt da Bird quando status virou DEAD).
    prisma.bird.findMany({
      where: { tenantId, status: BirdStatus.DEAD, updatedAt: { gte: days30 } },
      select: { updatedAt: true }
    }),
    // Obitos: lotes da Vitrine (sem sourceBird) nos ultimos 30 dias
    prisma.vitrineDeathRecord.findMany({
      where: {
        tenantId,
        occurredAt: { gte: days30 },
        listing: { sourceBirdId: null }
      },
      select: { occurredAt: true, quantity: true }
    }),
    // Receita por raca — 2 fontes complementares:
    //
    // (a) EggSaleItem: cada item carrega trayEntry → tray → flockGroup,
    //     entao mesmo quando uma EggSale contem ovos de varias racas no
    //     mesmo carrinho, conseguimos contar subtotal POR raca. Antes
    //     usavamos FinancialEntry.item (concatenado tipo 'Race1, Race2
    //     +3'), o que misturava varias racas numa barra so.
    prisma.eggSaleItem.findMany({
      where: { tenantId },
      select: {
        subtotal: true,
        trayEntry: {
          select: {
            tray: {
              select: {
                flockGroup: { select: { title: true } }
              }
            }
          }
        }
      }
    }),
    // (b) FinancialEntry manuais — lancamentos do usuario na tela
    //     /financeiro, NAO ligados a EggSale nem a VitrineSale (essas ja
    //     sao cobertas em (a) e via vitrineSalesAll). Sem filtro de
    //     category: FinancialEntry inteira eh receita, e o toggle
    //     'Dentro/Fora do Plantel' aparece pra todas as categorias.
    prisma.financialEntry.findMany({
      where: {
        tenantId,
        vitrineSales: { none: {} },
        eggSale: { is: null }
      },
      select: { item: true, amount: true }
    })
  ]);

  const totalBirds = flockGroupsForTotal.reduce((sum, group) => {
    const configuredTotal = group.matrixCount + group.reproducerCount;
    return sum + Math.max(group._count.birds, configuredTotal);
  }, 0);

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
    const keyDate = startOfMonth(row.date).toISOString();
    const prev = financialMap.get(keyDate) ?? { income: 0, expenses: 0 };
    financialMap.set(keyDate, {
      income: prev.income + toNumber(row.amount),
      expenses: prev.expenses
    });
  }

  for (const row of expensesLast12) {
    const keyDate = startOfMonth(row.date).toISOString();
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
    const keyDate = startOfMonth(row.openedAt).toISOString();
    const prev = healthMap.get(keyDate) ?? { openCases: 0, curedCases: 0 };
    healthMap.set(keyDate, { openCases: prev.openCases + 1, curedCases: prev.curedCases });
  }

  for (const row of healthCuredLast12) {
    if (!row.closedAt) continue;
    const keyDate = startOfMonth(row.closedAt).toISOString();
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
    const keyDate = startOfMonth(baseDate).toISOString();
    birdsArrivalsMap.set(keyDate, (birdsArrivalsMap.get(keyDate) ?? 0) + 1);
  }

  const aviaryGrowth = monthBuckets.map((bucket) => ({
    label: bucket.label,
    arrivals: birdsArrivalsMap.get(bucket.key) ?? 0
  }));

  // Filhotes nascidos por mes (HATCHED events nos ultimos 12 meses)
  const hatchMap = new Map<string, number>();
  for (const event of batchEvents) {
    if (event.type !== "HATCHED") continue;
    const d = event.eventDate;
    const keyDate = startOfMonth(d).toISOString();
    hatchMap.set(keyDate, (hatchMap.get(keyDate) ?? 0) + (event.quantity ?? 0));
  }
  const hatchByMonth = monthBuckets.map((bucket) => ({
    label: bucket.label,
    born: hatchMap.get(bucket.key) ?? 0
  }));

  // Vendas por mes (somente entradas, sum amount)
  const salesMap = new Map<string, number>();
  for (const row of entriesLast12) {
    const keyDate = startOfMonth(row.date).toISOString();
    salesMap.set(keyDate, (salesMap.get(keyDate) ?? 0) + toNumber(row.amount));
  }
  const salesByMonth = monthBuckets.map((bucket) => ({
    label: bucket.label,
    total: Number((salesMap.get(bucket.key) ?? 0).toFixed(2))
  }));

  // === Filhotes por raça-pai (substitui Aves por raça) ===
  // Cada Bird vive num grupo "Chocada {mes}/{ano} · {pai.title}".
  // A raca-pai vem do final do titulo apos " · ".
  const filhotesByGroupMap = new Map<string, number>();
  for (const bird of chocadaBirdsForChart) {
    const title = bird.flockGroup.title;
    const parentName = title.includes(" · ") ? title.split(" · ").slice(-1)[0] : title;
    filhotesByGroupMap.set(parentName, (filhotesByGroupMap.get(parentName) ?? 0) + 1);
  }
  const filhotesByGroup = Array.from(filhotesByGroupMap, ([label, value]) => ({ label, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // === Vendas Ovos vs Aves diario (30d) ===
  const dayBuckets30 = dateBucketLastDays(30);
  const eggSalesByDay = new Map<string, number>();
  for (const sale of eggSalesLast30) {
    const key = startOfDay(sale.soldAt).toISOString();
    eggSalesByDay.set(key, (eggSalesByDay.get(key) ?? 0) + 1);
  }
  const vitrineSalesByDay = new Map<string, number>();
  for (const sale of vitrineSalesLast30) {
    const key = startOfDay(sale.soldAt).toISOString();
    vitrineSalesByDay.set(key, (vitrineSalesByDay.get(key) ?? 0) + sale.quantitySold);
  }
  const salesComparisonDaily = dayBuckets30.map((bucket) => ({
    label: bucket.label,
    eggs: eggSalesByDay.get(bucket.key) ?? 0,
    birds: vitrineSalesByDay.get(bucket.key) ?? 0
  }));

  // === Vendas Ovos vs Aves mensal (12m) ===
  const eggSalesByMonth = new Map<string, number>();
  for (const sale of eggSalesLast12Months) {
    const d = sale.soldAt;
    const key = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    eggSalesByMonth.set(key, (eggSalesByMonth.get(key) ?? 0) + 1);
  }
  const vitrineSalesByMonth = new Map<string, number>();
  for (const sale of vitrineSalesLast12Months) {
    const d = sale.soldAt;
    const key = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    vitrineSalesByMonth.set(key, (vitrineSalesByMonth.get(key) ?? 0) + sale.quantitySold);
  }
  const salesComparisonMonthly = monthBuckets.map((bucket) => ({
    label: bucket.label,
    eggs: eggSalesByMonth.get(bucket.key) ?? 0,
    birds: vitrineSalesByMonth.get(bucket.key) ?? 0
  }));

  // === Obitos diarios (30d) — Bird DEAD + lotes da Vitrine ===
  const deathsByDay = new Map<string, number>();
  for (const bird of deadBirdsLast30) {
    const key = startOfDay(bird.updatedAt).toISOString();
    deathsByDay.set(key, (deathsByDay.get(key) ?? 0) + 1);
  }
  for (const death of vitrineDeathsLast30) {
    const key = startOfDay(death.occurredAt).toISOString();
    deathsByDay.set(key, (deathsByDay.get(key) ?? 0) + (death.quantity ?? 0));
  }
  const deathsDaily = dayBuckets30.map((bucket) => ({
    label: bucket.label,
    value: deathsByDay.get(bucket.key) ?? 0
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
  const sales7 = await salesForRange(tenantId, days7);
  const sales30 = await salesForRange(tenantId, days30);
  const sales365 = await salesForRange(tenantId, days365);

  const deathCauses = await buildDeathCauses(tenantId);

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
      days7: { eggs: eggsRange7, net: net7, healthCases: health7, ...sales7 },
      days30: { eggs: eggsRange30, net: net30, healthCases: health30, ...sales30 },
      days365: { eggs: eggsRange365, net: net365, healthCases: health365, ...sales365 }
    },
    charts: {
      eggCollection,
      aviaryGrowth,
      incubatorPerformance,
      financialEvolution,
      healthEvolution,
      hatchByMonth,
      salesByMonth,
      plantelComposition: buildPlantelComposition({
        matrixBirds,
        reproducerBirds,
        sickBirds,
        broodyBirds,
        filhotesAlive
      }),
      topGroups: buildTopGroups(flockGroupsForTotal),
      filhotesByGroup,
      salesComparisonDaily,
      salesComparisonMonthly,
      deathsDaily,
      postureHeatmap: buildPostureHeatmap(eggsLast60),
      hatchGauge: buildHatchGauge(batchEvents, now),
      batchResultsByMonth: buildBatchResultsByMonth(batchEvents, monthBuckets),
      funnelStages: buildFunnelStages({
        hatchedTotal: hatchCount,
        filhotesAlive,
        availableInVitrine: vitrineAvailableAgg._sum.availableQuantity ?? 0,
        soldAllTime: vitrineSalesAll.reduce((s, x) => s + x.quantitySold, 0)
      }),
      revenueByGroup: buildRevenueByGroup(
        vitrineSalesAll,
        eggSaleItemsAll,
        manualSaleEntriesAll,
        new Set(flockGroupsForTotal.map((g) => g.title))
      ),
      expensesByCategory: buildExpensesByCategory(expensesThisMonth),
      deathCauses
    }
  };
}

function buildPlantelComposition(input: {
  matrixBirds: number;     // sex=FEMALE & status=ACTIVE em grupos visiveis
  reproducerBirds: number; // sex=MALE & status=ACTIVE em grupos visiveis
  sickBirds: number;
  broodyBirds: number;
  filhotesAlive: number;   // aves em grupos Chocada (filhotes auto-criados)
}): Array<{ label: string; value: number }> {
  return [
    { label: "Fêmeas adultas", value: input.matrixBirds },
    { label: "Machos adultos", value: input.reproducerBirds },
    { label: "Filhotes", value: input.filhotesAlive },
    { label: "Em tratamento / choco", value: input.sickBirds + input.broodyBirds }
  ].filter((d) => d.value > 0);
}

function buildTopGroups(
  groups: Array<{ id: string; title: string; matrixCount: number; reproducerCount: number; _count: { birds: number } }>
): Array<{ label: string; value: number }> {
  return groups
    .map((g) => ({
      label: g.title,
      value: Math.max(g._count.birds, g.matrixCount + g.reproducerCount)
    }))
    .filter((g) => g.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

// YYYY-MM-DD em America/Sao_Paulo (independente do TZ do servidor).
// Usado pra agrupar coletas/eventos por dia respeitando o fuso do Brasil.
const brasilDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});
function brasilDateKey(d: Date): string {
  return brasilDateFmt.format(d);
}

function buildPostureHeatmap(
  eggs: Array<{ date: Date; totalEggs: number }>
): Array<{ date: string; value: number }> {
  // Agrupa por dia em horario de Brasilia (evita off-by-one quando
  // a coleta foi salva perto da meia-noite e o servidor estava em UTC).
  const byDay = new Map<string, number>();
  for (const row of eggs) {
    const key = brasilDateKey(row.date);
    byDay.set(key, (byDay.get(key) ?? 0) + row.totalEggs);
  }
  return Array.from(byDay.entries()).map(([date, value]) => ({ date, value }));
}

function buildHatchGauge(
  batchEvents: Array<{ type: string; quantity: number; eventDate: Date }>,
  now: Date
): { current: number; previous: number } {
  // Janela de 90 dias, "atual" = ultimos 90 vs "anterior" = 91-180 dias atras.
  const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const days180Ago = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const types = ["HATCHED", "INFERTILE", "EMBRYO_LOSS", "PIPPED_DIED"];

  function rateInWindow(from: Date, to: Date) {
    let hatched = 0;
    let total = 0;
    for (const e of batchEvents) {
      if (e.eventDate < from || e.eventDate >= to) continue;
      if (!types.includes(e.type)) continue;
      total += e.quantity;
      if (e.type === "HATCHED") hatched += e.quantity;
    }
    return total > 0 ? (hatched / total) * 100 : 0;
  }

  return {
    current: rateInWindow(days90Ago, now),
    previous: rateInWindow(days180Ago, days90Ago)
  };
}

function buildBatchResultsByMonth(
  batchEvents: Array<{ type: string; quantity: number; eventDate: Date }>,
  monthBuckets: Array<{ key: string; label: string }>
): Array<{ label: string; hatched: number; infertile: number; lost: number }> {
  const map = new Map<string, { hatched: number; infertile: number; lost: number }>();
  for (const e of batchEvents) {
    const d = e.eventDate;
    const key = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const cur = map.get(key) ?? { hatched: 0, infertile: 0, lost: 0 };
    if (e.type === "HATCHED") cur.hatched += e.quantity;
    else if (e.type === "INFERTILE") cur.infertile += e.quantity;
    else if (e.type === "EMBRYO_LOSS" || e.type === "PIPPED_DIED") cur.lost += e.quantity;
    map.set(key, cur);
  }
  return monthBuckets.map((b) => {
    const v = map.get(b.key) ?? { hatched: 0, infertile: 0, lost: 0 };
    return { label: b.label, ...v };
  });
}

function buildFunnelStages(input: {
  hatchedTotal: number;
  filhotesAlive: number;
  availableInVitrine: number;
  soldAllTime: number;
}): Array<{ label: string; value: number }> {
  // Funnel da jornada da ave: nasce -> sobrevive -> vira anuncio -> eh vendida.
  // Filtra etapas zero pra evitar funil esquisito.
  const all: Array<{ label: string; value: number }> = [
    { label: "Nascidos", value: input.hatchedTotal },
    { label: "Vivos", value: input.filhotesAlive },
    { label: "Na vitrine", value: input.availableInVitrine },
    { label: "Vendidos", value: input.soldAllTime }
  ];
  // Mantem so se ao menos 1 estagio tiver valor; ordem decrescente
  // garantida pelo proprio dominio (mais ou menos).
  return all;
}

function buildRevenueByGroup(
  vitrineSales: Array<{
    totalPrice: { toNumber: () => number } | number | null;
    listing: {
      flockGroup: { title: string } | null;
      sourceIncubatorBatch: { flockGroup: { title: string } | null } | null;
    } | null;
  }>,
  eggSaleItems: Array<{
    subtotal: { toNumber: () => number } | number | null;
    trayEntry: {
      tray: {
        flockGroup: { title: string } | null;
      };
    };
  }>,
  manualSaleEntries: Array<{
    item: string;
    amount: { toNumber: () => number } | number | null;
  }>,
  knownGroupTitles: Set<string>
): Array<{ label: string; value: number }> {
  // Receita por raca agregando 3 fontes (uma barra por flockGroup):
  //  1) VitrineSale — 1 sale = 1 listing = 1 flockGroup (com resolucao
  //     Chocada→pai quando o listing eh de filhote derivado de chocada)
  //  2) EggSaleItem — granular POR ITEM da venda, cada um com sua
  //     propria raca via trayEntry.tray.flockGroup.
  //  3) FinancialEntry manuais — APENAS quando item bate com algum
  //     group.title do plantel. Lancamentos 'Fora do Plantel' (revenda,
  //     comissao, etc) ficam de fora desse grafico (continuam contando
  //     na receita total mas nao em raca especifica).
  const map = new Map<string, number>();

  for (const sale of vitrineSales) {
    const listingTitle = sale.listing?.flockGroup?.title ?? "Sem grupo";
    const isChild = listingTitle.startsWith("Chocada ");
    const parentTitle = sale.listing?.sourceIncubatorBatch?.flockGroup?.title;
    const label = isChild && parentTitle ? parentTitle : listingTitle;
    const amount = decimalToNumber(sale.totalPrice);
    if (amount <= 0) continue;
    map.set(label, (map.get(label) ?? 0) + amount);
  }

  for (const item of eggSaleItems) {
    const label = item.trayEntry.tray.flockGroup?.title?.trim() || "Bandeja sem grupo";
    const amount = decimalToNumber(item.subtotal);
    if (amount <= 0) continue;
    map.set(label, (map.get(label) ?? 0) + amount);
  }

  for (const entry of manualSaleEntries) {
    const label = entry.item?.trim();
    if (!label) continue;
    // Filtro: so contabiliza no grafico se o label bate com algum grupo
    // ativo do plantel. Itens 'Fora do Plantel' (revenda etc) ficam fora.
    if (!knownGroupTitles.has(label)) continue;
    const amount = decimalToNumber(entry.amount);
    if (amount <= 0) continue;
    map.set(label, (map.get(label) ?? 0) + amount);
  }

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
}

function buildExpensesByCategory(
  rows: Array<{ category: string; _sum: { amount: { toNumber: () => number } | null } }>
): Array<{ label: string; value: number }> {
  const labels: Record<string, string> = {
    FEED: "Ração",
    MEDICATION: "Medicamento",
    BIRD_PURCHASE: "Compra de aves",
    EQUIPMENT: "Equipamento",
    FACILITY: "Instalações",
    LABOR: "Mão de obra",
    UTILITIES: "Energia/Água",
    OTHER: "Outros"
  };
  return rows
    .map((r) => ({
      label: labels[r.category] ?? r.category,
      value: decimalToNumber(r._sum.amount)
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
}

function decimalToNumber(v: { toNumber: () => number } | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  return v.toNumber();
}

/**
 * Causas de morte: agrega BirdStatusHistory.toStatus = DEAD agrupando
 * pelo deathReason.name. Birds mortas sem causa cadastrada caem em
 * 'Sem causa especificada'. Considera apenas transicoes pra DEAD
 * (preserva direcao temporal — uma ave que voltou de DEAD pra ACTIVE
 * gerou um historico DEAD que deve continuar contando como morte
 * registrada).
 */
async function buildDeathCauses(
  tenantId: string
): Promise<Array<{ label: string; value: number }>> {
  const deaths = await prisma.birdStatusHistory.findMany({
    where: { tenantId, toStatus: BirdStatus.DEAD },
    select: { deathReason: { select: { name: true } } }
  });

  const map = new Map<string, number>();
  for (const death of deaths) {
    const label = death.deathReason?.name?.trim() || "Sem causa especificada";
    map.set(label, (map.get(label) ?? 0) + 1);
  }

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export async function getDashboardDataSafe(tenantId: string): Promise<DashboardData> {
  try {
    return await getDashboardData(tenantId);
  } catch (err) {
    console.error("[dashboard.queries.getDashboardData] failed:", err);
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
        days7: { eggs: 0, net: 0, healthCases: 0, sales: 0, itemsSold: 0, revenue: 0 },
        days30: { eggs: 0, net: 0, healthCases: 0, sales: 0, itemsSold: 0, revenue: 0 },
        days365: { eggs: 0, net: 0, healthCases: 0, sales: 0, itemsSold: 0, revenue: 0 }
      },
      charts: {
        eggCollection: [],
        aviaryGrowth: [],
        incubatorPerformance: [],
        financialEvolution: [],
        healthEvolution: [],
        hatchByMonth: [],
        salesByMonth: [],
        plantelComposition: [],
        topGroups: [],
        filhotesByGroup: [],
        salesComparisonDaily: [],
        salesComparisonMonthly: [],
        deathsDaily: [],
        postureHeatmap: [],
        hatchGauge: { current: 0, previous: 0 },
        batchResultsByMonth: [],
        funnelStages: [],
        revenueByGroup: [],
        expensesByCategory: [],
        deathCauses: []
      },
      warning: "Não foi possível carregar dados do banco. Verifique a conexão com PostgreSQL."
    };
  }
}
