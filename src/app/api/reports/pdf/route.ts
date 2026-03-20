import { NextRequest } from "next/server";
import { ReportType } from "@prisma/client";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { generateReportPdf } from "@/lib/reports/pdf";
import { getReportData, ReportPreset, resolvePeriod } from "@/lib/reports/service";

export const runtime = "nodejs";

function parseType(value: string | null): ReportType {
  const allowed: ReportType[] = ["GENERAL", "FLOCK", "EGG", "INCUBATOR", "HEALTH", "FINANCIAL"];
  if (value && allowed.includes(value as ReportType)) return value as ReportType;
  return "GENERAL";
}

function parsePreset(value: string | null): ReportPreset {
  if (value === "7d" || value === "30d" || value === "365d" || value === "custom") {
    return value;
  }
  return "30d";
}

export async function GET(request: NextRequest) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const type = parseType(searchParams.get("type"));
  const preset = parsePreset(searchParams.get("preset"));
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const period = resolvePeriod(preset, from, to);
  const data = await getReportData(auth.session.user.tenantId, type, period);

  const farm = await prisma.farm.findFirst({
    where: { tenantId: auth.session.user.tenantId },
    select: { name: true }
  });

  const buffer = await generateReportPdf(data, farm?.name ?? "Sitio sem nome");
  const body = new Uint8Array(buffer);

  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-${type.toLowerCase()}-${data.period.from}-${data.period.to}.pdf"`
    }
  });
}

