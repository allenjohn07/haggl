import { bestOffer } from "@/lib/products";
import type { Product } from "@/lib/types";

// Channel3 often lists the same item several times (different ids, same store and price).
// Two results are the same item when their brand plus the first words of the title match
// and their best prices are within $1. We keep the copy with more offers, then one with an image.

const TITLE_WORDS = 6;

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);

function titleKey(p: Product): string {
  const brand = words(p.brand ?? "");
  const title = words(p.title).filter((w) => !brand.includes(w)); // "Sony WH-1000XM4" and "WH 1000XM4" match
  return [brand.join(" "), ...title.slice(0, TITLE_WORDS)].join("|");
}

const better = (a: Product, b: Product) => a.offers.length - b.offers.length || Number(!!a.image) - Number(!!b.image);

// Keeps the order of first appearance (Channel3's relevance order).
export function dedupe(list: Product[]): Product[] {
  const kept: { key: string; price: number; product: Product }[] = [];
  for (const product of list) {
    const key = titleKey(product);
    const price = bestOffer(product).price;
    const twin = kept.find((k) => k.key === key && Math.abs(k.price - price) <= 1);
    if (!twin) kept.push({ key, price, product });
    else if (better(product, twin.product) > 0) Object.assign(twin, { price, product });
  }
  return kept.map((k) => k.product);
}

// Within the most relevant results, products sold by 2+ stores go first: they make the price check interesting.
export function multiStoreFirst(list: Product[], window: number): Product[] {
  const top = list.slice(0, window);
  return [...top.filter((p) => p.offers.length > 1), ...top.filter((p) => p.offers.length <= 1), ...list.slice(window)];
}
