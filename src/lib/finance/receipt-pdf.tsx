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

export type ReceiptData = {
  number: string; // ex.: 0001/2026
  issuedAt: string; // ISO
  tenant: {
    name: string;
    legalName: string | null;
    cnpj: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    addressLine: string | null;
    city: string | null;
    stateUf: string | null;
    zipCode: string | null;
    logoUrl: string | null;
    receiptNotes: string | null;
  };
  customer: { name: string | null };
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  total: number;
  paymentMethod: string | null;
  notes?: string | null;
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1f2937"
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 12,
    marginBottom: 14
  },
  brand: { flexDirection: "row", alignItems: "center" },
  logo: { width: 56, height: 56, marginRight: 12, objectFit: "contain" },
  brandTitle: { fontSize: 18, fontWeight: "bold", color: "#0f766e" },
  muted: { color: "#6b7280", fontSize: 9 },
  receiptBox: {
    alignItems: "flex-end"
  },
  receiptNumber: { fontSize: 14, fontWeight: "bold" },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4
  },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 90, color: "#6b7280" },
  table: {
    borderTopWidth: 1,
    borderColor: "#d1d5db",
    marginTop: 6
  },
  th: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderColor: "#d1d5db"
  },
  td: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderColor: "#e5e7eb"
  },
  cellDesc: { flex: 4 },
  cellQty: { flex: 1, textAlign: "right" },
  cellUnit: { flex: 1.5, textAlign: "right" },
  cellTotal: { flex: 1.5, textAlign: "right" },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderColor: "#0f766e",
    paddingTop: 6,
    marginTop: 6
  },
  totalLabel: { fontSize: 12, fontWeight: "bold", marginRight: 12 },
  totalValue: { fontSize: 12, fontWeight: "bold", color: "#0f766e" },
  ack: {
    marginTop: 24,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderColor: "#9ca3af",
    fontSize: 9,
    color: "#374151"
  },
  signature: {
    marginTop: 36,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  signLine: {
    width: "44%",
    borderTopWidth: 0.5,
    borderColor: "#374151",
    paddingTop: 4,
    fontSize: 9,
    textAlign: "center",
    color: "#374151"
  },
  footer: {
    marginTop: 24,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center"
  }
});

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}
function tenantAddress(t: ReceiptData["tenant"]) {
  const parts = [t.addressLine, [t.city, t.stateUf].filter(Boolean).join("/"), t.zipCode].filter(Boolean);
  return parts.join(" — ");
}
function tenantContact(t: ReceiptData["tenant"]) {
  return [t.phone, t.whatsapp ? `WhatsApp ${t.whatsapp}` : null, t.email].filter(Boolean).join(" · ");
}

function ReceiptDoc({ data }: { data: ReceiptData }) {
  const { tenant, customer, items, total, paymentMethod, notes } = data;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.brand}>
            {tenant.logoUrl ? <Image src={tenant.logoUrl} style={styles.logo} /> : null}
            <View>
              <Text style={styles.brandTitle}>{tenant.name || "Criatório"}</Text>
              {tenant.legalName ? <Text style={styles.muted}>{tenant.legalName}</Text> : null}
              {tenant.cnpj ? <Text style={styles.muted}>CNPJ/CPF: {tenant.cnpj}</Text> : null}
              {tenantAddress(tenant) ? <Text style={styles.muted}>{tenantAddress(tenant)}</Text> : null}
              {tenantContact(tenant) ? <Text style={styles.muted}>{tenantContact(tenant)}</Text> : null}
            </View>
          </View>
          <View style={styles.receiptBox}>
            <Text style={styles.receiptNumber}>RECIBO Nº {data.number}</Text>
            <Text style={styles.muted}>Emitido em {fmtDate(data.issuedAt)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pagador</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nome:</Text>
            <Text>{customer.name?.trim() || "Cliente não identificado"}</Text>
          </View>
          {paymentMethod ? (
            <View style={styles.row}>
              <Text style={styles.label}>Forma:</Text>
              <Text>{paymentMethod}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itens</Text>
          <View style={styles.table}>
            <View style={styles.th}>
              <Text style={styles.cellDesc}>Descrição</Text>
              <Text style={styles.cellQty}>Qtd</Text>
              <Text style={styles.cellUnit}>Unitário</Text>
              <Text style={styles.cellTotal}>Total</Text>
            </View>
            {items.map((it, i) => (
              <View key={i} style={styles.td}>
                <Text style={styles.cellDesc}>{it.description}</Text>
                <Text style={styles.cellQty}>{it.quantity}</Text>
                <Text style={styles.cellUnit}>{fmtBRL(it.unitPrice)}</Text>
                <Text style={styles.cellTotal}>{fmtBRL(it.total)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalLabel}>TOTAL:</Text>
            <Text style={styles.totalValue}>{fmtBRL(total)}</Text>
          </View>
        </View>

        {notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações</Text>
            <Text>{notes}</Text>
          </View>
        ) : null}

        {tenant.receiptNotes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Termos do criatório</Text>
            <Text>{tenant.receiptNotes}</Text>
          </View>
        ) : null}

        <View style={styles.ack}>
          <Text>
            Declaro para os devidos fins que recebi o(s) item(ns) acima descrito(s) em perfeita
            condição, dando plena, geral e irrevogável quitação ao pagamento referente ao valor
            de {fmtBRL(total)} ({total.toFixed(2)} reais), na presente data.
          </Text>
        </View>

        <View style={styles.signature}>
          <Text style={styles.signLine}>{tenant.name || "Emitente"}</Text>
          <Text style={styles.signLine}>{customer.name?.trim() || "Recebedor"}</Text>
        </View>

        <Text style={styles.footer}>
          Documento gerado automaticamente pelo Ornabird — Gestão de Criatórios Ornamentais.
        </Text>
      </Page>
    </Document>
  );
}

export async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  return await renderToBuffer(<ReceiptDoc data={data} />);
}
