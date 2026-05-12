import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { asaasClient } from "@/lib/billing/asaas";
import {
  ASAAS_PLAN_CODE_STARTER_97,
  ASAAS_PLAN_VALUE_STARTER_97,
  findActiveStripeSubscription,
  findLatestAsaasSubscription,
  upsertAsaasSubscription
} from "@/lib/billing/service";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

// Cria/retoma assinatura Asaas pro tenant logado.
// Fluxo:
//   1. Bloqueia se ja tem Stripe ATIVO (cliente legado, congelado em R$37)
//   2. Reusa customer Asaas existente OU cria novo
//   3. Reusa subscription ACTIVE existente OU cria nova
//   4. Devolve invoiceUrl da proxima cobranca pendente pra UI redirecionar
function todayPlusOneDayISO(): string {
  // Asaas exige nextDueDate >= hoje. Coloco amanha pra dar folga de fuso.
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function POST(request: Request) {
  try {
    const auth = await getApiSessionOr401({ allowBlocked: true, ownerOnly: true });
    if (!auth.ok) return auth.response;

    const ip = getClientIp(request);
    const guard = rateLimit({
      key: `asaas-checkout:${auth.session.user.tenantId}:${ip}`,
      limit: 10,
      windowMs: 15 * 60 * 1000
    });
    if (!guard.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde alguns minutos." },
        { status: 429 }
      );
    }

    const tenantId = auth.session.user.tenantId;

    // 1) Cliente Stripe legado ativo? Bloqueia.
    const stripeActive = await findActiveStripeSubscription(tenantId);
    if (stripeActive) {
      return NextResponse.json(
        {
          error:
            "Você tem uma assinatura ativa no Stripe (preço congelado). Cancele ela primeiro pelo portal de cobrança Stripe se quiser migrar pro novo plano R$97 com PIX."
        },
        { status: 409 }
      );
    }

    // 2) Pega o body opcional (CPF/CNPJ e telefone pra preencher no Asaas).
    //    Se o body nao trouxer, vamos cair no tenant.cnpj salvo no perfil.
    const body = (await request.json().catch(() => ({}))) as {
      cpfCnpj?: string;
      mobilePhone?: string;
    };

    // 3) Pega tenant + email do owner pra criar/atualizar customer Asaas.
    //    A API Asaas ATÉ aceita criar customer sem cpfCnpj, MAS quando vai
    //    emitir cobranca falha com "Para criar esta cobranca eh necessario
    //    preencher o CPF ou CNPJ do cliente". Por isso travamos cpfCnpj
    //    upfront E sincronizamos no customer Asaas via updateCustomer (pra
    //    consertar tambem o caso de customer criado em tentativas antigas
    //    sem cpfCnpj).
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, cnpj: true, phone: true, whatsapp: true }
    });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant não encontrado." }, { status: 404 });
    }
    const ownerEmail = auth.session.user.email ?? undefined;
    const cpfCnpj = (body.cpfCnpj ?? tenant.cnpj ?? "").replace(/\D/g, "");
    const mobilePhone = (body.mobilePhone ?? tenant.whatsapp ?? tenant.phone ?? "").replace(/\D/g, "") || undefined;

    // CPF/CNPJ é obrigatorio. Trava upfront com mensagem amigavel.
    if (!cpfCnpj || cpfCnpj.length < 11) {
      return NextResponse.json(
        {
          error:
            "Para assinar, preencha o CPF ou CNPJ no perfil do criatório antes (campo 'CNPJ / CPF' em /perfil → botão 'Editar')."
        },
        { status: 422 }
      );
    }

    // 4) Cliente Asaas: reusa pelo Subscription anterior ou cria novo
    const existingSub = await findLatestAsaasSubscription(tenantId);
    let customerId = existingSub?.providerCustomerId ?? null;

    if (!customerId) {
      // Tenta achar pelo externalReference (recovery se DB perdeu o ID)
      const found = await asaasClient.findCustomerByExternalRef(tenantId);
      if (found) {
        customerId = found.id;
      } else {
        const created = await asaasClient.createCustomer({
          name: tenant.name,
          email: ownerEmail,
          cpfCnpj,
          mobilePhone,
          tenantId
        });
        customerId = created.id;
      }
    }

    // Sincroniza dados no customer Asaas. Idempotente — atualiza mesmo
    // se ja estiver certo. Conserta o caso de customer ter sido criado
    // numa tentativa antiga sem cpfCnpj (causa do "Para criar esta
    // cobranca eh necessario preencher CPF/CNPJ" mesmo depois do user
    // preencher o perfil).
    await asaasClient.updateCustomer(customerId, {
      name: tenant.name,
      email: ownerEmail,
      cpfCnpj,
      mobilePhone
    });

    // 5) Se ja tem subscription nao-cancelada, devolve URL de pagamento
    //    pendente (cobre ACTIVE, PAST_DUE e INCOMPLETE — usuario clica
    //    "Pagar agora" pra abrir a fatura aberta sem criar duplicata)
    if (
      existingSub &&
      existingSub.providerSubId &&
      existingSub.status !== "CANCELED"
    ) {
      const next = await asaasClient.getNextPendingPayment(existingSub.providerSubId);
      return NextResponse.json({
        ok: true,
        subscriptionId: existingSub.providerSubId,
        paymentUrl: next?.invoiceUrl ?? null,
        message:
          existingSub.status === "ACTIVE"
            ? "Você já tem assinatura Asaas ativa."
            : "Você já tem cobrança aberta — abra para finalizar o pagamento."
      });
    }

    // 6) Cria nova subscription
    const subscription = await asaasClient.createSubscription({
      customerId,
      value: ASAAS_PLAN_VALUE_STARTER_97,
      nextDueDate: todayPlusOneDayISO(),
      cycle: "MONTHLY",
      description: `Ornabird Starter — assinatura mensal R$${ASAAS_PLAN_VALUE_STARTER_97}`,
      externalReference: tenantId
    });

    // 7) Salva no DB local com status INCOMPLETE (vai pra ACTIVE quando o
    //    primeiro PAYMENT_CONFIRMED chegar via webhook)
    await upsertAsaasSubscription({
      tenantId,
      customerId,
      subscriptionId: subscription.id,
      status: "INCOMPLETE",
      planCode: ASAAS_PLAN_CODE_STARTER_97,
      nextDueDate: subscription.nextDueDate
    });

    // 8) Pega URL da primeira cobranca
    const firstPayment = await asaasClient.getNextPendingPayment(subscription.id);

    return NextResponse.json({
      ok: true,
      subscriptionId: subscription.id,
      paymentUrl: firstPayment?.invoiceUrl ?? null
    });
  } catch (err) {
    console.error("[asaas.checkout] failed", err);
    const message = err instanceof Error ? err.message : "Erro ao iniciar assinatura.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
