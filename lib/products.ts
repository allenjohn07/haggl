import type { Offer, Product, ProductCard } from "@/lib/types";

// Server-side product cache. Every product the browser can pick, and every alternative an
// advisor finds, is stored here first. Prices for purchases are read from here, never from the client.
const g = globalThis as unknown as { __products?: Map<string, Product> };
const products = (g.__products ??= new Map<string, Product>());

export function rememberProducts(list: Product[]): void {
  for (const p of list) if (p.offers.length > 0) products.set(p.id, p);
}

export function getProduct(id: string): Product | undefined {
  return products.get(id);
}

export function getOffer(productId: string, offerId: string): Offer | undefined {
  return products.get(productId)?.offers.find((o) => o.offerId === offerId);
}

// Cheapest in-stock offer, else the cheapest offer.
export function bestOffer(p: Product): Offer {
  const inStock = p.offers.filter((o) => o.inStock);
  const pool = inStock.length ? inStock : p.offers;
  return pool.reduce((a, b) => (b.price < a.price ? b : a));
}

export function toCard(p: Product): ProductCard {
  return {
    id: p.id,
    title: p.title,
    brand: p.brand,
    image: p.image,
    rating: p.rating,
    bestOffer: bestOffer(p),
    offerCount: p.offers.length,
  };
}
