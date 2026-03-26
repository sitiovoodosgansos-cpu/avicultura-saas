# Gestão de Aves Ornamentais SaaS

Sistema SaaS multi-tenant para gestão de criação de aves ornamentais, com:
- login por e-mail/senha
- trial grátis de 7 dias
- assinatura mensal e anual com Stripe
- módulos: Dashboard, Plantel, Coleta de Ovos, Chocadeiras, Sanidade, Financeiro, Relatórios (PDF)

---

## 1) Pré-requisitos (simples)

Você precisa ter instalado:
- Node.js 20+
- PostgreSQL 14+
- Conta Stripe (para cobrança)
- Conta Vercel (para deploy)

---

## 2) Instalação local (passo a passo)

### 2.1 Clonar e instalar dependências
```bash
npm install
```

### 2.2 Criar arquivo de ambiente
Copie `.env.example` para `.env` e preencha:
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="um-segredo-bem-forte"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_MONTHLY="price_..."
STRIPE_PRICE_ID_YEARLY="price_..."
RESEND_API_KEY="re_..."
EMAIL_FROM="Ornabird <no-reply@seu-dominio.com>"
PASSWORD_RESET_URL="https://SEU-DOMINIO"
```

### 2.3 Banco de dados
```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
```

Usuário de teste (seed):
- e-mail: `demo@gestaoaves.com`
- senha: `Demo@123456`

### 2.4 Rodar localmente
```bash
npm run dev
```

Abra:
- `http://localhost:3000/register`
- `http://localhost:3000/login`

---

## 3) Stripe (setup bem mastigado)

### 3.1 Criar produto e preços mensal/anual
1. Entre no Stripe Dashboard.
2. Vá em `Products` > `Create product`.
3. Nome: `Plano Starter Ornabird`.
4. Crie um preço recorrente mensal e copie o `price_id` para `STRIPE_PRICE_ID_MONTHLY`.
5. Crie um preço recorrente anual (ex.: R$ 299) e copie o `price_id` para `STRIPE_PRICE_ID_YEARLY`.

### 3.2 Configurar webhook
Eventos recomendados para este projeto:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Endpoint:
- Local: `http://localhost:3000/api/webhooks/stripe`
- Produção: `https://SEU-DOMINIO/api/webhooks/stripe`

Copie o segredo do webhook (`whsec_...`) para `STRIPE_WEBHOOK_SECRET`.

### 3.3 Fluxo implementado
- Usuário clica em “Iniciar/renovar assinatura” em `/perfil`.
- Sistema cria sessão de Checkout Stripe.
- Stripe chama webhook.
- Webhook atualiza status da assinatura no banco.
- Usuário pode gerenciar cartão/cancelamento no portal de cobrança.

---

## 4) Deploy na Vercel (produção)

## 4.1 Banco em produção
Sugestões: Neon, Supabase ou Railway Postgres.

1. Crie banco PostgreSQL.
2. Copie a `DATABASE_URL` de produção.

## 4.2 Subir projeto no GitHub
```bash
git add .
git commit -m "SaaS avicultura"
git push
```

## 4.3 Importar na Vercel
1. Acesse Vercel > `Add New Project`.
2. Selecione o repositório.
3. Configure variáveis de ambiente (as mesmas do `.env`).
4. Deploy.

## 4.4 Rodar migrations em produção
Use o terminal da Vercel/CI ou local apontando para DB de produção:
```bash
npm run prisma:deploy
```

## 4.5 Configurar URLs finais
Depois do deploy:
- ajuste `NEXTAUTH_URL` para `https://SEU-DOMINIO`
- ajuste `NEXT_PUBLIC_APP_URL` para `https://SEU-DOMINIO`
- configure webhook Stripe com URL de produção

---

## 5) Como usar cobrança no sistema

- Página de assinatura: `/perfil`
- Botão de checkout: permite escolher assinatura mensal ou anual
- Botão de portal: gerencia cartão/plano/cancelamento
- Histórico de eventos Stripe: exibido na mesma tela

---

## 6) Rotas principais de billing

- `GET /api/billing/status`
- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `POST /api/webhooks/stripe`

---

## Recuperacao de senha por e-mail

O projeto inclui fluxo completo de senha esquecida:
- pagina de solicitacao: `/forgot-password`
- pagina de redefinicao: `/reset-password?token=...`
- API de solicitacao: `POST /api/auth/forgot-password`
- API de redefinicao: `POST /api/auth/reset-password`

Variaveis obrigatorias para envio de e-mail:
- `RESEND_API_KEY`
- `EMAIL_FROM`

Variavel recomendada:
- `PASSWORD_RESET_URL` (URL publica do app para montar o link do e-mail)

---

## 7) Mobile com Capacitor (Android primeiro)

O projeto já está preparado para empacotar o web app como app nativo Android/iOS sem mudar backend/API.

Comandos principais:

```bash
npm run mobile:android:sync
npm run mobile:android:sync:preview
npm run mobile:android:sync:custom -- https://SUA-URL
npm run mobile:android:open
```

Guias completos:
- `docs/mobile-android-playbook.md`
- `docs/mobile-ios-roadmap.md`

Estratégia recomendada:
1. validar primeiro em preview deploy
2. publicar Android em Internal testing
3. depois avançar para Closed testing e Production

---

## 8) Qualidade e validação

Comandos de validação:
```bash
npm run typecheck
npm run lint
npm run release:check-env
```

---

## 9) Observações importantes

- O trial de 7 dias é criado automaticamente no cadastro.
- A separação de dados por tenant já está aplicada.
- Eventos críticos possuem trilha de auditoria.
- Recomenda-se ativar backups automáticos no banco de produção.

---

## 10) ETAPA 11 (Hardening de produção)

O projeto agora inclui:
- headers de segurança HTTP em `next.config.ts`
- bloqueio de APIs quando trial/assinatura expira (exceto rotas de billing)
- rate limit em rotas sensíveis (`register`, `checkout`, `webhook`)
- healthcheck em `GET /api/healthz`
- script de backup de banco (`npm run backup:db`)

### Checklist final antes de abrir para usuários

1. Configurar todas as variáveis de ambiente em produção.
2. Rodar `npm run prisma:deploy` no banco de produção.
3. Configurar webhook Stripe de produção.
4. Testar fluxo completo: cadastro -> trial -> assinatura -> portal -> cancelamento.
5. Testar bloqueio por assinatura expirada.
6. Configurar backup automático diário no provedor do banco.
7. Monitorar endpoint `https://SEU-DOMINIO/api/healthz`.
8. Ativar alertas de erro/log (ex.: Sentry/Logtail).

### Backup manual rápido

```bash
npm run backup:db
```

Obs.: requer `pg_dump` instalado na máquina que executa o comando.
