import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer
} from "@react-pdf/renderer";
import { ReportData } from "@/lib/reports/service";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1f2937"
  },
  header: {
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 8
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f766e"
  },
  subtitle: {
    marginTop: 4,
    fontSize: 10,
    color: "#4b5563"
  },
  section: {
    marginTop: 12
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#111827"
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  kpiCard: {
    width: "31%",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    padding: 6,
    marginBottom: 6
  },
  kpiLabel: {
    fontSize: 8,
    color: "#6b7280"
  },
  kpiValue: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "bold"
  },
  table: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6"
  },
  headerRow: {
    backgroundColor: "#f3f4f6"
  },
  cell: {
    flex: 1,
    padding: 5,
    fontSize: 9
  },
  conclusion: {
    marginTop: 14,
    padding: 8,
    backgroundColor: "#ecfeff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    borderRadius: 4
  }
});

function formatMoney(value: number) {
  return `R$ ${value.toFixed(2)}`;
}

function row(values: string[]) {
  return (
    <View style={styles.row}>
      {values.map((value, idx) => (
        <Text key={idx} style={styles.cell}>
          {value}
        </Text>
      ))}
    </View>
  );
}

function ReportPdfDoc({ data, farmName }: { data: ReportData; farmName: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Relatorio do Sitio</Text>
          <Text style={styles.subtitle}>{farmName}</Text>
          <Text style={styles.subtitle}>Periodo: {data.period.label}</Text>
          <Text style={styles.subtitle}>Gerado em: {new Date(data.generatedAt).toLocaleString("pt-BR")}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicadores Principais</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Aves ativas</Text>
              <Text style={styles.kpiValue}>{data.kpis.activeBirds}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Aves doentes</Text>
              <Text style={styles.kpiValue}>{data.kpis.sickBirds}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Ovos no periodo</Text>
              <Text style={styles.kpiValue}>{data.kpis.eggsTotal}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Taxa ovos bons</Text>
              <Text style={styles.kpiValue}>{data.kpis.goodEggRate.toFixed(2)}%</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Taxa de eclosao</Text>
              <Text style={styles.kpiValue}>{data.kpis.hatchRate.toFixed(2)}%</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Resultado financeiro</Text>
              <Text style={styles.kpiValue}>{formatMoney(data.kpis.monthNet)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo Financeiro</Text>
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={styles.cell}>Entradas</Text>
              <Text style={styles.cell}>Saidas</Text>
              <Text style={styles.cell}>Liquido</Text>
            </View>
            {row([
              formatMoney(data.kpis.monthIncome),
              formatMoney(data.kpis.monthExpenses),
              formatMoney(data.kpis.monthNet)
            ])}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plantel por Grupo</Text>
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={styles.cell}>Grupo</Text>
              <Text style={styles.cell}>Total</Text>
              <Text style={styles.cell}>Ativas</Text>
              <Text style={styles.cell}>Doentes</Text>
              <Text style={styles.cell}>Mortas</Text>
            </View>
            {data.tables.flockGroups.slice(0, 10).map((group) =>
              row([
                group.title,
                String(group.totalBirds),
                String(group.active),
                String(group.sick),
                String(group.dead)
              ])
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chocadeiras e Lotes</Text>
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={styles.cell}>Chocadeira</Text>
              <Text style={styles.cell}>Grupo</Text>
              <Text style={styles.cell}>Qtd ovos</Text>
              <Text style={styles.cell}>Nascidos</Text>
              <Text style={styles.cell}>Taxa</Text>
            </View>
            {data.tables.incubatorBatches.slice(0, 8).map((item) =>
              row([
                item.incubator,
                item.group,
                String(item.eggsSet),
                String(item.hatched),
                `${item.hatchRate.toFixed(2)}%`
              ])
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnosticos recorrentes</Text>
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={styles.cell}>Diagnostico</Text>
              <Text style={styles.cell}>Ocorrencias</Text>
            </View>
            {data.tables.topDiagnoses.length === 0
              ? row(["Sem ocorrencias registradas", "0"])
              : data.tables.topDiagnoses.slice(0, 8).map((item) => row([item.diagnosis, String(item.count)]))}
          </View>
        </View>

        <View style={styles.conclusion}>
          <Text style={styles.sectionTitle}>Conclusao automatica</Text>
          <Text>{data.conclusion}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateReportPdf(data: ReportData, farmName: string) {
  return renderToBuffer(<ReportPdfDoc data={data} farmName={farmName} />);
}
