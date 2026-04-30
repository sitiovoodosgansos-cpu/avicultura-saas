# Prompt para o Claude Code do OrnaMarket

Cole este prompt na sessão do Claude Code que está construindo o **OrnaMarket**. Ele dá todo o contexto pra ele criar o lado receptor da integração com o Ornabird.

---

## PROMPT

Estou construindo o **OrnaMarket**, um marketplace público de animais ornamentais (aves, especialmente). Ele recebe publicações vindas de outro app meu chamado **Ornabird** (gestão de criatório), que já está em produção.

Preciso que você crie o **endpoint de integração** que recebe as publicações do Ornabird. O Ornabird já está pronto e empurrando via HTTP — só falta o OrnaMarket aceitar.

### Contexto

- O Ornabird tem uma feature "Vitrine" onde criadores cadastram lotes de animais à venda. Ao clicar no botão **🌐 Publicar**, ele faz `POST` para o OrnaMarket com o anúncio.
- O OrnaMarket precisa armazenar esses anúncios e exibir publicamente em uma tela tipo "Novo anúncio" (categoria Aves, com foto, título, preço, idade, descrição, sexo).
- A autenticação é via **API key compartilhada** no header `Authorization: Bearer <key>`.
- A integração é **unidirecional**: Ornabird empurra, OrnaMarket recebe e exibe.

### O que você precisa construir

#### 1. Modelo de dados (Prisma)

```prisma
model Ad {
  id          String   @id @default(cuid())
  externalId  String   @unique // ID do anúncio no Ornabird (idempotência)
  sellerId    String           // tenantId do Ornabird (associar a um vendedor)
  title       String
  description String?
  price       Decimal  @db.Decimal(10, 2)
  category    String           // sempre "AVES" por enquanto
  sex         String           // MALE | FEMALE | UNKNOWN
  ageInMonths Int
  photoUrl    String           // URL pública do Vercel Blob
  metadata    Json?            // { species, breed, variety, flockGroupTitle }
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([sellerId])
  @@index([category])
}
```

Se você já tem um modelo `Listing` ou `Product`, adapte a ideia mantendo `externalId @unique` para idempotência.

#### 2. Env var

`ORNAMARKET_API_KEY` — string aleatória longa. Eu vou colocar o mesmo valor no Ornabird e aqui no OrnaMarket.

#### 3. Endpoint `POST /api/external/listings`

- Validar header `Authorization: Bearer <ORNAMARKET_API_KEY>`. Se inválido → `401 Unauthorized`.
- Validar body com Zod (ver schema abaixo). Se inválido → `400 { error: "..." }`.
- **Upsert por `externalId`**: se já existe, atualiza; senão, cria.
- Retorna `201 { id: <Ad.id>, url: <URL pública do anúncio> }`.

**Body schema:**

```typescript
const adSchema = z.object({
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

**Exemplo de request:**

```json
POST /api/external/listings
Authorization: Bearer xxx
Content-Type: application/json

{
  "externalId": "clxyz123abc",
  "title": "Galinha Sedosa Branca - Lote Abril",
  "description": null,
  "price": 65.00,
  "category": "AVES",
  "sex": "UNKNOWN",
  "ageInMonths": 1,
  "photoUrl": "https://abc.public.blob.vercel-storage.com/vitrine/.../foto.jpg",
  "sellerId": "tenant_abc123",
  "metadata": {
    "species": "Galinha",
    "breed": "Sedosa",
    "variety": "Branca",
    "flockGroupTitle": "Sedosa Branca"
  }
}
```

#### 4. Endpoint `DELETE /api/external/listings/:externalId`

- Mesma autenticação.
- Apaga o `Ad` correspondente. Se não existir, retorna `404` (Ornabird ignora).
- Retorna `200 { ok: true }`.

#### 5. Tela pública para o anúncio

Crie uma página `/anuncio/[id]` que mostra o `Ad` com foto, título, preço, idade, descrição, taxonomia (espécie/raça/variedade do `metadata`) e dados do vendedor (`sellerId`, talvez join com algum modelo `User`/`Seller` que você já tenha).

Essa URL é o que o endpoint POST retorna no campo `url` da resposta — o Ornabird armazena pra mostrar pro usuário.

#### 6. Suporte a foto via URL externa

A `photoUrl` aponta pro Vercel Blob do projeto Ornabird (`*.public.blob.vercel-storage.com`). Se você usar `next/image`, adicione no `next.config.ts`:

```typescript
images: {
  remotePatterns: [
    { protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/**" }
  ]
}
```

### Importante

- **Idempotência via `externalId`** é essencial. O Ornabird pode reenviar o mesmo `externalId` se o usuário despublicar e publicar de novo.
- O `sellerId` é o `tenantId` do Ornabird, não um user_id local. Trate como string opaca.
- A `photoUrl` é pública e estável — pode salvar como `String` mesmo, sem fazer download.
- Sem rate limiting agressivo — é o Ornabird empurrando, baixo volume.

### Como testar

Depois de implementar, me avise pra eu colocar a `ORNAMARKET_API_URL` (URL do deploy do OrnaMarket) e a `ORNAMARKET_API_KEY` (mesma key dos dois lados) no Ornabird. Aí eu testo o botão "Publicar" e o anúncio deve aparecer no OrnaMarket.

---

Pode começar pelo schema Prisma + endpoint POST. Pergunta antes de mexer em outras áreas do projeto.
