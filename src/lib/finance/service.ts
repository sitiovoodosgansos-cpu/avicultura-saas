import { prisma } from "@/lib/db/prisma";

function toDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function toNumber(value: { toString(): string } | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return Number(value.toString());
}

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

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function listFinancialEntries(
  tenantId: string,
  params?: { from?: string; to?: string; category?: string; q?: string }
) {
  const entries = await prisma.financialEntry.findMany({
    where: {
      tenantId,
      date: {
        gte: params?.from ? new Date(`${params.from}T00:00:00`) : undefined,
        lte: params?.to ? new Date(`${params.to}T23:59:59`) : undefined
      },
      category: params?.category,
      OR: params?.q
        ? [
            { item: { contains: params.q, mode: "insensitive" } },
            { description: { contains: params.q, mode: "insensitive" } },
            { customer: { contains: params.q, mode: "insensitive" } },
            { notes: { contains: params.q, mode: "insensitive" } }
          ]
        : undefined
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }]
  });

  return entries.map((row) => ({ ...row, amount: toNumber(row.amount) }));
}

export async function listFinancialExpenses(
  tenantId: string,
  params?: { from?: string; to?: string; category?: string; q?: string }
) {
  const expenses = await prisma.financialExpense.findMany({
    where: {
      tenantId,
      date: {
        gte: params?.from ? new Date(`${params.from}T00:00:00`) : undefined,
        lte: params?.to ? new Date(`${params.to}T23:59:59`) : undefined
      },
      category: params?.category,
      OR: params?.q
        ? [
            { item: { contains: params.q, mode: "insensitive" } },
            { description: { contains: params.q, mode: "insensitive" } },
            { supplier: { contains: params.q, mode: "insensitive" } },
            { notes: { contains: params.q, mode: "insensitive" } }
          ]
        : undefined
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }]
  });

  return expenses.map((row) => ({ ...row, amount: toNumber(row.amount) }));
}

export async function createEntry(
  tenantId: string,
  userId: string,
  input: {
    date: string;
    category: string;
    item: string;
    amount: number;
    description?: string;
    customer?: string;
    notes?: string;
  }
) {
  const created = await prisma.financialEntry.create({
    data: {
      tenantId,
      date: toDate(input.date),
      category: input.category,
      item: input.item,
      amount: input.amount,
      description: input.description,
      customer: input.customer,
      notes: input.notes
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "FIN_ENTRY_CREATE",
      entity: "FinancialEntry",
      entityId: created.id,
      after: { amount: created.amount.toString(), category: created.category }
    }
  });

  return created;
}

export async function updateEntry(
  tenantId: string,
  userId: string,
  id: string,
  input: {
    date: string;
    category: string;
    item: string;
    amount: number;
    description?: string;
    customer?: string;
    notes?: string;
  }
) {
  const existing = await prisma.financialEntry.findFirst({ where: { id, tenantId } });
  if (!existing) return null;

  const updated = await prisma.financialEntry.update({
    where: { id },
    data: {
      date: toDate(input.date),
      category: input.category,
      item: input.item,
      amount: input.amount,
      description: input.description,
      customer: input.customer,
      notes: input.notes
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "FIN_ENTRY_UPDATE",
      entity: "FinancialEntry",
      entityId: id,
      before: { amount: existing.amount.toString(), category: existing.category },
      after: { amount: updated.amount.toString(), category: updated.category }
    }
  });

  return updated;
}

export async function deleteEntry(tenantId: string, userId: string, id: string) {
  const existing = await prisma.financialEntry.findFirst({ where: { id, tenantId } });
  if (!existing) return false;

  await prisma.financialEntry.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "FIN_ENTRY_DELETE",
      entity: "FinancialEntry",
      entityId: id
    }
  });

  return true;
}

export async function createExpense(
  tenantId: string,
  userId: string,
  input: {
    date: string;
    category: string;
    item: string;
    amount: number;
    description?: string;
    supplier?: string;
    notes?: string;
  }
) {
  const created = await prisma.financialExpense.create({
    data: {
      tenantId,
      date: toDate(input.date),
      category: input.category,
      item: input.item,
      amount: input.amount,
      description: input.description,
      supplier: input.supplier,
      notes: input.notes
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "FIN_EXPENSE_CREATE",
      entity: "FinancialExpense",
      entityId: created.id,
      after: { amount: created.amount.toString(), category: created.category }
    }
  });

  return created;
}

export async function updateExpense(
  tenantId: string,
  userId: string,
  id: string,
  input: {
    date: string;
    category: string;
    item: string;
    amount: number;
    description?: string;
    supplier?: string;
    notes?: string;
  }
) {
  const existing = await prisma.financialExpense.findFirst({ where: { id, tenantId } });
  if (!existing) return null;

  const updated = await prisma.financialExpense.update({
    where: { id },
    data: {
      date: toDate(input.date),
      category: input.category,
      item: input.item,
      amount: input.amount,
      description: input.description,
      supplier: input.supplier,
      notes: input.notes
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "FIN_EXPENSE_UPDATE",
      entity: "FinancialExpense",
      entityId: id,
      before: { amount: existing.amount.toString(), category: existing.category },
      after: { amount: updated.amount.toString(), category: updated.category }
    }
  });

  return updated;
}

export async function deleteExpense(tenantId: string, userId: string, id: string) {
  const existing = await prisma.financialExpense.findFirst({ where: { id, tenantId } });
  if (!existing) return false;

  await prisma.financialExpense.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "FIN_EXPENSE_DELETE",
      entity: "FinancialExpense",
      entityId: id
    }
  });

  return true;
}

export async function getFinancialMetrics(tenantId: string) {
  const now = new Date();
  const today = startOfDay(now);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const from7 = addDays(today, -6);
  const from30 = addDays(today, -29);
  const from365 = addDays(today, -364);
  const from12months = new Date(today.getFullYear(), today.getMonth() - 11, 1);

  const [entries12, expenses12] = await Promise.all([
    prisma.financialEntry.findMany({
      where: { tenantId, date: { gte: from12months } },
      select: { date: true, amount: true }
    }),
    prisma.financialExpense.findMany({
      where: { tenantId, date: { gte: from12months } },
      select: { date: true, amount: true }
    })
  ]);

  function sumRange<T extends { date: Date; amount: { toString(): string } }>(rows: T[], from: Date) {
    return rows.filter((r) => r.date >= from).reduce((sum, r) => sum + toNumber(r.amount), 0);
  }

  const monthIncome = Number(sumRange(entries12, monthStart).toFixed(2));
  const monthExpenses = Number(sumRange(expenses12, monthStart).toFixed(2));

  const income7 = Number(sumRange(entries12, from7).toFixed(2));
  const expenses7 = Number(sumRange(expenses12, from7).toFixed(2));
  const income30 = Number(sumRange(entries12, from30).toFixed(2));
  const expenses30 = Number(sumRange(expenses12, from30).toFixed(2));
  const income365 = Number(sumRange(entries12, from365).toFixed(2));
  const expenses365 = Number(sumRange(expenses12, from365).toFixed(2));

  const monthMap = new Map<string, { income: number; expenses: number }>();

  for (const row of entries12) {
    const key = monthKey(row.date);
    const current = monthMap.get(key) ?? { income: 0, expenses: 0 };
    current.income += toNumber(row.amount);
    monthMap.set(key, current);
  }

  for (const row of expenses12) {
    const key = monthKey(row.date);
    const current = monthMap.get(key) ?? { income: 0, expenses: 0 };
    current.expenses += toNumber(row.amount);
    monthMap.set(key, current);
  }

  const monthlyEvolution = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, item]) => ({
      month,
      income: Number(item.income.toFixed(2)),
      expenses: Number(item.expenses.toFixed(2)),
      net: Number((item.income - item.expenses).toFixed(2))
    }));

  return {
    summary: {
      monthIncome,
      monthExpenses,
      monthNet: Number((monthIncome - monthExpenses).toFixed(2))
    },
    periods: {
      days7: {
        income: income7,
        expenses: expenses7,
        net: Number((income7 - expenses7).toFixed(2))
      },
      days30: {
        income: income30,
        expenses: expenses30,
        net: Number((income30 - expenses30).toFixed(2))
      },
      days365: {
        income: income365,
        expenses: expenses365,
        net: Number((income365 - expenses365).toFixed(2))
      }
    },
    monthlyEvolution
  };
}


