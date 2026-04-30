import { prisma } from "@/lib/db/prisma";
import {
  publishToOrnamarket,
  unpublishFromOrnamarket,
  type PublishPayload
} from "@/lib/ornamarket/client";
import { calculateAgeInMonths, getCurrentPrice } from "@/lib/vitrine/pricing";

export type PublishResult =
  | { kind: "published"; ornamarketUrl: string; mock: boolean }
  | { kind: "skipped"; reason: "ALREADY_PUBLISHED" | "NO_PHOTO" | "NO_PRICE" | "NOT_FOUND" };

export async function publishListingToOrnamarket(
  tenantId: string,
  listingId: string
): Promise<PublishResult> {
  const listing = await prisma.vitrineListing.findFirst({
    where: { id: listingId, tenantId },
    include: {
      flockGroup: {
        select: {
          id: true,
          title: true,
          species: { select: { name: true } },
          breed: { select: { name: true } },
          variety: { select: { name: true } }
        }
      },
      photos: { orderBy: { order: "asc" }, take: 1 }
    }
  });
  if (!listing) {
    return { kind: "skipped", reason: "NOT_FOUND" };
  }

  if (listing.publishedToOrnamarketAt) {
    return { kind: "skipped", reason: "ALREADY_PUBLISHED" };
  }

  const photo = listing.photos[0];
  if (!photo) {
    return { kind: "skipped", reason: "NO_PHOTO" };
  }

  const tiers = await prisma.priceTier.findMany({
    where: { tenantId, flockGroupId: listing.flockGroupId }
  });
  const priceResult = getCurrentPrice(
    listing.flockGroupId,
    listing.birthDate,
    tiers,
    listing.priceOverride !== null && listing.priceOverride !== undefined
      ? Number(listing.priceOverride)
      : null
  );
  if (priceResult.price === null) {
    return { kind: "skipped", reason: "NO_PRICE" };
  }

  const ageInMonths = calculateAgeInMonths(listing.birthDate);

  const payload: PublishPayload = {
    externalId: listing.id,
    title: listing.title?.trim() || listing.flockGroup.title,
    description: listing.description,
    price: priceResult.price,
    category: "AVES",
    sex: "UNKNOWN",
    ageInMonths,
    photoUrl: photo.url,
    sellerId: tenantId,
    metadata: {
      species: listing.flockGroup.species.name,
      breed: listing.flockGroup.breed?.name ?? null,
      variety: listing.flockGroup.variety?.name ?? null,
      flockGroupTitle: listing.flockGroup.title
    }
  };

  const response = await publishToOrnamarket(payload);

  await prisma.vitrineListing.update({
    where: { id: listing.id },
    data: {
      publishedToOrnamarketAt: new Date(),
      ornamarketListingId: response.id,
      ornamarketListingUrl: response.url
    }
  });

  return {
    kind: "published",
    ornamarketUrl: response.url,
    mock: Boolean(response.mock)
  };
}

export async function unpublishListingFromOrnamarket(
  tenantId: string,
  listingId: string
): Promise<{ ok: boolean }> {
  const listing = await prisma.vitrineListing.findFirst({
    where: { id: listingId, tenantId },
    select: { id: true, ornamarketListingId: true }
  });
  if (!listing) return { ok: false };

  if (listing.ornamarketListingId) {
    await unpublishFromOrnamarket(listing.id);
  }

  await prisma.vitrineListing.update({
    where: { id: listing.id },
    data: {
      publishedToOrnamarketAt: null,
      ornamarketListingId: null,
      ornamarketListingUrl: null
    }
  });

  return { ok: true };
}
