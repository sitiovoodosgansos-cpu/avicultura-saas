/**
 * HTTP client for the OrnaMarket marketplace API.
 *
 * The OrnaMarket service is a separate Vercel app maintained by the same user.
 * Its API is documented at `docs/ornamarket-api-contract.md`.
 *
 * Mock mode: when `ORNAMARKET_API_URL` or `ORNAMARKET_API_KEY` are missing,
 * the client returns synthetic responses so the publish flow can be exercised
 * locally without the OrnaMarket existing yet. This unblocks development of
 * the Ornabird side ahead of the OrnaMarket side.
 */

export type PublishPayload = {
  externalId: string;
  title: string;
  description: string | null;
  price: number;
  category: "AVES";
  sex: "MALE" | "FEMALE" | "UNKNOWN";
  ageInMonths: number;
  photoUrl: string;
  sellerId: string;
  metadata: {
    species: string;
    breed: string | null;
    variety: string | null;
    flockGroupTitle: string;
  };
};

export type PublishResponse = {
  id: string;
  url: string;
  mock?: boolean;
};

function mockUrl(externalId: string) {
  return `https://ornamarket.example/mock/${externalId}`;
}

export async function publishToOrnamarket(
  payload: PublishPayload
): Promise<PublishResponse> {
  const apiUrl = process.env.ORNAMARKET_API_URL;
  const apiKey = process.env.ORNAMARKET_API_KEY;

  if (!apiUrl || !apiKey) {
    return {
      id: `mock-${payload.externalId}`,
      url: mockUrl(payload.externalId),
      mock: true
    };
  }

  const response = await fetch(`${apiUrl.replace(/\/+$/, "")}/api/external/listings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `OrnaMarket retornou ${response.status}.`);
  }

  const data = (await response.json()) as { id: string; url: string };
  if (!data?.id || !data?.url) {
    throw new Error("Resposta inválida do OrnaMarket.");
  }
  return data;
}

export async function unpublishFromOrnamarket(externalId: string): Promise<void> {
  const apiUrl = process.env.ORNAMARKET_API_URL;
  const apiKey = process.env.ORNAMARKET_API_KEY;

  if (!apiUrl || !apiKey) {
    return; // mock mode: nada a fazer
  }

  const response = await fetch(
    `${apiUrl.replace(/\/+$/, "")}/api/external/listings/${encodeURIComponent(externalId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    }
  );

  if (!response.ok && response.status !== 404) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `OrnaMarket retornou ${response.status}.`);
  }
}

export function isOrnamarketMock(): boolean {
  return !process.env.ORNAMARKET_API_URL || !process.env.ORNAMARKET_API_KEY;
}
