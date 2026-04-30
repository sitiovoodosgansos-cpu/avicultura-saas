import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const results: Record<string, unknown> = {};

  const checks: Array<{ name: string; fn: () => Promise<unknown> }> = [
    { name: "incubator", fn: () => prisma.incubator.count() },
    { name: "incubatorBatch", fn: () => prisma.incubatorBatch.count() },
    { name: "incubatorBatchEvent", fn: () => prisma.incubatorBatchEvent.count() },
    { name: "incubatorBatchSource", fn: () => prisma.incubatorBatchSource.count() },
    { name: "eggTray", fn: () => prisma.eggTray.count() },
    { name: "eggTrayEntry", fn: () => prisma.eggTrayEntry.count() },
    { name: "eggSale", fn: () => prisma.eggSale.count() },
    { name: "eggSaleItem", fn: () => prisma.eggSaleItem.count() },
    {
      name: "incubatorBatch.findFirst.with.sources",
      fn: () =>
        prisma.incubatorBatch.findFirst({
          include: { sources: true, events: true }
        })
    }
  ];

  for (const check of checks) {
    try {
      results[check.name] = { ok: true, value: await check.fn() };
    } catch (err) {
      results[check.name] = {
        ok: false,
        error: err instanceof Error ? `${err.name}: ${err.message}` : String(err)
      };
    }
  }

  return NextResponse.json(results, { status: 200 });
}
