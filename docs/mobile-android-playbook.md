# Ornabird Mobile (Android) - Playbook completo

Este guia foi feito para executar com segurança, sem quebrar o web app em produção.

## 1) Pré-requisitos

1. Node.js 20+ instalado.
2. Android Studio (com SDK Android 34+ e emulador opcional).
3. Java/JDK instalado (Android Studio normalmente já resolve).
4. Projeto web funcionando em `https://ornabird.app`.
5. Conta no Google Play Console ativa.

## 2) Estratégia segura de rollout

1. Crie branch de trabalho mobile (não use `main`):
   - `mobile/capacitor-v1` (ou com prefixo interno da sua equipe).
2. Toda validação primeiro em Preview Deploy.
3. Produção só após checklist verde.

## 3) Estrutura mobile já adicionada no projeto

Arquivos principais:

1. `capacitor.config.ts`
2. `android/` (projeto nativo)
3. `scripts/mobile-sync-android.mjs`
4. `src/components/mobile/native-app-runtime.tsx`
5. `src/lib/mobile/open-url.ts`

Comportamentos implementados:

1. Abre links externos (Stripe e afins) fora do WebView.
2. Botão voltar Android com navegação segura.
3. Deep link por esquema `ornabird://`.
4. Tela amigável de erro de rede (`public/mobile-offline.html`).

## 4) Comandos mobile no projeto

1. Sincronizar Android com URL de produção:
```bash
npm run mobile:android:sync
```

2. Sincronizar Android com URL de Preview:
```bash
# PowerShell
$env:ORNABIRD_PREVIEW_URL="https://SEU-PREVIEW.vercel.app"
npm run mobile:android:sync:preview
```

3. Sincronizar Android com URL customizada:
```bash
npm run mobile:android:sync:custom -- https://SUA-URL
```

4. Abrir projeto Android no Android Studio:
```bash
npm run mobile:android:open
```

## 5) Fluxo recomendado (Preview -> Teste -> Produção)

### Passo A - Preview

1. Publique branch mobile no GitHub.
2. Aguarde Preview Deploy no Vercel.
3. Copie a URL do preview.
4. Rode:
```bash
$env:ORNABIRD_PREVIEW_URL="https://SEU-PREVIEW.vercel.app"
npm run mobile:android:sync:preview
```
5. Abra Android Studio e execute no celular.

### Passo B - Produção

1. Depois de aprovado no preview, rode:
```bash
npm run mobile:android:sync
```
2. Gere build release no Android Studio.
3. Suba em Internal testing na Play Store.

## 6) Checklist de não regressão (obrigatório)

1. Login e logout.
2. Cadastro e reset de senha por e-mail.
3. Plantel / Coleta / Chocadeiras / Sanidade / Financeiro / Relatórios.
4. Stripe checkout e retorno de status.
5. Troca de rede (Wi-Fi -> 4G) sem travar app.

## 7) Publicação na Google Play (passo a passo)

### 7.1 Criar app no console

1. Acesse Play Console -> "Create app".
2. Nome: `Ornabird - Gestão de Criatórios Ornamentais`.
3. Defina idioma principal e categoria.
4. Marque se contém anúncios.

### 7.2 Configurações legais e compliance

1. Privacy Policy (URL pública).
2. Data Safety.
3. Content Rating.
4. App Access (se houver login obrigatório, descrever conta de teste).

### 7.3 Assinatura e upload

1. Gere keystore de upload no Android Studio.
2. Guarde keystore + senha em local seguro (backup).
3. Gere `.aab` release.
4. Suba em Internal testing.

### 7.4 Teste interno

1. Adicione e-mails de testadores.
2. Testadores instalam pela Play.
3. Validar fluxo completo.

### 7.5 Evolução de tracks

1. Internal testing -> Closed testing -> Production.
2. Só promova versão quando logs estiverem limpos.

## 8) Observações importantes

1. O app mobile usa o mesmo backend/API do web.
2. Não altere variáveis de produção sem redeploy controlado.
3. Se mudar domínio, rode novo `mobile:android:sync`.
4. Para ícone/splash final, ajuste assets no Android Studio antes do release.

