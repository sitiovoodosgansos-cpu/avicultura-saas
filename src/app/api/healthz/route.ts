import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: "ornabird", db: "up", at: new Date().toISOString() });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json(
      { ok: false, service: "ornabird", db: "down", reason, at: new Date().toISOString() },
      { status: 503 }
    );
  }
}
