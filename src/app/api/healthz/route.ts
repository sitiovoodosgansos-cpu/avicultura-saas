import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: "avicultura-saas", db: "up", at: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, service: "avicultura-saas", db: "down", at: new Date().toISOString() }, { status: 503 });
  }
}
