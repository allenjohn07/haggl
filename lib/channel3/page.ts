import type { Product } from "@/lib/types";

// Fallback when Channel3 can't read a pasted link: fetch the page once and read the product data
// stores publish for search engines (schema.org JSON-LD "Product", then Open Graph product tags).
// No headless browser: fast, light, and it reads only what the store publishes for machines.
// Only public http(s) hosts are fetched (no localhost or private networks).

const TIMEOUT_MS = 8000;
const MAX_BYTES = 3_000_000;

export async function readProductPage(link: string): Promise<Product | null> {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol) || isPrivateHost(url.hostname)) return null;

  let html = "";
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; HagglBot/1.0; product lookup for a shopping assistant)",
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return null;
    html = (await res.text()).slice(0, MAX_BYTES);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  const found = fromJsonLd(html) ?? fromMeta(html);
  if (!found || !found.title || !(found.price > 0)) return null;

  const id = `link-${hash(url.origin + url.pathname)}`;
  return {
    id,
    title: clean(found.title).slice(0, 200),
    brand: found.brand ? clean(found.brand).slice(0, 60) : undefined,
    image: found.image && /^https?:\/\//.test(found.image) ? found.image : undefined,
    description: found.description ? clean(found.description).slice(0, 500) : undefined,
    keyFeatures: [],
    rating: found.rating,
    offers: [{ offerId: `${id}:${host}`, merchant: host, price: Math.round(found.price * 100) / 100, url: url.toString(), inStock: found.inStock }],
  };
}

type Found = {
  title: string;
  brand?: string;
  image?: string;
  description?: string;
  price: number;
  inStock: boolean;
  rating?: { score: number; count: number };
};

// schema.org Product in any <script type="application/ld+json"> (also inside @graph or a ProductGroup).
function fromJsonLd(html: string): Found | null {
  const blocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of blocks) {
    const body = block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
    let data: unknown;
    try {
      data = JSON.parse(body.trim());
    } catch {
      continue;
    }
    for (const node of walk(data)) {
      const types = ([] as unknown[]).concat(node["@type"] ?? []).map(String);
      if (!types.some((t) => t === "Product" || t === "ProductGroup")) continue;
      const offer = pickOffer(node.offers ?? (Array.isArray(node.hasVariant) ? (node.hasVariant[0] as Node)?.offers : undefined));
      if (!offer) continue;
      const brand = typeof node.brand === "string" ? node.brand : (node.brand as Node | undefined)?.name;
      const r = node.aggregateRating as Node | undefined;
      const score = Number(r?.ratingValue);
      const count = Number(r?.reviewCount ?? r?.ratingCount);
      return {
        title: String(node.name ?? ""),
        brand: typeof brand === "string" ? brand : undefined,
        image: firstImage(node.image),
        description: typeof node.description === "string" ? node.description : undefined,
        price: offer.price,
        inStock: offer.inStock,
        rating: score > 0 && score <= 5 && count > 0 ? { score: Math.round(score * 10) / 10, count } : undefined,
      };
    }
  }
  return null;
}

type Node = Record<string, unknown>;

function* walk(x: unknown): Generator<Node> {
  if (Array.isArray(x)) for (const y of x) yield* walk(y);
  else if (x && typeof x === "object") {
    const n = x as Node;
    yield n;
    if (n["@graph"]) yield* walk(n["@graph"]);
  }
}

// The cheapest USD offer (Offer, AggregateOffer, or a list of either).
function pickOffer(x: unknown): { price: number; inStock: boolean } | null {
  let best: { price: number; inStock: boolean } | null = null;
  for (const o of walk(x)) {
    const currency = String(o.priceCurrency ?? (o.priceSpecification as Node | undefined)?.priceCurrency ?? "USD").toUpperCase();
    if (currency !== "USD") continue;
    const price = Number(o.price ?? o.lowPrice ?? (o.priceSpecification as Node | undefined)?.price);
    if (!(price > 0)) continue;
    const inStock = !/OutOfStock|SoldOut|Discontinued/i.test(String(o.availability ?? ""));
    if (!best || price < best.price) best = { price, inStock };
  }
  return best;
}

function firstImage(x: unknown): string | undefined {
  if (typeof x === "string") return x;
  if (Array.isArray(x)) return firstImage(x[0]);
  if (x && typeof x === "object") return firstImage((x as Node).url ?? (x as Node).contentUrl);
  return undefined;
}

// Open Graph / product meta tags, for pages without JSON-LD.
function fromMeta(html: string): Found | null {
  const meta = (name: string) => {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, "i");
    const tag = html.match(re)?.[0];
    return tag?.match(/content=["']([^"']*)["']/i)?.[1];
  };
  const price = Number(meta("product:price:amount") ?? meta("og:price:amount"));
  const currency = (meta("product:price:currency") ?? meta("og:price:currency") ?? "USD").toUpperCase();
  const title = meta("og:title");
  if (!title || !(price > 0) || currency !== "USD") return null;
  return {
    title,
    image: meta("og:image"),
    description: meta("og:description"),
    brand: meta("product:brand") ?? undefined,
    price,
    inStock: !/out ?of ?stock|oos/i.test(meta("product:availability") ?? meta("og:availability") ?? ""),
  };
}

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || !h.includes(".")) return true;
  if (/^(127|10|0)\./.test(h) || /^169\.254\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h.includes(":")) return true; // IPv6 literals: refuse rather than reason about them
  return false;
}

// Decode the few HTML entities product names use, in one pass (so "&amp;quot;" stays "&quot;").
const ENTITIES: Record<string, string> = { "&amp;": "&", "&#39;": "'", "&apos;": "'", "&quot;": '"', "&lt;": "<", "&gt;": ">" };
const clean = (s: string) => s.replace(/&(?:amp|#39|apos|quot|lt|gt);/g, (m) => ENTITIES[m]).replace(/\s+/g, " ").trim();

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
