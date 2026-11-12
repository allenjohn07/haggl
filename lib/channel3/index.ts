import { bestOffer, rememberProducts } from "@/lib/products";
import type { Product } from "@/lib/types";
import { c3Lookup, c3Search, c3Similar, type C3Result } from "./client";
import { dedupe, multiStoreFirst } from "./dedupe";
import { fixtureSet, fixtureSetFor } from "./fixtures";

// Product search and alternatives. Contract: docs/CONTRACTS.md.
// SEARCH_MODE=live (with CHANNEL3_API_KEY) calls Channel3; anything else, or any failure, serves fixtures.
// Both functions remember what they return in lib/products.

const MAX_RESULTS = 24; // the grid shows 12, then "Show more"
const CACHE_MS = 10 * 60 * 1000;

const g = globalThis as unknown as {
  __c3cache?: Map<string, { at: number; products: Product[] }>;
  __c3category?: Map<string, string>;
};
const cache = (g.__c3cache ??= new Map());
const categories = (g.__c3category ??= new Map()); // live product id -> Channel3 category title

const live = () => process.env.SEARCH_MODE === "live" && !!process.env.CHANNEL3_API_KEY;
const normalize = (q: string) => q.toLowerCase().replace(/\s+/g, " ").trim();

// Calls Channel3 through the cache. Returns [] on failure (logged without details that could hold the key).
async function cached(key: string, run: () => Promise<C3Result[]>): Promise<Product[]> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.products;
  try {
    const results = await run();
    for (const r of results) if (r.category) categories.set(r.product.id, r.category);
    const products = results.map((r) => r.product);
    if (products.length) {
      if (cache.size > 500) cache.clear();
      cache.set(key, { at: Date.now(), products });
    }
    return products;
  } catch (e) {
    console.warn(`[channel3] ${key.split(":")[0]} failed:`, e instanceof Error ? e.message : "unknown");
    return [];
  }
}

export async function searchProducts(query: string): Promise<Product[]> {
  const q = normalize(query);
  // Ask for 30 (Channel3's max), drop near-duplicates, then put multi-store products first among the top 16.
  const found = live() ? dedupe(await cached(`search:${q}`, () => c3Search(q, 30))) : [];
  let products = multiStoreFirst(found, MAX_RESULTS * 2).slice(0, MAX_RESULTS);
  if (!products.length) products = fixtureSet(q).products.slice(0, MAX_RESULTS);
  rememberProducts(products);
  return products;
}

// Similar products cheaper than `product`'s best offer, cheapest first.
export async function findAlternatives(product: Product, limit = 3): Promise<Product[]> {
  const max = bestOffer(product).price;
  const pick = (list: Product[]) =>
    dedupe(list)
      .filter((p) => p.id !== product.id && bestOffer(p).price < max)
      .sort((a, b) => bestOffer(a).price - bestOffer(b).price)
      .slice(0, limit);

  // Fixture products get fixture alternatives. Live products only ever get Channel3 results:
  // if Channel3 fails, [] means "no cheaper alternatives found" (never sample data next to real prices).
  const set = fixtureSetFor(product.id);
  if (set || product.id.startsWith("fx-")) {
    const found = pick(set?.products ?? []);
    rememberProducts(found);
    return found;
  }

  let found: Product[] = [];
  if (live()) {
    const cap = Math.round((max - 0.01) * 100) / 100;
    found = pick(await cached(`similar:${product.id}`, () => c3Similar(product.id, 12, cap)));
    if (!found.length) {
      const q = categories.get(product.id) ?? stripBrand(product);
      found = pick(await cached(`altsearch:${normalize(q)}:${cap}`, () => c3Search(q, 12, cap)));
    }
  }
  rememberProducts(found);
  return found;
}

function stripBrand(p: Product): string {
  const t = p.brand ? p.title.replace(new RegExp(p.brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), "") : p.title;
  return t.split(/[,(|]/)[0].replace(/\s+/g, " ").trim() || p.title;
}

// A product page URL the user pasted (Amazon, a brand's store, anywhere) -> one product, remembered.
// Live: Channel3's lookup. Mock: a sample product standing in for the page, at that store, so the flow can be demoed offline.
export async function lookupProduct(url: string): Promise<Product | null> {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  let product: Product | null = null;
  if (live()) {
    const found = await cached(`lookup:${url}`, async () => {
      const r = await c3Lookup(url);
      return r ? [r] : [];
    });
    product = found[0] ?? null;
  } else {
    const sample = fixtureSet(url.replace(/[^a-z0-9]+/gi, " ")).products[0];
    if (sample) {
      const price = bestOffer(sample).price;
      product = {
        ...sample,
        id: `fx-link-${host}-${sample.id}`,
        offers: [{ offerId: `fx-link-${host}-${sample.id}:${host}`, merchant: host, price, url, inStock: true }],
      };
    }
  }
  if (product) rememberProducts([product]);
  return product;
}
