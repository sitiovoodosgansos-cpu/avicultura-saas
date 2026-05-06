"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [data, setData] = useState<TenantProfile>(empty);
  const [snapshot, setSnapshot] = useState<TenantProfile>(empty);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    setMessage(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/tenant/profile/logo", { method: "POST", body: fd });
    setUploadingLogo(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setMessage(body.error ?? "Erro ao enviar logo.");
      return;
    }
    const json = (await res.json()) as { url: string };
    setData((d) => ({ ...d, logoUrl: json.url }));
    setSnapshot((s) => ({ ...s, logoUrl: json.url })); // upload eh persistido na hora; cancel nao reverte
    setMessage("Logo atualizado.");
    router.refresh(); // header tambem mostra o logo novo
  }

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
      const loaded: TenantProfile = {
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
      };
      setData(loaded);
      setSnapshot(loaded);
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
    setSnapshot(data);
    setIsEditing(false);
    setMessage("Perfil atualizado com sucesso.");
    // refresh layout pra atualizar nome/logo no header "Conta ativa"
    router.refresh();
  }

  function cancelEdit() {
    setData(snapshot);
    setIsEditing(false);
    setMessage(null);
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
          {(() => {
            const ro = !isEditing;
            const roCls = ro ? "bg-zinc-50 cursor-default" : "";
            return (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Nome do criatório">
              <Input readOnly={ro} className={roCls} value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="Sítio Voo dos Gansos" />
            </Field>
            <Field label="Razão social (opcional)">
              <Input readOnly={ro} className={roCls} value={data.legalName ?? ""} onChange={(e) => setData({ ...data, legalName: e.target.value })} placeholder="Nome jurídico" />
            </Field>
            <Field label="CNPJ / CPF">
              <Input readOnly={ro} className={roCls} value={data.cnpj ?? ""} onChange={(e) => setData({ ...data, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
            </Field>
            <Field label="E-mail">
              <Input readOnly={ro} className={roCls} value={data.email ?? ""} onChange={(e) => setData({ ...data, email: e.target.value })} placeholder="contato@criatorio.com" />
            </Field>
            <Field label="Telefone">
              <Input readOnly={ro} className={roCls} value={data.phone ?? ""} onChange={(e) => setData({ ...data, phone: e.target.value })} placeholder="(00) 0000-0000" />
            </Field>
            <Field label="WhatsApp">
              <Input readOnly={ro} className={roCls} value={data.whatsapp ?? ""} onChange={(e) => setData({ ...data, whatsapp: e.target.value })} placeholder="(00) 90000-0000" />
            </Field>
            <Field label="Endereço">
              <Input readOnly={ro} className={roCls} value={data.addressLine ?? ""} onChange={(e) => setData({ ...data, addressLine: e.target.value })} placeholder="Rua / nº / bairro" />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Cidade">
                <Input readOnly={ro} className={roCls} value={data.city ?? ""} onChange={(e) => setData({ ...data, city: e.target.value })} />
              </Field>
              <Field label="UF">
                <Input readOnly={ro} className={roCls} maxLength={2} value={data.stateUf ?? ""} onChange={(e) => setData({ ...data, stateUf: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="CEP">
                <Input readOnly={ro} className={roCls} value={data.zipCode ?? ""} onChange={(e) => setData({ ...data, zipCode: e.target.value })} />
              </Field>
            </div>
            <Field label="Observações nos recibos">
              <Input readOnly={ro} className={roCls} value={data.receiptNotes ?? ""} onChange={(e) => setData({ ...data, receiptNotes: e.target.value })} placeholder="Termos, garantias..." />
            </Field>
          </div>
            );
          })()}

          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3">
            {data.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.logoUrl} alt="Logo do criatório" className="h-16 w-16 rounded-lg border border-zinc-200 object-contain" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-2xl">
                🏞️
              </div>
            )}
            <div className="flex flex-1 flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Logo do criatório</p>
              <p className="text-[11px] text-zinc-500">PNG, JPG ou WEBP — até 4 MB. Aparece nos recibos PDF.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadLogo(f);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
              {isEditing ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadingLogo}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingLogo ? "Enviando..." : data.logoUrl ? "Trocar logo" : "Enviar logo"}
                  </Button>
                  {data.logoUrl ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingLogo}
                      onClick={() => setData((d) => ({ ...d, logoUrl: "" }))}
                    >
                      Remover
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {isEditing ? (
              <>
                <Button type="button" disabled={saving} onClick={save}>
                  {saving ? "Salvando..." : "Salvar perfil"}
                </Button>
                <Button type="button" variant="outline" disabled={saving} onClick={cancelEdit}>
                  Cancelar
                </Button>
              </>
            ) : (
              <Button type="button" onClick={() => { setIsEditing(true); setMessage(null); }}>
                Editar
              </Button>
            )}
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
