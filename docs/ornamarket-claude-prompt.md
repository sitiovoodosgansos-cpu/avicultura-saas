# Prompt para o Claude Code do OrnaMarket

Cole isso na sessão do Claude Code do projeto **OrnaMarket** para adicionar o endpoint de integração com o **Ornabird**.

---

## PROMPT

Sou o dono dos dois projetos: este aqui (**OrnaMarket** — marketplace público de aves ornamentais, já no ar Android + iOS) e do **Ornabird** (gestão de criatório, separado, em produção também).

Acabei de adicionar uma feature no Ornabird que **publica lotes de animais à venda** empurrando via HTTP para o OrnaMarket. **O lado Ornabird já está pronto e empurrando**. Falta você criar o **lado receptor aqui no OrnaMarket** sem quebrar nada do app existente.

A integração é **unidirecional**: Ornabird empurra (POST/DELETE), OrnaMarket recebe e exibe como anúncio público normal — junto com os anúncios criados manualmente pelos usuários do app.

## Antes de mudar qualquer coisa

Investigue o projeto e me diga em até 200 palavras:

1. **Qual stack do backend?** Next.js API routes, Express, NestJS, Fastify, Hono, outro? Qual ORM?
2. **Onde estão definidos os anúncios hoje?** Qual model representa um anúncio (provavelmente `Ad`, `Listing`, `Product` ou similar)? Qual o schema dele?
3. **Como funciona auth de usuário hoje?** Tem `User` model? Como o anúncio é vinculado a um vendedor?
4. **Categoria "Aves" existe?** Como categorias são representadas — string fixa, enum, FK para uma tabela `Category`?
5. **Onde fica a página pública de um anúncio individual?** (Rota tipo `/anuncio/:id` ou `/listing/:id`.)

**Pare e me confirme antes de mexer em código.** Quero alinhar a abordagem (criar tabela `ExternalAd` separada vs reutilizar a tabela existente com flag `source`) ANTES de qualquer mudança.

## O que precisa existir no final

### 1. Persistência

O anúncio recebido do Ornabird precisa virar um anúncio público igual aos outros (aparece na listagem da categoria Aves, tem página própria com foto/preço/idade/descrição).

A tabela existente de anúncios precisa ganhar (ou um modelo paralelo precisa ser criado):

- `externalId String @unique` — vem do Ornabird (chave de idempotência)
- `externalSource String?` — `"ornabird"` (ou similar) para distinguir manuais de integrados
- `metadata Json?` — guarda taxonomia (espécie, raça, variedade) que o Ornabird envia

A escolha entre **estender a tabela existente** vs **tabela separada `ExternalAd`** depende de quão acoplado tá o anúncio atual ao fluxo de criação no app. Me diga o que faz mais sentido depois de inspecionar.

### 2. Variável de ambiente

`ORNAMARKET_API_KEY` — string aleatória longa (ex: gerar com `openssl rand -hex 32`). Eu vou colocar o mesmo valor aqui no OrnaMarket e no Ornabird.

### 3. Endpoint `POST /api/external/listings`

- Validar header `Authorization: Bearer <ORNAMARKET_API_KEY>`. Inválido → `401 Unauthorized`.
- Validar body com Zod (schema abaixo). Inválido → `400 { error: "..." }`.
- **Upsert por `externalId`**: se já existe anúncio com esse `externalId`, atualiza campos. Senão, cria novo.
- **Vendedor**: o campo `sellerId` é o `tenantId` do Ornabird. Se você tem um modelo `User` com IDs próprios, crie um `Seller` ou `Account` que aponta para esse `sellerId` externo. Ou armazene direto no anúncio sem associar a um `User` local — depende da modelagem que tu escolher.
- Retorna `201 { id: <id local>, url: <URL pública> }`.

**Body schema (Zod):**

```typescript
const externalAdSchema = z.object({
  externalId: z.string(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  price: z.number().min(0),
  category: z.literal("AVES"),
  sex: z.enum(["MALE", "FEMALE", "UNKNOWN"]),
  ageInMonths: z.number().int().min(0).max(999),
  photoUrl: z.string().url(),
  sellerId: z.string(),
  metadata: z.object({
    species: z.string(),
    breed: z.string().nullable(),
    variety: z.string().nullable(),
    flockGroupTitle: z.string()
  })
});
```

**Exemplo real de request que o Ornabird envia:**

```json
POST /api/external/listings
Authorization: Bearer xxx
Content-Type: application/json

{
  "externalId": "clxyz123abc",
  "title": "Sedosa Branca",
  "description": null,
  "price": 65.00,
  "category": "AVES",
  "sex": "UNKNOWN",
  "ageInMonths": 1,
  "photoUrl": "https://abc.public.blob.vercel-storage.com/vitrine/tenant_xxx/listing_yyy/foto.jpg",
  "sellerId": "tenant_abc123",
  "metadata": {
    "species": "Galinha",
    "breed": "Sedosa",
    "variety": "Branca",
    "flockGroupTitle": "Sedosa Branca"
  }
}
```

### 4. Endpoint `DELETE /api/external/listings/:externalId`

- Mesma autenticação.
- Apaga o anúncio (ou marca como `archived`/`removed`, depende da política do app).
- Se não existir, retorna `404` (Ornabird ignora).
- Sucesso: `200 { ok: true }`.

### 5. Foto vinda de domínio externo

A `photoUrl` aponta para o Vercel Blob público do Ornabird (`*.public.blob.vercel-storage.com`). Se você renderiza com `next/image` ou outro componente que faz allowlist, libere esse domínio:

```typescript
// next.config.ts (caso seja Next)
images: {
  remotePatterns: [
    { protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/**" }
  ]
}
```

Se for app mobile (React Native), é só o `<Image source={{ uri }} />` direto — funciona sem config.

### 6. Página pública do anúncio

O endpoint POST retorna `url` que aponta para a página pública do anúncio. Use a rota que já existe no app (ou crie `/anuncio/:id`). É essa URL que o Ornabird armazena para mostrar pro criador.

## Cuidados importantes

- **Idempotência via `externalId @unique`**: o Ornabird pode reenviar o mesmo `externalId` se o usuário despublicar e publicar de novo. Trate como upsert.
- **`sellerId` é uma string opaca**: vem do Ornabird como `tenantId`. Não tente fazer JOIN com `User.id` local. Se quiser associar, crie tabela de mapeamento.
- **Não modifique fluxos existentes do app**: o endpoint é aditivo. Não mexa no que já está em produção.
- **Sem rate limiting agressivo**: é uma integração privada de baixo volume.
- **Logs**: registre cada chamada recebida (externalId, ação, timestamp) para debug.

## Fluxo recomendado para você

1. **Investigar** (item "Antes de mudar") e me reportar.
2. Esperar minha confirmação de abordagem (estender vs tabela separada).
3. Criar a env var `ORNAMARKET_API_KEY`.
4. Implementar schema + endpoints + middleware de auth.
5. Testar com `curl` enviando um payload de exemplo.
6. Me avisar pra eu colocar a `ORNAMARKET_API_URL` e a key no Ornabird e testar end-to-end.

Pode começar pela investigação.
