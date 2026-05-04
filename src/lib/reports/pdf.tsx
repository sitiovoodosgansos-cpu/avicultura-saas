import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer
} from "@react-pdf/renderer";
import { ReportData, ReportFocus, Trend } from "@/lib/reports/service";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1f2937"
  },
  header: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 8
  },
  title: { fontSize: 18, fontWeight: "bold", color: "#0f766e" },
  subtitle: { marginTop: 3, fontSize: 9, color: "#4b5563" },
  badge: {
    marginTop: 4,
    fontSize: 8,
    color: "#0f766e",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  section: { marginTop: 12 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  kpiCard: {
    width: "32%",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    padding: 5,
    marginBottom: 4
  },
  kpiLabel: { fontSize: 7, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.3 },
  kpiValue: { marginTop: 2, fontSize: 11, fontWeight: "bold" },
  kpiValueSmall: { marginTop: 2, fontSize: 9, fontWeight: "bold" },
  kpiTrendUp: { fontSize: 7, color: "#047857", marginTop: 1 },
  kpiTrendDown: { fontSize: 7, color: "#b91c1c", marginTop: 1 },
  kpiTrendNeutral: { fontSize: 7, color: "#6b7280", marginTop: 1 },
  table: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 3
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6"
  },
  headerRow: { backgroundColor: "#f3f4f6" },
  cell: { flex: 1, padding: 4, fontSize: 8 },
  cellHead: { flex: 1, padding: 4, fontSize: 7, fontWeight: "bold", color: "#374151", textTransform: "uppercase", letterSpacing: 0.3 },
  cellNum: { flex: 1, padding: 4, fontSize: 8, textAlign: "right" },
  cellNumHead: { flex: 1, padding: 4, fontSize: 7, fontWeight: "bold", color: "#374151", textAlign: "right", textTransform: "uppercase", letterSpacing: 0.3 },
  empty: { padding: 6, fontSize: 8, color: "#9ca3af", fontStyle: "italic", textAlign: "center" },
  insightCritical: {
    marginBottom: 4,
    padding: 6,
    backgroundColor: "#fef2f2",
    borderLeftWidth: 3,
    borderLeftColor: "#dc2626",
    fontSize: 9,
    color: "#7f1d1d"
  },
  insightWarning: {
    marginBottom: 4,
    padding: 6,
    backgroundColor: "#fffbeb",
    borderLeftWidth: 3,
    borderLeftColor: "#d97706",
    fontSize: 9,
    color: "#78350f"
  },
  insightInfo: {
    marginBottom: 4,
    padding: 6,
    backgroundColor: "#eff6ff",
    borderLeftWidth: 3,
    borderLeftColor: "#2563eb",
    fontSize: 9,
    color: "#1e3a8a"
  },
  rankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
    fontSize: 8
  },
  rankLabel: { flex: 3 },
  rankValue: { flex: 1, textAlign: "right", fontWeight: "bold" },
  footer: {
    marginTop: 18,
    fontSize: 7,
    color: "#9ca3af",
    textAlign: "center"
  }
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

type CellSpec = { value: string; flex?: number; align?: "left" | "right" };

function Th({ items }: { items: CellSpec[] }) {
  return (
    <View style={[styles.row, styles.headerRow]}>
      {items.map((it, i) => (
        <Text
          key={i}
          style={[
            it.align === "right" ? styles.cellNumHead : styles.cellHead,
            it.flex ? { flex: it.flex } : {}
          ]}
        >
          {it.value}
        </Text>
      ))}
    </View>
  );
}

function Td({ items }: { items: CellSpec[] }) {
  return (
    <View style={styles.row}>
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

function KpiBox({
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
  const arrow = t?.positive === true ? "▲" : t?.positive === false ? "▼" : "";
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {t && trendStyle ? (
        <Text style={trendStyle}>
          {arrow} {t.text} vs anterior
        </Text>
      ) : null}
    </View>
  );
}

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

function renderPdfKpi(key: PdfFocusConfig["primaryKpis"][number] | PdfFocusConfig["secondaryKpis"][number], data: ReportData) {
  const k = data.kpis;
  switch (key) {
    case "eggs":
      return <KpiBox key={key} label="Ovos no período" value={String(k.eggsTotal)} trend={data.trends.eggsTotal} format="number" />;
    case "hatched":
      return <KpiBox key={key} label="Filhotes nascidos" value={String(k.totalHatched)} trend={data.trends.totalHatched} format="number" />;
    case "hatchRate":
      return <KpiBox key={key} label="Taxa de eclosão" value={`${k.hatchRate.toFixed(1)}%`} trend={data.trends.hatchRate} format="percent" />;
    case "net":
      return <KpiBox key={key} label="Resultado financeiro" value={formatMoney(k.monthNet)} trend={data.trends.monthNet} format="money" />;
    case "totalBirds":
      return <KpiBox key={key} label="Total de aves" value={String(k.totalBirds)} />;
    case "mortality":
      return <KpiBox key={key} label="Mortalidade" value={`${k.mortalityRate.toFixed(1)}%`} />;
    case "vaccinated":
      return <KpiBox key={key} label="Vacinação" value={`${k.vaccinatedRate.toFixed(1)}%`} />;
    case "inTreatment":
      return <KpiBox key={key} label="Em tratamento" value={String(k.inTreatment)} />;
    case "cureRate":
      return <KpiBox key={key} label="Taxa de cura" value={`${k.cureRate.toFixed(1)}%`} />;
    case "goodEgg":
      return <KpiBox key={key} label="Ovos bons" value={`${k.goodEggRate.toFixed(1)}%`} />;
    case "revenue":
      return <KpiBox key={key} label="Receita vitrine" value={formatMoney(k.totalRevenueVitrine)} trend={data.trends.totalRevenueVitrine} format="money" />;
    case "soldVitrine":
      return <KpiBox key={key} label="Aves vendidas" value={String(k.totalSoldVitrine)} trend={data.trends.totalSoldVitrine} format="number" />;
    case "ticket":
      return <KpiBox key={key} label="Ticket médio" value={k.avgTicket > 0 ? formatMoney(k.avgTicket) : "—"} />;
    case "daysToSale":
      return <KpiBox key={key} label="Dias até venda" value={k.avgDaysToSale > 0 ? `${k.avgDaysToSale}d` : "—"} />;
    case "costPerHatched":
      return <KpiBox key={key} label="Custo / filhote" value={k.costPerHatched > 0 ? formatMoney(k.costPerHatched) : "—"} />;
    case "income":
      return <KpiBox key={key} label="Entradas" value={formatMoney(k.monthIncome)} trend={data.trends.monthIncome} format="money" />;
    case "expenses":
      return <KpiBox key={key} label="Saídas" value={formatMoney(k.monthExpenses)} trend={data.trends.monthExpenses} format="money" />;
    default:
      return null;
  }
}

function ReportPdfDoc({ data, farmName }: { data: ReportData; farmName: string }) {
  const t = data.tables;
  const cfg = pdfFocusConfigs[data.focus];

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Text style={styles.title}>Relatório do Criatório</Text>
          <Text style={styles.subtitle}>{farmName}</Text>
          <Text style={styles.subtitle}>Período: {data.period.label}</Text>
          {data.comparisonPeriod ? (
            <Text style={styles.subtitle}>Comparado com: {data.comparisonPeriod.label}</Text>
          ) : null}
          <Text style={styles.subtitle}>
            Gerado em: {new Date(data.generatedAt).toLocaleString("pt-BR")}
          </Text>
          <Text style={styles.badge}>{focusLabel(data.focus)}</Text>
        </View>

        {/* INSIGHTS - sempre no topo */}
        {data.insights.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>💡 Insights do período</Text>
            {data.insights.map((insight, i) => {
              const style =
                insight.severity === "critical"
                  ? styles.insightCritical
                  : insight.severity === "warning"
                  ? styles.insightWarning
                  : styles.insightInfo;
              const icon =
                insight.severity === "critical"
                  ? "[CRITICO]"
                  : insight.severity === "warning"
                  ? "[ALERTA]"
                  : "[INFO]";
              return (
                <Text key={i} style={style}>
                  {icon} {insight.text}
                </Text>
              );
            })}
          </View>
        ) : null}

        {/* KPIs principais com tendência (variam por foco) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicadores principais</Text>
          <View style={styles.kpiGrid}>
            {cfg.primaryKpis.map((k) => renderPdfKpi(k, data))}
            {cfg.secondaryKpis.map((k) => renderPdfKpi(k, data))}
          </View>
        </View>

        {true ? (
          <>
            {/* Resumo financeiro */}
            {cfg.show.financeSummary ? (
              <View style={styles.section} wrap={false}>
                <Text style={styles.sectionTitle}>Resumo financeiro</Text>
                <View style={styles.table}>
                  <Th items={[{ value: "Entradas" }, { value: "Saídas" }, { value: "Líquido" }, { value: "Ticket médio" }, { value: "Dias até venda" }]} />
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

            {/* RANKINGS */}
            {cfg.show.topReproducers && t.topReproducers.length > 0 ? (
              <View style={styles.section} wrap={false}>
                <Text style={styles.sectionTitle}>🏆 Top 5 reprodutores (filhotes no período)</Text>
                <View style={styles.table}>
                  <Th
                    items={[
                      { value: "Lote", flex: 2 },
                      { value: "Filhotes", align: "right" },
                      { value: "Matrizes", align: "right" },
                      { value: "Por matriz", align: "right" }
                    ]}
                  />
                  {t.topReproducers.map((r, i) => (
                    <Td
                      key={i}
                      items={[
                        { value: r.group, flex: 2 },
                        { value: String(r.daughters), align: "right" },
                        { value: String(r.matrices), align: "right" },
                        { value: String(r.productivity), align: "right" }
                      ]}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {cfg.show.bestWorstHatching && (t.bestHatching.length > 0 || t.worstHatching.length > 0) ? (
              <View style={styles.section} wrap={false}>
                <Text style={styles.sectionTitle}>🐣 Eclosões — melhores e piores</Text>
                <View style={styles.table}>
                  <Th
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
                      items={[
                        { value: `↑ ${b.incubator}`, flex: 1.5 },
                        { value: b.group, flex: 1.5 },
                        { value: String(b.eggsSet), align: "right" },
                        { value: String(b.hatched), align: "right" },
                        { value: `${b.hatchRate.toFixed(1)}%`, align: "right" }
                      ]}
                    />
                  ))}
                  {t.worstHatching.map((b, i) => (
                    <Td
                      key={`worst-${i}`}
                      items={[
                        { value: `↓ ${b.incubator}`, flex: 1.5 },
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

            {/* Plantel por grupo */}
            {cfg.show.flockGroupsTable ? (
              <View style={styles.section} wrap={false}>
                <Text style={styles.sectionTitle}>Plantel por grupo</Text>
                <View style={styles.table}>
                  <Th
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
                    t.flockGroups.slice(0, 12).map((g, i) => (
                      <Td
                        key={i}
                        items={[
                          { value: g.title, flex: 2 },
                          { value: `${g.species}/${g.breed}${g.variety ? "/" + g.variety : ""}`, flex: 2 },
                          { value: String(g.totalBirds), align: "right" },
                          { value: String(g.active), align: "right" },
                          { value: String(g.sick), align: "right" },
                          { value: String(g.dead), align: "right" }
                        ]}
                      />
                    ))
                  )}
                </View>
              </View>
            ) : null}

            {/* Coleta de ovos */}
            {cfg.show.eggCollectionsTable ? (
              <View style={styles.section} wrap={false}>
                <Text style={styles.sectionTitle}>Coleta de ovos por grupo</Text>
                <View style={styles.table}>
                  <Th
                    items={[
                      { value: "Grupo", flex: 2 },
                      { value: "Total", align: "right" },
                      { value: "Bons", align: "right" },
                      { value: "Trincados", align: "right" },
                      { value: "% Bons", align: "right" }
                    ]}
                  />
                  {t.eggCollectionsByGroup.length === 0 ? (
                    <Text style={styles.empty}>Sem coletas registradas no período.</Text>
                  ) : (
                    t.eggCollectionsByGroup.slice(0, 12).map((c, i) => (
                      <Td
                        key={i}
                        items={[
                          { value: c.group, flex: 2 },
                          { value: String(c.total), align: "right" },
                          { value: String(c.good), align: "right" },
                          { value: String(c.cracked), align: "right" },
                          { value: `${c.goodRate.toFixed(1)}%`, align: "right" }
                        ]}
                      />
                    ))
                  )}
                </View>
              </View>
            ) : null}

            {/* Chocadeiras detalhadas */}
            {cfg.show.incubatorBatchesTable ? (
              <View style={styles.section} wrap={false}>
                <Text style={styles.sectionTitle}>Chocadeiras e lotes</Text>
                <View style={styles.table}>
                  <Th
                    items={[
                      { value: "Chocadeira", flex: 1.5 },
                      { value: "Grupo", flex: 1.5 },
                      { value: "Ovos", align: "right" },
                      { value: "Nascidos", align: "right" },
                      { value: "Inférteis", align: "right" },
                      { value: "Eclosão", align: "right" }
                    ]}
                  />
                  {t.incubatorBatches.length === 0 ? (
                    <Text style={styles.empty}>Sem lotes no período.</Text>
                  ) : (
                    t.incubatorBatches.slice(0, 12).map((b, i) => (
                      <Td
                        key={i}
                        items={[
                          { value: b.incubator, flex: 1.5 },
                          { value: b.group, flex: 1.5 },
                          { value: String(b.eggsSet), align: "right" },
                          { value: String(b.hatched), align: "right" },
                          { value: String(b.infertile), align: "right" },
                          { value: `${b.hatchRate.toFixed(1)}%`, align: "right" }
                        ]}
                      />
                    ))
                  )}
                </View>
              </View>
            ) : null}

            {/* Vitrine snapshot */}
            {cfg.show.vitrineSnapshot ? (
              <View style={styles.section} wrap={false}>
                <Text style={styles.sectionTitle}>Vitrine — estoque atual</Text>
                <View style={styles.table}>
                  <Th
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
                    t.vitrineSnapshot.slice(0, 14).map((v, i) => (
                      <Td
                        key={i}
                        items={[
                          { value: v.group, flex: 1.5 },
                          { value: v.title, flex: 2 },
                          { value: `${v.ageMonths}m`, align: "right" },
                          { value: String(v.available), align: "right" },
                          { value: v.currentPrice !== null ? formatMoney(v.currentPrice) : "—", align: "right" },
                          { value: formatMoney(v.stockValue), align: "right" }
                        ]}
                      />
                    ))
                  )}
                </View>
              </View>
            ) : null}

            {/* Receita por raça (vitrine) */}
            {cfg.show.revenueByGroup ? (
              <View style={styles.section} wrap={false}>
                <Text style={styles.sectionTitle}>💰 Receita por grupo (vitrine)</Text>
                <View style={styles.table}>
                  <Th
                    items={[
                      { value: "Grupo", flex: 2 },
                      { value: "Vendidos", align: "right" },
                      { value: "Receita", align: "right" }
                    ]}
                  />
                  {t.vitrineSales.byGroup.length === 0 ? (
                    <Text style={styles.empty}>Nenhuma venda no período.</Text>
                  ) : (
                    <>
                      {t.vitrineSales.byGroup.slice(0, 10).map((v, i) => (
                        <Td
                          key={i}
                          items={[
                            { value: v.group, flex: 2 },
                            { value: String(v.sold), align: "right" },
                            { value: formatMoney(v.revenue), align: "right" }
                          ]}
                        />
                      ))}
                      <View style={[styles.row, styles.headerRow]}>
                        <Text style={[styles.cellHead, { flex: 2 }]}>Total</Text>
                        <Text style={styles.cellNumHead}>{t.vitrineSales.totalSold}</Text>
                        <Text style={styles.cellNumHead}>{formatMoney(t.vitrineSales.totalRevenue)}</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            ) : null}

            {/* Quarentena */}
            {cfg.show.quarantineTable ? (
              <View style={styles.section} wrap={false}>
                <Text style={styles.sectionTitle}>Quarentena (ativas + iniciadas no período)</Text>
                <View style={styles.table}>
                  <Th
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

            {/* Diagnósticos */}
            {cfg.show.diagnosesTable ? (
              <View style={styles.section} wrap={false}>
                <Text style={styles.sectionTitle}>Diagnósticos recorrentes</Text>
                <View style={styles.table}>
                  <Th
                    items={[
                      { value: "Diagnóstico", flex: 3 },
                      { value: "Ocorrências", align: "right" }
                    ]}
                  />
                  {t.topDiagnoses.length === 0 ? (
                    <Text style={styles.empty}>Sem ocorrências registradas.</Text>
                  ) : (
                    t.topDiagnoses.slice(0, 8).map((d, i) => (
                      <Td
                        key={i}
                        items={[
                          { value: d.diagnosis, flex: 3 },
                          { value: String(d.count), align: "right" }
                        ]}
                      />
                    ))
                  )}
                </View>
              </View>
            ) : null}

            {/* Novas aves no plantel */}
            {cfg.show.newBirds ? (
              <View style={styles.section} wrap={false}>
                <Text style={styles.sectionTitle}>Novas aves no plantel (no período)</Text>
                <View style={styles.table}>
                  <Th
                    items={[
                      { value: "Anilha", flex: 1 },
                      { value: "Grupo", flex: 1.5 },
                      { value: "Sexo", flex: 0.8 },
                      { value: "Aquisição", align: "right" },
                      { value: "Origem", flex: 1.5 },
                      { value: "Custo", align: "right" }
                    ]}
                  />
                  {t.newBirds.length === 0 ? (
                    <Text style={styles.empty}>Nenhuma nova ave registrada no período.</Text>
                  ) : (
                    t.newBirds.slice(0, 14).map((b, i) => (
                      <Td
                        key={i}
                        items={[
                          { value: b.ringNumber, flex: 1 },
                          { value: b.group, flex: 1.5 },
                          { value: sexLabel(b.sex), flex: 0.8 },
                          { value: fmtDate(b.acquisitionDate), align: "right" },
                          { value: b.origin ?? "—", flex: 1.5 },
                          { value: b.purchaseValue !== null ? formatMoney(b.purchaseValue) : "—", align: "right" }
                        ]}
                      />
                    ))
                  )}
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        <Text style={styles.footer}>
          Documento gerado pelo Ornabird — Gestão de Criatórios Ornamentais.
        </Text>
      </Page>
    </Document>
  );
}

export async function generateReportPdf(data: ReportData, farmName: string) {
  return renderToBuffer(<ReportPdfDoc data={data} farmName={farmName} />);
}
