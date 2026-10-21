export const PRODUCT_CATALOG = [
  { productName: "Wireless Mouse", unitPriceCents: 2499 },
  { productName: "Mechanical Keyboard", unitPriceCents: 8999 },
  { productName: "USB-C Hub", unitPriceCents: 4599 },
  { productName: "27-inch Monitor", unitPriceCents: 24999 },
  { productName: "Webcam HD", unitPriceCents: 5999 },
  { productName: "Noise-Cancel Headphones", unitPriceCents: 12999 },
  { productName: "Laptop Stand", unitPriceCents: 3999 },
  { productName: "Desk Lamp", unitPriceCents: 3499 },
  { productName: "External SSD 1TB", unitPriceCents: 10999 },
  { productName: "Wireless Charger", unitPriceCents: 2999 },
] as const;

export type CatalogProductName = (typeof PRODUCT_CATALOG)[number]["productName"];

export const CATALOG_PRODUCT_NAMES = PRODUCT_CATALOG.map((p) => p.productName);

const priceByName = new Map<string, number>(
  PRODUCT_CATALOG.map((p) => [p.productName, p.unitPriceCents]),
);

export function getCatalogPrice(productName: string): number | undefined {
  return priceByName.get(productName);
}

export function formatDollars(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
