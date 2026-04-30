# OrnaMarket API Contract

Esse documento descreve os endpoints HTTP que o **OrnaMarket** (marketplace público) precisa expor para que o **Ornabird** (gestão de criatório) consiga publicar e despublicar lotes da Vitrine.

A integração é unidirecional: Ornabird empurra para OrnaMarket. Não há polling nem webhooks de volta.

## Configuração no Ornabird

Variáveis de ambiente lidas pelo `src/lib/ornamarket/client.ts`:

| Variável | Descrição |
|---|---|
| `ORNAMARKET_API_URL` | URL base do OrnaMarket (ex: `https://ornamarket.app`) |
| `ORNAMARKET_API_KEY` | API key compartilhada usada no header `Authorization: Bearer ...` |

Quando ambas estão ausentes, o Ornabird roda em **modo mock**: simula o sucesso e retorna URLs falsas. Útil para testar o fluxo enquanto o OrnaMarket ainda não existe.

## Autenticação

Todas as requisições incluem `Authorization: Bearer <ORNAMARKET_API_KEY>`.

O OrnaMarket deve validar o header e rejeitar com `401 Unauthorized` se ausente ou inválido.

## Endpoints

### `POST /api/external/listings`

Publica um anúncio. Idempotente em `externalId` — re-enviar com o mesmo `externalId` deve atualizar o anúncio existente em vez de criar duplicado.

**Request body:**

```json
{
  "externalId": "clxyz123abc",
  "title": "Galinha Sedosa Branca - Lote Abril",
  "description": "Filhotes de Sedosa Branca, sem manchas.",
  "price": 65.00,
  "category": "AVES",
  "sex": "UNKNOWN",
  "ageInMonths": 1,
  "photoUrl": "https://abc123.public.blob.vercel-storage.com/vitrine/.../photo.jpg",
  "sellerId": "tenant_abc123",
  "metadata": {
    "species": "Galinha",
    "breed": "Sedosa",
    "variety": "Branca",
    "flockGroupTitle": "Sedosa Branca"
  }
}
```

**Campos:**

| Campo | Tipo | Notas |
|---|---|---|
| `externalId` | string | ID do `VitrineListing` no Ornabird. Use como chave de idempotência. |
| `title` | string | Título do anúncio (geralmente o `FlockGroup.title`). |
| `description` | string \| null | Texto livre opcional. |
| `price` | number | Preço atual em BRL (já calculado pela idade ou override). |
| `category` | `"AVES"` | Sempre fixo nesta integração inicial. |
| `sex` | `"MALE"` \| `"FEMALE"` \| `"UNKNOWN"` | Default `UNKNOWN` para lotes. |
| `ageInMonths` | number | Idade calculada do animal. |
| `photoUrl` | string | URL pública (Vercel Blob). |
| `sellerId` | string | `tenantId` do Ornabird. Use para associar a um vendedor no OrnaMarket. |
| `metadata` | object | Taxonomia para filtros/busca. |

**Response 201 (created or updated):**

```json
{
  "id": "ad_xyz789",
  "url": "https://ornamarket.app/anuncio/ad_xyz789"
}
```

**Erros:**

- `401` — auth inválida
- `400` — payload inválido (especificar campo no body `{ "error": "..." }`)
- `502` — erro ao salvar no banco

### `DELETE /api/external/listings/:externalId`

Despublica um anúncio. Idempotente — se já não existe, retorna sucesso ou `404`.

**Response 200:**

```json
{ "ok": true }
```

**Erros:**

- `401` — auth inválida
- `404` — não encontrado (Ornabird trata como sucesso silencioso)

## Schema sugerido para o OrnaMarket

```prisma
model Ad {
  id          String   @id @default(cuid())
  externalId  String   @unique // Vem do Ornabird (VitrineListing.id)
  sellerId    String           // tenantId do Ornabird
  title       String
  description String?
  price       Decimal  @db.Decimal(10, 2)
  category    String           // "AVES" por enquanto
  sex         String           // MALE | FEMALE | UNKNOWN
  ageInMonths Int
  photoUrl    String
  metadata    Json?            // { species, breed, variety, flockGroupTitle }
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([sellerId])
  @@index([category])
}
```

## Comportamento esperado

1. **Re-publish**: se o usuário despublicar e publicar de novo no Ornabird, o `externalId` é o mesmo. O OrnaMarket pode tratar como upsert.
2. **Mudança de preço**: hoje o Ornabird não dispara update automático quando o preço muda (ex: animal envelheceu). Próxima iteração pode adicionar PUT/upsert periódico.
3. **Foto trocada**: idem, sem sync automático. Precisa despublicar e publicar de novo manualmente.
