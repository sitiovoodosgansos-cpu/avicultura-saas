import { NextRequest } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { generateReportPdf } from "@/lib/reports/pdf";
import {
  getReportData,
  ReportFocus,
  ReportGranularity,
  ReportPreset,
  resolvePeriod
} from "@/lib/reports/service";

export const runtime = "nodejs";

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

    const [farm, tenant] = await Promise.all([
      prisma.farm.findFirst({
        where: { tenantId: auth.session.user.tenantId },
        select: { name: true }
      }),
      prisma.tenant.findUnique({
        where: { id: auth.session.user.tenantId },
        select: {
          name: true,
          legalName: true,
          logoUrl: true,
          email: true,
          phone: true,
          whatsapp: true,
          city: true,
          stateUf: true,
          cnpj: true
        }
      })
    ]);

    const tenantHeader = {
      name: tenant?.name?.trim() || farm?.name?.trim() || "Sitio sem nome",
      legalName: tenant?.legalName ?? null,
      logoUrl: tenant?.logoUrl ?? null,
      email: tenant?.email ?? null,
      phone: tenant?.phone ?? null,
      whatsapp: tenant?.whatsapp ?? null,
      city: tenant?.city ?? null,
      stateUf: tenant?.stateUf ?? null,
      cnpj: tenant?.cnpj ?? null
    };

    const buffer = await generateReportPdf(data, tenantHeader);
    const body = new Uint8Array(buffer);

    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="relatorio-${focus.toLowerCase()}-${data.period.from}-${data.period.to}.pdf"`
      }
    });
  } catch (error) {
    console.error("[api/reports/pdf] failed to render PDF", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido ao gerar o PDF.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
