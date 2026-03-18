import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { financialEntrySchema } from "@/lib/validators/finance";
import { createEntry, listFinancialEntries } from "@/lib/finance/service";

export async function GET(request: NextRequest) {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as
    | "EGG_SALE"
    | "CHICK_SALE"
    | "ADULT_BIRD_SALE"
    | "FEED"
    | "MEDICATION"
    | "STRUCTURE"
    | "MAINTENANCE"
    | "OTHER"
    | null;

  const data = await listFinancialEntries(auth.session.user.tenantId, {
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    category: category ?? undefined,
    q: searchParams.get("q") ?? undefined
  });

  return NextResponse.json({ entries: data });
}

export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = financialEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const created = await createEntry(auth.session.user.tenantId, auth.session.user.id, parsed.data);
  return NextResponse.json(created, { status: 201 });
}
