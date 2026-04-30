export type FlockGroupRef = {
  id: string;
  title: string;
  species: { id: string; name: string };
  breed: { id: string; name: string } | null;
  variety: { id: string; name: string } | null;
};

export type ListingPhoto = {
  id: string;
  url: string;
  order: number;
};

export type VitrineListingItem = {
  id: string;
  flockGroupId: string;
  title: string | null;
  birthDate: string;
  initialQuantity: number;
  availableQuantity: number;
  priceOverride: number | null;
  description: string | null;
  status: "AVAILABLE" | "SOLD_OUT" | "REMOVED";
  flockGroup: FlockGroupRef;
  photos: ListingPhoto[];
  currentPrice: number | null;
  ageInMonths: number;
  missingTier: boolean;
  isOverride: boolean;
};

export function formatBRL(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatAge(months: number) {
  if (months <= 0) return "Recém-nascido";
  if (months === 1) return "1 mês";
  if (months < 12) return `${months} meses`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (rest === 0) return years === 1 ? "1 ano" : `${years} anos`;
  return `${years}a ${rest}m`;
}
