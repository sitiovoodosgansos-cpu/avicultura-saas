import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import {
  getReportData,
  ReportFocus,
  ReportGranularity,
  ReportPreset,
  resolvePeriod
} from "@/lib/reports/service";

function parseFocus(value: string | null): ReportFocus {
  const allowed: ReportFocus[] = ["GENERAL", "PLANTEL", "EGGS", "HEALTH", "FINANCE"];
  if (value && allowed.includes(value as ReportFocus)) return value as ReportFocus;
  return "GENERAL";
}

function parseGranularity(value: string | null): ReportGranularity {
  const allowed: ReportGranularity[] = ["EXECUTIVE", "DETAILED", "ANALYTICAL"];
  if (value && allowed.includes(value as ReportGranularity)) return value as ReportGranularity;
  return "DETAILED";
}

function parsePreset(value: string | null): ReportPreset {
  if (
    value === "7d" ||
    value === "30d" ||
    value === "90d" ||
    value === "365d" ||
    value === "ytd" ||
    value === "custom"
  ) {
    return value;
  }
  return "30d";
}

export async function GET(request: NextRequest) {
  const auth = await getApiSessionOr401({ employeePermission: "relatorios" });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const focus = parseFocus(searchParams.get("focus"));
  const granularity = parseGranularity(searchParams.get("granularity"));
  const preset = parsePreset(searchParams.get("preset"));
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  try {
    const period = resolvePeriod(preset, from, to);
    const data = await getReportData(auth.session.user.tenantId, { focus, granularity }, period);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/reports/data] failed to build report", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido ao gerar o relatório.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
