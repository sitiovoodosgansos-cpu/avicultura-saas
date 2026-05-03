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
  conclusion: {
    marginTop: 14,
    padding: 8,
    backgroundColor: "#ecfeff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    borderRadius: 4
  },
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

function ReportPdfDoc({ data, farmName }: { data: ReportData; farmName: string }) {
  const t = data.tables;
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Text style={styles.title}>Relatório do Criatório</Text>
          <Text style={styles.subtitle}>{farmName}</Text>
          <Text style={styles.subtitle}>Período: {data.period.label}</Text>
          <Text style={styles.subtitle}>
            Gerado em: {new Date(data.generatedAt).toLocaleString("pt-BR")}
          </Text>
        </View>

        {/* Indicadores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicadores principais</Text>
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
              <Text style={styles.kpiLabel}>Aves mortas</Text>
              <Text style={styles.kpiValue}>{data.kpis.deadBirds}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Ovos no período</Text>
              <Text style={styles.kpiValue}>{data.kpis.eggsTotal}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Taxa ovos bons</Text>
              <Text style={styles.kpiValue}>{data.kpis.goodEggRate.toFixed(1)}%</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Taxa de eclosão</Text>
              <Text style={styles.kpiValue}>{data.kpis.hatchRate.toFixed(1)}%</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Em tratamento</Text>
              <Text style={styles.kpiValue}>{data.kpis.inTreatment}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Taxa de cura</Text>
              <Text style={styles.kpiValue}>{data.kpis.cureRate.toFixed(1)}%</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Resultado financeiro</Text>
              <Text style={styles.kpiValueSmall}>{formatMoney(data.kpis.monthNet)}</Text>
            </View>
          </View>
        </View>

        {/* Financeiro */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo financeiro</Text>
          <View style={styles.table}>
            <Th items={[{ value: "Entradas" }, { value: "Saídas" }, { value: "Líquido" }]} />
            <Td
              items={[
                { value: formatMoney(data.kpis.monthIncome) },
                { value: formatMoney(data.kpis.monthExpenses) },
                { value: formatMoney(data.kpis.monthNet) }
              ]}
            />
          </View>
        </View>

        {/* Plantel por grupo */}
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

        {/* Coleta de ovos */}
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

        {/* Chocadeiras */}
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

        {/* Vitrine — estoque */}
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

        {/* Vitrine — vendas no período */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Vitrine — vendas no período</Text>
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

        {/* Quarentena */}
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

        {/* Novas aves no plantel */}
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

        {/* Diagnósticos */}
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

        <View style={styles.conclusion}>
          <Text style={styles.sectionTitle}>Conclusão automática</Text>
          <Text>{data.conclusion}</Text>
        </View>

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
