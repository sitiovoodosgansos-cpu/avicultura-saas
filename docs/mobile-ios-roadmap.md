# Ornabird iOS - roadmap após Android estável

## 1) Pré-requisito

1. Mac com Xcode atualizado.
2. Conta Apple Developer ativa.

## 2) Preparação técnica

1. Sincronizar Capacitor com URL de produção:
```bash
ORNABIRD_MOBILE_URL=https://ornabird.app npx cap sync ios
```
2. Abrir projeto iOS:
```bash
npx cap open ios
```
3. Testar em iPhone real (não só simulador).

## 3) Revisão de política de cobrança (Apple)

Antes de enviar para App Store, validar regra de monetização para evitar rejeição:

1. Se o app apenas permite acesso de assinantes já existentes, documentar no review.
2. Se vender assinatura dentro do app iOS, avaliar exigência de In-App Purchase.

## 4) Fluxo de submissão

1. Criar app no App Store Connect.
2. Configurar Bundle ID e signing.
3. Preencher Privacy Labels.
4. Subir build no TestFlight.
5. Fazer teste interno/externo.
6. Enviar para revisão final.

## 5) Checklist mínimo iOS

1. Login/logout.
2. Navegação de módulos.
3. Links externos (Stripe/portal) abrindo fora do app.
4. Sessão estável após fechar/reabrir app.
5. Reset de senha por e-mail.

