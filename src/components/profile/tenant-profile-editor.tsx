"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TenantProfile = {
  id: string;
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

const empty: TenantProfile = {
  id: "",
  name: "",
  legalName: "",
  cnpj: "",
  email: "",
  phone: "",
  whatsapp: "",
  addressLine: "",
  city: "",
  stateUf: "",
  zipCode: "",
  logoUrl: "",
  receiptNotes: ""
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

export function TenantProfileEditor() {
  const [data, setData] = useState<TenantProfile>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/tenant/profile", { cache: "no-store" });
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const json = (await res.json()) as { tenant: TenantProfile | null };
      if (cancelled || !json.tenant) {
        setLoading(false);
        return;
      }
      const t = json.tenant;
      setData({
        id: t.id,
        name: t.name ?? "",
        legalName: t.legalName ?? "",
        cnpj: t.cnpj ?? "",
        email: t.email ?? "",
        phone: t.phone ?? "",
        whatsapp: t.whatsapp ?? "",
        addressLine: t.addressLine ?? "",
        city: t.city ?? "",
        stateUf: t.stateUf ?? "",
        zipCode: t.zipCode ?? "",
        logoUrl: t.logoUrl ?? "",
        receiptNotes: t.receiptNotes ?? ""
      });
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/tenant/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    setSaving(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setMessage(body.error ?? "Erro ao salvar.");
      return;
    }
    setMessage("Perfil atualizado com sucesso.");
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Identidade do criatório</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Preencha as informações para envio ou impressão de recibo.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">Carregando...</p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Nome do criatório">
              <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="Sítio Voo dos Gansos" />
            </Field>
            <Field label="Razão social (opcional)">
              <Input value={data.legalName ?? ""} onChange={(e) => setData({ ...data, legalName: e.target.value })} placeholder="Nome jurídico" />
            </Field>
            <Field label="CNPJ / CPF">
              <Input value={data.cnpj ?? ""} onChange={(e) => setData({ ...data, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
            </Field>
            <Field label="E-mail">
              <Input value={data.email ?? ""} onChange={(e) => setData({ ...data, email: e.target.value })} placeholder="contato@criatorio.com" />
            </Field>
            <Field label="Telefone">
              <Input value={data.phone ?? ""} onChange={(e) => setData({ ...data, phone: e.target.value })} placeholder="(00) 0000-0000" />
            </Field>
            <Field label="WhatsApp">
              <Input value={data.whatsapp ?? ""} onChange={(e) => setData({ ...data, whatsapp: e.target.value })} placeholder="(00) 90000-0000" />
            </Field>
            <Field label="Endereço">
              <Input value={data.addressLine ?? ""} onChange={(e) => setData({ ...data, addressLine: e.target.value })} placeholder="Rua / nº / bairro" />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Cidade">
                <Input value={data.city ?? ""} onChange={(e) => setData({ ...data, city: e.target.value })} />
              </Field>
              <Field label="UF">
                <Input maxLength={2} value={data.stateUf ?? ""} onChange={(e) => setData({ ...data, stateUf: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="CEP">
                <Input value={data.zipCode ?? ""} onChange={(e) => setData({ ...data, zipCode: e.target.value })} />
              </Field>
            </div>
            <Field label="URL do logo">
              <Input value={data.logoUrl ?? ""} onChange={(e) => setData({ ...data, logoUrl: e.target.value })} placeholder="https://..." />
            </Field>
            <Field label="Observações nos recibos">
              <Input value={data.receiptNotes ?? ""} onChange={(e) => setData({ ...data, receiptNotes: e.target.value })} placeholder="Termos, garantias..." />
            </Field>
          </div>

          {data.logoUrl ? (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.logoUrl} alt="Logo do criatório" className="h-12 w-12 rounded-lg object-contain" />
              <span className="text-xs text-zinc-500">Pré-visualização do logo</span>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button type="button" disabled={saving} onClick={save}>
              {saving ? "Salvando..." : "Salvar perfil"}
            </Button>
            {message ? (
              <span
                className={`text-xs font-semibold ${
                  message.includes("Erro") ? "text-rose-600" : "text-emerald-700"
                }`}
              >
                {message}
              </span>
            ) : null}
          </div>
        </>
      )}
    </Card>
  );
}
