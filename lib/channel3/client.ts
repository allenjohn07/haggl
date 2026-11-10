import type { Offer, Product } from "@/lib/types";

// Minimal Channel3 client (https://channel3.ai/docs, spec at https://api.trychannel3.com/openapi.json).
// Server only. The key is read per call and never logged.

const BASE = "https://api.trychannel3.com";
const TIMEOUT_MS = 8000;
const LOCALE = { country: "US", currency: "USD" };

// The fields we use from Channel3's `Product` schema.
type C3Product = {
  id: string;
  title: string;
  description?: string | null;
  brands?: { id: string; name: string }[];
  images?: { url: string; cleaned_url?: string | null; is_main_image?: boolean }[];
  category?: { slug: string; title: string } | null;
  key_features?: string[] | null;
  ratings?: { value: number; count: number; source_count: number } | null;
  offers?: {
    url: string;
    domain: string;
    price: { price: number; compare_at_price?: number | null; currency: string };
    availability: "InStock" | "OutOfStock";
    condition?: "new" | "used" | null;
  }[];
};

export type C3Result = { product: Product; category?: string };

async function post(path: string, body: unknown): Promise<C3Product[]> {
  const key = process.env.CHANNEL3_API_KEY;
  if (!key) throw new Error("CHANNEL3_API_KEY is not set");
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Channel3 ${path} answered ${res.status}`);
  const data = (await res.json()) as { products?: C3Product[] };
  return Array.isArray(data.products) ? data.products : [];
}

// POST /v1/search. limit max 30.
export async function c3Search(query: string, limit = 12, maxPrice?: number): Promise<C3Result[]> {
  const filters = maxPrice ? { price: { max_price: maxPrice } } : undefined;
  const raw = await post("/v1/search", { query, limit, filters, config: { mode: "default", ...LOCALE } });
  return mapAll(raw);
}

// POST /v1/similar: products similar to a Channel3 product id (same category).
export async function c3Similar(productId: string, limit = 12, maxPrice?: number): Promise<C3Result[]> {
  const filters = maxPrice ? { price: { max_price: maxPrice } } : undefined;
  const raw = await post("/v1/similar", { product_id: productId, limit, filters, config: LOCALE });
  return mapAll(raw);
}

function mapAll(raw: C3Product[]): C3Result[] {
  const out: C3Result[] = [];
  for (const r of raw) {
    const product = mapProduct(r);
    if (product) out.push({ product, category: r.category?.title });
  }
  return out;
}

const short = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s);
const cents = (n: number) => Math.round(n * 100) / 100;

// Channel3 product -> our Product. Returns null when no usable USD offer is left.
export function mapProduct(r: C3Product): Product | null {
  if (!r?.id || !r.title) return null;

  const priced = (r.offers ?? []).filter(
    (o) => o?.domain && o.url && o.price?.currency === "USD" && Number.isFinite(o.price.price) && o.price.price > 0,
  );
  const fresh = priced.filter((o) => o.condition !== "used"); // new or unknown condition
  const pool = fresh.length ? fresh : priced;

  // One offer per domain: in stock first, then cheapest.
  const sorted = [...pool].sort(
    (a, b) => Number(b.availability === "InStock") - Number(a.availability === "InStock") || a.price.price - b.price.price,
  );
  const offers: Offer[] = [];
  for (const o of sorted) {
    if (offers.some((x) => x.merchant === o.domain)) continue;
    const price = cents(o.price.price);
    const was = o.price.compare_at_price;
    offers.push({
      offerId: `${r.id}:${o.domain}`,
      merchant: o.domain,
      price,
      compareAtPrice: was && was > price ? cents(was) : undefined,
      url: o.url,
      inStock: o.availability === "InStock",
    });
  }
  if (!offers.length) return null;
  offers.sort((a, b) => a.price - b.price);

  const img = r.images?.find((i) => i.is_main_image) ?? r.images?.[0];
  const rt = r.ratings;
  return {
    id: r.id,
    title: short(r.title.trim(), 140),
    brand: r.brands?.[0]?.name || undefined,
    image: img ? img.cleaned_url || img.url : undefined,
    description: r.description ? short(r.description.trim(), 500) : undefined,
    keyFeatures: (r.key_features ?? []).filter(Boolean).slice(0, 5).map((f) => short(f.trim(), 80)),
    rating:
      rt && rt.count > 0 && Number.isFinite(rt.value)
        ? { score: Math.min(5, Math.max(0, Math.round(rt.value * 10) / 10)), count: rt.count }
        : undefined,
    offers,
  };
}
