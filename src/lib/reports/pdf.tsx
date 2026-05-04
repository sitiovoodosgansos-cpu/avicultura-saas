import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  Image,
  renderToBuffer
} from "@react-pdf/renderer";
import { ReportData, ReportFocus, Trend, Insight } from "@/lib/reports/service";

export type TenantHeader = {
  name: string;
  legalName: string | null;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  stateUf: string | null;
  cnpj: string | null;
};

const PALETTE = {
  brand: "#0f766e",
  brandSoft: "#ccfbf1",
  ink: "#0f172a",
  inkSoft: "#475569",
  inkMuted: "#94a3b8",
  line: "#e2e8f0",
  surface: "#ffffff",
  surfaceSoft: "#f8fafc",
  surfaceZebra: "#f9fafb",
  positive: "#047857",
  negative: "#b91c1c",
  warningBg: "#fffbeb",
  warningBorder: "#f59e0b",
  warningInk: "#78350f",
  criticalBg: "#fef2f2",
  criticalBorder: "#dc2626",
  criticalInk: "#7f1d1d",
  infoBg: "#eff6ff",
  infoBorder: "#3b82f6",
  infoInk: "#1e3a8a"
};

// Cor por area (header de tabela e badges)
const AREA_COLORS: Record<string, { bg: string; ink: string }> = {
  plantel: { bg: "#dbeafe", ink: "#1e40af" },
  eggs: { bg: "#fef3c7", ink: "#92400e" },
  incubator: { bg: "#d1fae5", ink: "#065f46" },
  incubatorWarn: { bg: "#fee2e2", ink: "#991b1b" },
  health: { bg: "#fee2e2", ink: "#991b1b" },
  finance: { bg: "#d1fae5", ink: "#065f46" },
  vitrine: { bg: "#e0e7ff", ink: "#3730a3" },
  ranking: { bg: "#fef3c7", ink: "#92400e" }
};

const styles = StyleSheet.create({
  // PAGE / GLOBAL
  page: {
    paddingTop: 70,
    paddingBottom: 50,
    paddingHorizontal: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: PALETTE.ink
  },
  coverPage: {
    padding: 0,
    fontFamily: "Helvetica",
    color: PALETTE.ink
  },

  // CAPA
  coverHero: {
    backgroundColor: PALETTE.brand,
    padding: 40,
    minHeight: 320
  },
  coverLogoBox: {
    width: 90,
    height: 90,
    backgroundColor: PALETTE.surface,
    borderRadius: 8,
    padding: 6,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  coverLogoImg: { width: 78, height: 78, objectFit: "contain" },
  coverLogoFallback: { fontSize: 14, fontWeight: "bold", color: PALETTE.brand, textAlign: "center" },
  coverEyebrow: {
    fontSize: 9,
    color: PALETTE.brandSoft,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8
  },
  coverTitle: {
    fontSize: 32,
    color: PALETTE.surface,
    fontWeight: "bold",
    marginBottom: 6
  },
  coverSubtitle: {
    fontSize: 13,
    color: PALETTE.brandSoft,
    marginBottom: 4
  },
  coverFocusBadge: {
    marginTop: 20,
    alignSelf: "flex-start",
    backgroundColor: PALETTE.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    fontSize: 11,
    fontWeight: "bold",
    color: PALETTE.brand
  },
  coverBody: {
    padding: 40,
    flex: 1
  },
  coverPeriodBlock: {
    marginTop: 0,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: PALETTE.surfaceSoft,
    borderLeftWidth: 4,
    borderLeftColor: PALETTE.brand,
    borderRadius: 4,
    marginBottom: 16
  },
  coverPeriodLabel: {
    fontSize: 9,
    color: PALETTE.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4
  },
  coverPeriodValue: { fontSize: 16, fontWeight: "bold", color: PALETTE.ink },
  coverComparisonText: { fontSize: 9, color: PALETTE.inkSoft, marginTop: 4 },
  coverContactBlock: {
    marginTop: 30,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: PALETTE.line
  },
  coverContactLabel: {
    fontSize: 9,
    color: PALETTE.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6
  },
  coverContactRow: { flexDirection: "row", gap: 18, flexWrap: "wrap" },
  coverContactItem: { fontSize: 10, color: PALETTE.inkSoft },

  // HEADER FIXO (paginas internas)
  pageHeader: {
    position: "absolute",
    top: 20,
    left: 32,
    right: 32,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.line,
    paddingBottom: 6
  },
  pageHeaderLogoBox: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: PALETTE.brandSoft,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  pageHeaderLogoImg: { width: 26, height: 26, objectFit: "contain" },
  pageHeaderTextBlock: { flex: 1 },
  pageHeaderName: { fontSize: 10, fontWeight: "bold", color: PALETTE.ink },
  pageHeaderMeta: { fontSize: 7, color: PALETTE.inkSoft, marginTop: 1 },
  pageHeaderRight: { textAlign: "right" },
  pageHeaderFocus: { fontSize: 9, fontWeight: "bold", color: PALETTE.brand },
  pageHeaderPeriod: { fontSize: 7, color: PALETTE.inkSoft, marginTop: 1 },

  // FOOTER FIXO
  pageFooter: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: PALETTE.inkMuted,
    borderTopWidth: 0.5,
    borderTopColor: PALETTE.line,
    paddingTop: 6
  },
  pageFooterLeft: { fontSize: 7, color: PALETTE.inkMuted },
  pageFooterRight: { fontSize: 7, color: PALETTE.inkMuted },

  // SECOES
  section: { marginTop: 14 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    color: PALETTE.ink
  },
  sectionSubtitle: { fontSize: 8, color: PALETTE.inkSoft, marginBottom: 6, marginTop: -4 },

  // RESUMO EXECUTIVO — KPI HERO (2x2 grande)
  heroKpiGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  heroKpiCard: {
    width: "50%",
    paddingHorizontal: 4,
    marginBottom: 8
  },
  heroKpiInner: {
    borderWidth: 1,
    borderColor: PALETTE.line,
    borderRadius: 6,
    padding: 12,
    backgroundColor: PALETTE.surfaceSoft
  },
  heroKpiLabel: {
    fontSize: 8,
    color: PALETTE.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4
  },
  heroKpiValue: { fontSize: 22, fontWeight: "bold", color: PALETTE.ink },
  heroKpiTrendUp: { marginTop: 6, fontSize: 9, color: PALETTE.positive, fontWeight: "bold" },
  heroKpiTrendDown: { marginTop: 6, fontSize: 9, color: PALETTE.negative, fontWeight: "bold" },
  heroKpiTrendNeutral: { marginTop: 6, fontSize: 9, color: PALETTE.inkMuted },

  // KPIs SECUNDARIOS (compactos)
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -3 },
  kpiCard: {
    width: "33.33%",
    paddingHorizontal: 3,
    marginBottom: 6
  },
  kpiInner: {
    borderWidth: 1,
    borderColor: PALETTE.line,
    borderRadius: 4,
    padding: 6
  },
  kpiLabel: { fontSize: 7, color: PALETTE.inkMuted, textTransform: "uppercase", letterSpacing: 0.4 },
  kpiValue: { marginTop: 2, fontSize: 12, fontWeight: "bold", color: PALETTE.ink },
  kpiTrendUp: { fontSize: 7, color: PALETTE.positive, marginTop: 1, fontWeight: "bold" },
  kpiTrendDown: { fontSize: 7, color: PALETTE.negative, marginTop: 1, fontWeight: "bold" },
  kpiTrendNeutral: { fontSize: 7, color: PALETTE.inkMuted, marginTop: 1 },

  // INSIGHTS GRANDES (resumo executivo)
  insightHero: {
    marginBottom: 6,
    padding: 10,
    borderRadius: 4,
    flexDirection: "row",
    gap: 8
  },
  insightHeroIcon: { fontSize: 16, fontWeight: "bold", width: 22 },
  insightHeroBody: { flex: 1, fontSize: 11, lineHeight: 1.4 },

  // ACTION PLAN
  actionPlanItem: {
    fontSize: 10,
    marginBottom: 5,
    paddingLeft: 16,
    color: PALETTE.ink
  },
  actionBullet: { fontWeight: "bold", color: PALETTE.brand },

  // TABELAS
  table: {
    borderWidth: 1,
    borderColor: PALETTE.line,
    borderRadius: 4,
    overflow: "hidden"
  },
  tableHeaderRow: { flexDirection: "row" },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: PALETTE.line
  },
  tableRowZebra: { backgroundColor: PALETTE.surfaceZebra },
  tableTotalRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: PALETTE.line,
    backgroundColor: "#f1f5f9"
  },
  cell: { flex: 1, paddingHorizontal: 6, paddingVertical: 5, fontSize: 9 },
  cellHead: { flex: 1, paddingHorizontal: 6, paddingVertical: 6, fontSize: 8, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.4 },
  cellNum: { flex: 1, paddingHorizontal: 6, paddingVertical: 5, fontSize: 9, textAlign: "right" },
  cellNumHead: { flex: 1, paddingHorizontal: 6, paddingVertical: 6, fontSize: 8, fontWeight: "bold", textAlign: "right", textTransform: "uppercase", letterSpacing: 0.4 },
  cellTotal: { flex: 1, paddingHorizontal: 6, paddingVertical: 6, fontSize: 9, fontWeight: "bold" },
  cellNumTotal: { flex: 1, paddingHorizontal: 6, paddingVertical: 6, fontSize: 9, fontWeight: "bold", textAlign: "right" },
  empty: { padding: 10, fontSize: 9, color: PALETTE.inkMuted, fontStyle: "italic", textAlign: "center" },

  // RANKINGS COM BARRAS
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    gap: 8
  },
  rankLabel: { width: "40%", fontSize: 9, color: PALETTE.ink },
  rankBarTrack: {
    flex: 1,
    height: 12,
    backgroundColor: PALETTE.surfaceSoft,
    borderRadius: 2,
    overflow: "hidden"
  },
  rankBarFill: {
    height: 12,
    borderRadius: 2
  },
  rankValue: { width: 70, fontSize: 9, fontWeight: "bold", textAlign: "right" }
});

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}
function sexLabel(sex: "FEMALE" | "MALE" | "UNKNOWN"): string {
  return sex === "FEMALE" ? "Fêmea" : sex === "MALE" ? "Macho" : "—";
}
function quarantineStatusLabel(s: string) {
  return s === "ACTIVE" ? "Ativa" : s === "COMPLETED" ? "Concluída" : "Cancelada";
}
function focusLabel(focus: ReportFocus): string {
  if (focus === "PLANTEL") return "Plantel & filhotes";
  if (focus === "EGGS") return "Postura & chocadeira";
  if (focus === "HEALTH") return "Sanidade";
  if (focus === "FINANCE") return "Financeiro & vitrine";
  return "Geral";
}

function trendText(trend: Trend, format: "money" | "percent" | "number"): { text: string; positive: boolean | null } {
  if (trend.deltaPct === null) {
    if (trend.current === 0) return { text: "—", positive: null };
    return { text: "novo", positive: true };
  }
  const sign = trend.deltaPct >= 0 ? "+" : "";
  let text: string;
  if (format === "money") {
    text = `${sign}${trend.deltaPct.toFixed(0)}% (${formatMoney(trend.delta)})`;
  } else {
    text = `${sign}${trend.deltaPct.toFixed(0)}%`;
  }
  return { text, positive: trend.delta >= 0 };
}

// Tabela com cor por area
type Area = keyof typeof AREA_COLORS;
type CellSpec = { value: string; flex?: number; align?: "left" | "right" };

function ThColored({ items, area }: { items: CellSpec[]; area: Area }) {
  const c = AREA_COLORS[area];
  return (
    <View style={[styles.tableHeaderRow, { backgroundColor: c.bg }]}>
      {items.map((it, i) => (
        <Text
          key={i}
          style={[
            it.align === "right" ? styles.cellNumHead : styles.cellHead,
            it.flex ? { flex: it.flex } : {},
            { color: c.ink }
          ]}
        >
          {it.value}
        </Text>
      ))}
    </View>
  );
}

function Td({ items, zebra }: { items: CellSpec[]; zebra?: boolean }) {
  return (
    <View style={[styles.tableRow, zebra ? styles.tableRowZebra : {}]}>
      {items.map((it, i) => (
        <Text
          key={i}
          style={[
            it.align === "right" ? styles.cellNum : styles.cell,
            it.flex ? { flex: it.flex } : {}
          ]}
        >
          {it.value}
        </Text>
      ))}
    </View>
  );
}

function TotalRow({ items }: { items: CellSpec[] }) {
  return (
    <View style={styles.tableTotalRow}>
      {items.map((it, i) => (
        <Text
          key={i}
          style={[
            it.align === "right" ? styles.cellNumTotal : styles.cellTotal,
            it.flex ? { flex: it.flex } : {}
          ]}
        >
          {it.value}
        </Text>
      ))}
    </View>
  );
}

// KPI Hero (2x2 grande, primeira pagina de conteudo)
function HeroKpi({
  label,
  value,
  trend,
  format
}: {
  label: string;
  value: string;
  trend?: Trend;
  format?: "money" | "percent" | "number";
}) {
  const t = trend ? trendText(trend, format ?? "number") : null;
  const trendStyle = t
    ? t.positive === true
      ? styles.heroKpiTrendUp
      : t.positive === false
      ? styles.heroKpiTrendDown
      : styles.heroKpiTrendNeutral
    : null;
  return (
    <View style={styles.heroKpiCard}>
      <View style={styles.heroKpiInner}>
        <Text style={styles.heroKpiLabel}>{label}</Text>
        <Text style={styles.heroKpiValue}>{value}</Text>
        {t && trendStyle ? (
          <Text style={trendStyle}>{t.text} vs período anterior</Text>
        ) : null}
      </View>
    </View>
  );
}

function CompactKpi({
  label,
  value,
  trend,
  format
}: {
  label: string;
  value: string;
  trend?: Trend;
  format?: "money" | "percent" | "number";
}) {
  const t = trend ? trendText(trend, format ?? "number") : null;
  const trendStyle = t
    ? t.positive === true
      ? styles.kpiTrendUp
      : t.positive === false
      ? styles.kpiTrendDown
      : styles.kpiTrendNeutral
    : null;
  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiInner}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={styles.kpiValue}>{value}</Text>
        {t && trendStyle ? <Text style={trendStyle}>{t.text}</Text> : null}
      </View>
    </View>
  );
}

// ranking visual com barra horizontal
function RankBar({
  label,
  value,
  proportion,
  color,
  valueText
}: {
  label: string;
  value: number;
  proportion: number; // 0..1
  color: string;
  valueText: string;
}) {
  const pct = Math.max(0.04, Math.min(1, proportion));
  return (
    <View style={styles.rankRow}>
      <Text style={styles.rankLabel}>{label}</Text>
      <View style={styles.rankBarTrack}>
        <View style={[styles.rankBarFill, { width: `${(pct * 100).toFixed(1)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.rankValue, { color }]}>{valueText}</Text>
    </View>
  );
}

// ============== CONFIG POR FOCO ==============

type PdfFocusConfig = {
  primaryKpis: Array<"eggs" | "hatched" | "hatchRate" | "net" | "totalBirds" | "mortality" | "vaccinated" | "inTreatment" | "cureRate" | "goodEgg" | "revenue" | "ticket" | "daysToSale">;
  secondaryKpis: Array<"revenue" | "soldVitrine" | "mortality" | "vaccinated" | "costPerHatched" | "income" | "expenses">;
  show: {
    financeSummary: boolean;
    topReproducers: boolean;
    bestWorstHatching: boolean;
    bestPosture: boolean;
    flockGroupsTable: boolean;
    eggCollectionsTable: boolean;
    incubatorBatchesTable: boolean;
    quarantineTable: boolean;
    diagnosesTable: boolean;
    vitrineSnapshot: boolean;
    revenueByGroup: boolean;
    newBirds: boolean;
  };
};

const pdfFocusConfigs: Record<ReportFocus, PdfFocusConfig> = {
  GENERAL: {
    primaryKpis: ["eggs", "hatched", "hatchRate", "net"],
    secondaryKpis: ["revenue", "soldVitrine", "mortality", "vaccinated", "costPerHatched"],
    show: {
      financeSummary: true,
      topReproducers: true,
      bestWorstHatching: true,
      bestPosture: false,
      flockGroupsTable: true,
      eggCollectionsTable: true,
      incubatorBatchesTable: false,
      quarantineTable: true,
      diagnosesTable: true,
      vitrineSnapshot: true,
      revenueByGroup: true,
      newBirds: true
    }
  },
  PLANTEL: {
    primaryKpis: ["totalBirds", "hatched", "mortality", "vaccinated"],
    secondaryKpis: [],
    show: {
      financeSummary: false,
      topReproducers: true,
      bestWorstHatching: false,
      bestPosture: false,
      flockGroupsTable: true,
      eggCollectionsTable: false,
      incubatorBatchesTable: false,
      quarantineTable: false,
      diagnosesTable: false,
      vitrineSnapshot: false,
      revenueByGroup: false,
      newBirds: true
    }
  },
  EGGS: {
    primaryKpis: ["eggs", "goodEgg", "hatched", "hatchRate"],
    secondaryKpis: [],
    show: {
      financeSummary: false,
      topReproducers: false,
      bestWorstHatching: true,
      bestPosture: true,
      flockGroupsTable: false,
      eggCollectionsTable: true,
      incubatorBatchesTable: true,
      quarantineTable: false,
      diagnosesTable: false,
      vitrineSnapshot: false,
      revenueByGroup: false,
      newBirds: false
    }
  },
  HEALTH: {
    primaryKpis: ["mortality", "vaccinated", "inTreatment", "cureRate"],
    secondaryKpis: [],
    show: {
      financeSummary: false,
      topReproducers: false,
      bestWorstHatching: false,
      bestPosture: false,
      flockGroupsTable: false,
      eggCollectionsTable: false,
      incubatorBatchesTable: false,
      quarantineTable: true,
      diagnosesTable: true,
      vitrineSnapshot: false,
      revenueByGroup: false,
      newBirds: false
    }
  },
  FINANCE: {
    primaryKpis: ["net", "revenue", "ticket", "daysToSale"],
    secondaryKpis: ["income", "expenses", "costPerHatched"],
    show: {
      financeSummary: true,
      topReproducers: false,
      bestWorstHatching: false,
      bestPosture: false,
      flockGroupsTable: false,
      eggCollectionsTable: false,
      incubatorBatchesTable: false,
      quarantineTable: false,
      diagnosesTable: false,
      vitrineSnapshot: true,
      revenueByGroup: true,
      newBirds: false
    }
  }
};

function renderPdfKpi(
  key: PdfFocusConfig["primaryKpis"][number] | PdfFocusConfig["secondaryKpis"][number],
  data: ReportData,
  variant: "hero" | "compact"
) {
  const k = data.kpis;
  const Comp = variant === "hero" ? HeroKpi : CompactKpi;
  switch (key) {
    case "eggs":
      return <Comp key={key} label="Ovos no período" value={String(k.eggsTotal)} trend={data.trends.eggsTotal} format="number" />;
    case "hatched":
      return <Comp key={key} label="Filhotes nascidos" value={String(k.totalHatched)} trend={data.trends.totalHatched} format="number" />;
    case "hatchRate":
      return <Comp key={key} label="Taxa de eclosão" value={`${k.hatchRate.toFixed(1)}%`} trend={data.trends.hatchRate} format="percent" />;
    case "net":
      return <Comp key={key} label="Resultado financeiro" value={formatMoney(k.monthNet)} trend={data.trends.monthNet} format="money" />;
    case "totalBirds":
      return <Comp key={key} label="Total de aves" value={String(k.totalBirds)} />;
    case "mortality":
      return <Comp key={key} label="Mortalidade" value={`${k.mortalityRate.toFixed(1)}%`} />;
    case "vaccinated":
      return <Comp key={key} label="Vacinação" value={`${k.vaccinatedRate.toFixed(1)}%`} />;
    case "inTreatment":
      return <Comp key={key} label="Em tratamento" value={String(k.inTreatment)} />;
    case "cureRate":
      return <Comp key={key} label="Taxa de cura" value={`${k.cureRate.toFixed(1)}%`} />;
    case "goodEgg":
      return <Comp key={key} label="Ovos bons" value={`${k.goodEggRate.toFixed(1)}%`} />;
    case "revenue":
      return <Comp key={key} label="Receita vitrine" value={formatMoney(k.totalRevenueVitrine)} trend={data.trends.totalRevenueVitrine} format="money" />;
    case "soldVitrine":
      return <Comp key={key} label="Aves vendidas" value={String(k.totalSoldVitrine)} trend={data.trends.totalSoldVitrine} format="number" />;
    case "ticket":
      return <Comp key={key} label="Ticket médio" value={k.avgTicket > 0 ? formatMoney(k.avgTicket) : "—"} />;
    case "daysToSale":
      return <Comp key={key} label="Dias até venda" value={k.avgDaysToSale > 0 ? `${k.avgDaysToSale}d` : "—"} />;
    case "costPerHatched":
      return <Comp key={key} label="Custo / filhote" value={k.costPerHatched > 0 ? formatMoney(k.costPerHatched) : "—"} />;
    case "income":
      return <Comp key={key} label="Entradas" value={formatMoney(k.monthIncome)} trend={data.trends.monthIncome} format="money" />;
    case "expenses":
      return <Comp key={key} label="Saídas" value={formatMoney(k.monthExpenses)} trend={data.trends.monthExpenses} format="money" />;
    default:
      return null;
  }
}

// Plano de acao a partir dos insights
function buildActionPlan(insights: Insight[]): string[] {
  const items: string[] = [];
  for (const insight of insights) {
    if (insight.severity === "critical" || insight.severity === "warning") {
      // Heuristicas simples de "transformar diagnostico em acao"
      const text = insight.text;
      if (/eclosão.*baix/i.test(text) || /eclosão.*\d+%.*baix/i.test(text)) {
        items.push("Calibrar temperatura/umidade das chocadeiras com pior eclosão.");
      } else if (/mortalidade/i.test(text)) {
        items.push("Investigar causas da mortalidade elevada no plantel — revisar manejo e biossegurança.");
      } else if (/vacin/i.test(text)) {
        items.push("Programar vacinação das aves não cobertas — aves vacinadas valorizam mais.");
      } else if (/trincados/i.test(text) || /ovos bons/i.test(text)) {
        items.push("Revisar manejo de ninhos e coleta para reduzir trincados.");
      } else if (/sem preço/i.test(text) || /preço cadastrado/i.test(text)) {
        items.push("Cadastrar tabela de preço para os anúncios da Vitrine sem preço.");
      } else if (/negativo/i.test(text) || /resultado.*caiu/i.test(text)) {
        items.push("Revisar custos do período e priorizar vendas para melhorar o caixa.");
      } else {
        items.push(text);
      }
    }
  }
  if (items.length === 0) {
    items.push("Manter o ritmo. Nenhum alerta crítico no período.");
  }
  // dedup
  return Array.from(new Set(items)).slice(0, 6);
}

// ============== CAPA ==============

function CoverPage({
  data,
  tenant
}: {
  data: ReportData;
  tenant: TenantHeader;
}) {
  const cityState = [tenant.city, tenant.stateUf].filter(Boolean).join(" / ");
  return (
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverHero}>
        <View style={styles.coverLogoBox}>
          {tenant.logoUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image style={styles.coverLogoImg} src={tenant.logoUrl} />
          ) : (
            <Text style={styles.coverLogoFallback}>{tenant.name.slice(0, 3).toUpperCase()}</Text>
          )}
        </View>
        <Text style={styles.coverEyebrow}>Relatório do criatório</Text>
        <Text style={styles.coverTitle}>{tenant.name}</Text>
        {tenant.legalName ? (
          <Text style={styles.coverSubtitle}>{tenant.legalName}</Text>
        ) : null}
        {cityState ? <Text style={styles.coverSubtitle}>{cityState}</Text> : null}
        <Text style={styles.coverFocusBadge}>{focusLabel(data.focus).toUpperCase()}</Text>
      </View>

      <View style={styles.coverBody}>
        <View style={styles.coverPeriodBlock}>
          <Text style={styles.coverPeriodLabel}>Período do relatório</Text>
          <Text style={styles.coverPeriodValue}>{data.period.label}</Text>
          {data.comparisonPeriod ? (
            <Text style={styles.coverComparisonText}>
              Comparado com período anterior: {data.comparisonPeriod.label}
            </Text>
          ) : null}
        </View>

        <View style={styles.coverContactBlock}>
          <Text style={styles.coverContactLabel}>Contato</Text>
          <View style={styles.coverContactRow}>
            {tenant.email ? <Text style={styles.coverContactItem}>Email: {tenant.email}</Text> : null}
            {tenant.phone ? <Text style={styles.coverContactItem}>Tel: {tenant.phone}</Text> : null}
            {tenant.whatsapp ? <Text style={styles.coverContactItem}>WhatsApp: {tenant.whatsapp}</Text> : null}
            {tenant.cnpj ? <Text style={styles.coverContactItem}>CNPJ: {tenant.cnpj}</Text> : null}
          </View>
        </View>

        <Text style={[styles.coverContactItem, { marginTop: 30, fontSize: 8, color: PALETTE.inkMuted }]}>
          Gerado em {new Date(data.generatedAt).toLocaleString("pt-BR")} pelo Ornabird — Gestão de Criatórios Ornamentais.
        </Text>
      </View>
    </Page>
  );
}

// ============== HEADER E FOOTER FIXOS ==============

function PageHeader({ data, tenant }: { data: ReportData; tenant: TenantHeader }) {
  return (
    <View style={styles.pageHeader} fixed>
      <View style={styles.pageHeaderLogoBox}>
        {tenant.logoUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image style={styles.pageHeaderLogoImg} src={tenant.logoUrl} />
        ) : (
          <Text style={{ fontSize: 8, fontWeight: "bold", color: PALETTE.brand }}>
            {tenant.name.slice(0, 2).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.pageHeaderTextBlock}>
        <Text style={styles.pageHeaderName}>{tenant.name}</Text>
        <Text style={styles.pageHeaderMeta}>Relatório · {data.period.label}</Text>
      </View>
      <View style={styles.pageHeaderRight}>
        <Text style={styles.pageHeaderFocus}>{focusLabel(data.focus).toUpperCase()}</Text>
        <Text style={styles.pageHeaderPeriod}>
          Gerado {new Date(data.generatedAt).toLocaleDateString("pt-BR")}
        </Text>
      </View>
    </View>
  );
}

function PageFooter({ tenant }: { tenant: TenantHeader }) {
  const contactBits: string[] = [];
  if (tenant.city || tenant.stateUf) contactBits.push([tenant.city, tenant.stateUf].filter(Boolean).join("/"));
  if (tenant.email) contactBits.push(tenant.email);
  if (tenant.phone) contactBits.push(tenant.phone);
  return (
    <View style={styles.pageFooter} fixed>
      <Text style={styles.pageFooterLeft}>
        {contactBits.length > 0 ? contactBits.join(" · ") : "Documento gerado pelo Ornabird"}
      </Text>
      <Text
        style={styles.pageFooterRight}
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
      />
    </View>
  );
}

// ============== DOCUMENTO ==============

function ReportPdfDoc({ data, tenant }: { data: ReportData; tenant: TenantHeader }) {
  const t = data.tables;
  const cfg = pdfFocusConfigs[data.focus];
  const actionPlan = buildActionPlan(data.insights);

  // calcula proporção pra rankings (usado em barras horizontais)
  const reproducersMax = Math.max(1, ...t.topReproducers.map((r) => r.daughters));
  const postureMax = Math.max(1, ...t.bestPosture.map((p) => p.total));
  const revenueMax = Math.max(1, ...t.vitrineSales.byGroup.map((v) => v.revenue));

  return (
    <Document>
      {/* PAGINA 1+: CONTEUDO (capa removida — pouco util pra impressao) */}
      <Page size="A4" style={styles.page}>
        <PageHeader data={data} tenant={tenant} />
        <PageFooter tenant={tenant} />

        {/* RESUMO EXECUTIVO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo executivo</Text>
          <Text style={styles.sectionSubtitle}>
            Indicadores principais com comparação automática vs período anterior
          </Text>
          <View style={styles.heroKpiGrid}>
            {cfg.primaryKpis.map((k) => renderPdfKpi(k, data, "hero"))}
          </View>
        </View>

        {/* INSIGHTS GRANDES */}
        {data.insights.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Insights do período</Text>
            {data.insights.slice(0, 5).map((insight, i) => {
              const colors =
                insight.severity === "critical"
                  ? { bg: PALETTE.criticalBg, border: PALETTE.criticalBorder, ink: PALETTE.criticalInk, icon: "!" }
                  : insight.severity === "warning"
                  ? { bg: PALETTE.warningBg, border: PALETTE.warningBorder, ink: PALETTE.warningInk, icon: "!" }
                  : { bg: PALETTE.infoBg, border: PALETTE.infoBorder, ink: PALETTE.infoInk, icon: "i" };
              return (
                <View
                  key={i}
                  style={[
                    styles.insightHero,
                    { backgroundColor: colors.bg, borderLeftWidth: 4, borderLeftColor: colors.border }
                  ]}
                >
                  <Text style={[styles.insightHeroIcon, { color: colors.border }]}>{colors.icon}</Text>
                  <Text style={[styles.insightHeroBody, { color: colors.ink }]}>{insight.text}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* PLANO DE ACAO */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Plano de ação sugerido</Text>
          {actionPlan.map((step, i) => (
            <Text key={i} style={styles.actionPlanItem}>
              <Text style={styles.actionBullet}>{i + 1}.</Text>  {step}
            </Text>
          ))}
        </View>

        {/* KPIs SECUNDARIOS (compactos) */}
        {cfg.secondaryKpis.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Indicadores complementares</Text>
            <View style={styles.kpiGrid}>
              {cfg.secondaryKpis.map((k) => renderPdfKpi(k, data, "compact"))}
            </View>
          </View>
        ) : null}

        {/* RESUMO FINANCEIRO */}
        {cfg.show.financeSummary ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Resumo financeiro</Text>
            <View style={styles.table}>
              <ThColored
                area="finance"
                items={[
                  { value: "Entradas" },
                  { value: "Saídas" },
                  { value: "Líquido" },
                  { value: "Ticket médio" },
                  { value: "Dias até venda" }
                ]}
              />
              <Td
                items={[
                  { value: formatMoney(data.kpis.monthIncome) },
                  { value: formatMoney(data.kpis.monthExpenses) },
                  { value: formatMoney(data.kpis.monthNet) },
                  { value: data.kpis.avgTicket > 0 ? formatMoney(data.kpis.avgTicket) : "—" },
                  { value: data.kpis.avgDaysToSale > 0 ? `${data.kpis.avgDaysToSale}d` : "—" }
                ]}
              />
            </View>
          </View>
        ) : null}

        {/* RANKING: TOP REPRODUTORES (barras horizontais) */}
        {cfg.show.topReproducers && t.topReproducers.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Top reprodutores</Text>
            <Text style={styles.sectionSubtitle}>Lotes pais com mais filhotes no período</Text>
            {t.topReproducers.map((r, i) => (
              <RankBar
                key={i}
                label={r.group}
                value={r.daughters}
                proportion={r.daughters / reproducersMax}
                color={AREA_COLORS.ranking.ink}
                valueText={`${r.daughters} filhotes (${r.matrices > 0 ? `${r.productivity}/matriz` : "—"})`}
              />
            ))}
          </View>
        ) : null}

        {/* MELHORES ECLOSOES */}
        {cfg.show.bestWorstHatching && t.bestHatching.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Melhores eclosões</Text>
            <View style={styles.table}>
              <ThColored
                area="incubator"
                items={[
                  { value: "Chocadeira", flex: 1.5 },
                  { value: "Lote", flex: 1.5 },
                  { value: "Ovos", align: "right" },
                  { value: "Nascidos", align: "right" },
                  { value: "Eclosão", align: "right" }
                ]}
              />
              {t.bestHatching.map((b, i) => (
                <Td
                  key={`best-${i}`}
                  zebra={i % 2 === 1}
                  items={[
                    { value: b.incubator, flex: 1.5 },
                    { value: b.group, flex: 1.5 },
                    { value: String(b.eggsSet), align: "right" },
                    { value: String(b.hatched), align: "right" },
                    { value: `${b.hatchRate.toFixed(1)}%`, align: "right" }
                  ]}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* ECLOSOES ABAIXO DA MEDIA */}
        {cfg.show.bestWorstHatching && t.worstHatching.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Eclosões abaixo da média</Text>
            <Text style={styles.sectionSubtitle}>Investigar temperatura e umidade dessas chocadeiras</Text>
            <View style={styles.table}>
              <ThColored
                area="incubatorWarn"
                items={[
                  { value: "Chocadeira", flex: 1.5 },
                  { value: "Lote", flex: 1.5 },
                  { value: "Ovos", align: "right" },
                  { value: "Nascidos", align: "right" },
                  { value: "Eclosão", align: "right" }
                ]}
              />
              {t.worstHatching.map((b, i) => (
                <Td
                  key={`worst-${i}`}
                  zebra={i % 2 === 1}
                  items={[
                    { value: b.incubator, flex: 1.5 },
                    { value: b.group, flex: 1.5 },
                    { value: String(b.eggsSet), align: "right" },
                    { value: String(b.hatched), align: "right" },
                    { value: `${b.hatchRate.toFixed(1)}%`, align: "right" }
                  ]}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* RANKING: MAIORES POSTURAS (barras) */}
        {cfg.show.bestPosture && t.bestPosture.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Maiores posturas</Text>
            <Text style={styles.sectionSubtitle}>Lotes que mais coletaram ovos</Text>
            {t.bestPosture.map((p, i) => (
              <RankBar
                key={i}
                label={p.group}
                value={p.total}
                proportion={p.total / postureMax}
                color={AREA_COLORS.eggs.ink}
                valueText={`${p.total} ovos · ${p.goodRate.toFixed(1)}% bons`}
              />
            ))}
          </View>
        ) : null}

        {/* PLANTEL POR GRUPO */}
        {cfg.show.flockGroupsTable ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Plantel por grupo</Text>
            <View style={styles.table}>
              <ThColored
                area="plantel"
                items={[
                  { value: "Grupo", flex: 2 },
                  { value: "Espécie/Raça", flex: 2 },
                  { value: "Total", align: "right" },
                  { value: "Ativas", align: "right" },
                  { value: "Doentes", align: "right" },
                  { value: "Mortas", align: "right" }
                ]}
              />
              {t.flockGroups.length === 0 ? (
                <Text style={styles.empty}>Nenhum grupo cadastrado.</Text>
              ) : (
                <>
                  {t.flockGroups.slice(0, 12).map((g, i) => (
                    <Td
                      key={i}
                      zebra={i % 2 === 1}
                      items={[
                        { value: g.title, flex: 2 },
                        { value: `${g.species}/${g.breed}${g.variety ? "/" + g.variety : ""}`, flex: 2 },
                        { value: String(g.totalBirds), align: "right" },
                        { value: String(g.active), align: "right" },
                        { value: String(g.sick), align: "right" },
                        { value: String(g.dead), align: "right" }
                      ]}
                    />
                  ))}
                  <TotalRow
                    items={[
                      { value: "Total", flex: 2 },
                      { value: "", flex: 2 },
                      { value: String(t.flockGroups.reduce((s, g) => s + g.totalBirds, 0)), align: "right" },
                      { value: String(t.flockGroups.reduce((s, g) => s + g.active, 0)), align: "right" },
                      { value: String(t.flockGroups.reduce((s, g) => s + g.sick, 0)), align: "right" },
                      { value: String(t.flockGroups.reduce((s, g) => s + g.dead, 0)), align: "right" }
                    ]}
                  />
                </>
              )}
            </View>
          </View>
        ) : null}

        {/* COLETA DE OVOS */}
        {cfg.show.eggCollectionsTable && t.eggCollectionsByGroup.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Coleta de ovos por grupo</Text>
            <View style={styles.table}>
              <ThColored
                area="eggs"
                items={[
                  { value: "Grupo", flex: 2 },
                  { value: "Total", align: "right" },
                  { value: "Bons", align: "right" },
                  { value: "Trincados", align: "right" },
                  { value: "% Bons", align: "right" }
                ]}
              />
              {t.eggCollectionsByGroup.slice(0, 12).map((c, i) => (
                <Td
                  key={i}
                  zebra={i % 2 === 1}
                  items={[
                    { value: c.group, flex: 2 },
                    { value: String(c.total), align: "right" },
                    { value: String(c.good), align: "right" },
                    { value: String(c.cracked), align: "right" },
                    { value: `${c.goodRate.toFixed(1)}%`, align: "right" }
                  ]}
                />
              ))}
              <TotalRow
                items={[
                  { value: "Total", flex: 2 },
                  { value: String(t.eggCollectionsByGroup.reduce((s, c) => s + c.total, 0)), align: "right" },
                  { value: String(t.eggCollectionsByGroup.reduce((s, c) => s + c.good, 0)), align: "right" },
                  { value: String(t.eggCollectionsByGroup.reduce((s, c) => s + c.cracked, 0)), align: "right" },
                  { value: "", align: "right" }
                ]}
              />
            </View>
          </View>
        ) : null}

        {/* CHOCADEIRAS */}
        {cfg.show.incubatorBatchesTable && t.incubatorBatches.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Chocadeiras e lotes</Text>
            <View style={styles.table}>
              <ThColored
                area="incubator"
                items={[
                  { value: "Chocadeira", flex: 1.5 },
                  { value: "Grupo", flex: 1.5 },
                  { value: "Ovos", align: "right" },
                  { value: "Nascidos", align: "right" },
                  { value: "Inférteis", align: "right" },
                  { value: "Eclosão", align: "right" }
                ]}
              />
              {t.incubatorBatches.slice(0, 12).map((b, i) => (
                <Td
                  key={i}
                  zebra={i % 2 === 1}
                  items={[
                    { value: b.incubator, flex: 1.5 },
                    { value: b.group, flex: 1.5 },
                    { value: String(b.eggsSet), align: "right" },
                    { value: String(b.hatched), align: "right" },
                    { value: String(b.infertile), align: "right" },
                    { value: `${b.hatchRate.toFixed(1)}%`, align: "right" }
                  ]}
                />
              ))}
              <TotalRow
                items={[
                  { value: "Total", flex: 1.5 },
                  { value: "", flex: 1.5 },
                  { value: String(t.incubatorBatches.reduce((s, b) => s + b.eggsSet, 0)), align: "right" },
                  { value: String(t.incubatorBatches.reduce((s, b) => s + b.hatched, 0)), align: "right" },
                  { value: String(t.incubatorBatches.reduce((s, b) => s + b.infertile, 0)), align: "right" },
                  { value: "", align: "right" }
                ]}
              />
            </View>
          </View>
        ) : null}

        {/* VITRINE SNAPSHOT */}
        {cfg.show.vitrineSnapshot ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Vitrine — estoque atual</Text>
            <View style={styles.table}>
              <ThColored
                area="vitrine"
                items={[
                  { value: "Grupo", flex: 1.5 },
                  { value: "Anúncio", flex: 2 },
                  { value: "Idade", align: "right" },
                  { value: "Disp.", align: "right" },
                  { value: "Preço un.", align: "right" },
                  { value: "Estoque", align: "right" }
                ]}
              />
              {t.vitrineSnapshot.length === 0 ? (
                <Text style={styles.empty}>Sem aves disponíveis na vitrine.</Text>
              ) : (
                <>
                  {t.vitrineSnapshot.slice(0, 14).map((v, i) => (
                    <Td
                      key={i}
                      zebra={i % 2 === 1}
                      items={[
                        { value: v.group, flex: 1.5 },
                        { value: v.title, flex: 2 },
                        { value: `${v.ageMonths}m`, align: "right" },
                        { value: String(v.available), align: "right" },
                        { value: v.currentPrice !== null ? formatMoney(v.currentPrice) : "—", align: "right" },
                        { value: formatMoney(v.stockValue), align: "right" }
                      ]}
                    />
                  ))}
                  <TotalRow
                    items={[
                      { value: "Total", flex: 1.5 },
                      { value: "", flex: 2 },
                      { value: "", align: "right" },
                      { value: String(t.vitrineSnapshot.reduce((s, v) => s + v.available, 0)), align: "right" },
                      { value: "", align: "right" },
                      { value: formatMoney(t.vitrineSnapshot.reduce((s, v) => s + v.stockValue, 0)), align: "right" }
                    ]}
                  />
                </>
              )}
            </View>
          </View>
        ) : null}

        {/* RECEITA POR GRUPO (barras) */}
        {cfg.show.revenueByGroup && t.vitrineSales.byGroup.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Receita por grupo (vitrine)</Text>
            {t.vitrineSales.byGroup.slice(0, 8).map((row, i) => (
              <RankBar
                key={i}
                label={row.group}
                value={row.revenue}
                proportion={row.revenue / revenueMax}
                color={AREA_COLORS.finance.ink}
                valueText={`${row.sold}× · ${formatMoney(row.revenue)}`}
              />
            ))}
            <View style={[styles.tableTotalRow, { marginTop: 6, borderRadius: 4 }]}>
              <Text style={[styles.cellTotal, { flex: 2 }]}>Total geral</Text>
              <Text style={styles.cellNumTotal}>{t.vitrineSales.totalSold} aves</Text>
              <Text style={styles.cellNumTotal}>{formatMoney(t.vitrineSales.totalRevenue)}</Text>
            </View>
          </View>
        ) : null}

        {/* QUARENTENA */}
        {cfg.show.quarantineTable ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Quarentenas (ativas + iniciadas no período)</Text>
            <View style={styles.table}>
              <ThColored
                area="health"
                items={[
                  { value: "Anilha", flex: 1 },
                  { value: "Grupo", flex: 1.5 },
                  { value: "Enfermaria", flex: 1.5 },
                  { value: "Entrada", align: "right" },
                  { value: "Saída prev.", align: "right" },
                  { value: "Status", align: "right" },
                  { value: "Trat.", align: "right" }
                ]}
              />
              {t.quarantineCases.length === 0 ? (
                <Text style={styles.empty}>Sem quarentenas no período.</Text>
              ) : (
                t.quarantineCases.slice(0, 14).map((q, i) => (
                  <Td
                    key={i}
                    zebra={i % 2 === 1}
                    items={[
                      { value: q.ringNumber, flex: 1 },
                      { value: q.group, flex: 1.5 },
                      { value: q.infirmary, flex: 1.5 },
                      { value: fmtDate(q.entryDate), align: "right" },
                      { value: fmtDate(q.expectedExitDate), align: "right" },
                      { value: quarantineStatusLabel(q.status), align: "right" },
                      { value: String(q.treatmentsCount), align: "right" }
                    ]}
                  />
                ))
              )}
            </View>
          </View>
        ) : null}

        {/* DIAGNOSTICOS */}
        {cfg.show.diagnosesTable && t.topDiagnoses.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Diagnósticos recorrentes</Text>
            <View style={styles.table}>
              <ThColored
                area="health"
                items={[
                  { value: "Diagnóstico", flex: 3 },
                  { value: "Ocorrências", align: "right" }
                ]}
              />
              {t.topDiagnoses.slice(0, 8).map((d, i) => (
                <Td
                  key={i}
                  zebra={i % 2 === 1}
                  items={[
                    { value: d.diagnosis, flex: 3 },
                    { value: String(d.count), align: "right" }
                  ]}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* NOVAS AVES NO PLANTEL */}
        {cfg.show.newBirds && t.newBirds.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Novas aves no plantel</Text>
            <View style={styles.table}>
              <ThColored
                area="plantel"
                items={[
                  { value: "Anilha", flex: 1 },
                  { value: "Grupo", flex: 1.5 },
                  { value: "Sexo", flex: 0.8 },
                  { value: "Aquisição", align: "right" },
                  { value: "Origem", flex: 1.5 },
                  { value: "Custo", align: "right" }
                ]}
              />
              {t.newBirds.slice(0, 14).map((b, i) => (
                <Td
                  key={i}
                  zebra={i % 2 === 1}
                  items={[
                    { value: b.ringNumber, flex: 1 },
                    { value: b.group, flex: 1.5 },
                    { value: sexLabel(b.sex), flex: 0.8 },
                    { value: fmtDate(b.acquisitionDate), align: "right" },
                    { value: b.origin ?? "—", flex: 1.5 },
                    { value: b.purchaseValue !== null ? formatMoney(b.purchaseValue) : "—", align: "right" }
                  ]}
                />
              ))}
            </View>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export async function generateReportPdf(data: ReportData, tenant: TenantHeader) {
  return renderToBuffer(<ReportPdfDoc data={data} tenant={tenant} />);
}
