import { z } from "zod";
import { lookupProduct, searchProducts } from "@/lib/channel3";
import { toCard } from "@/lib/products";
import { clientIp, rateLimit } from "@/lib/ratelimit";

// POST { query } -> { products: ProductCard[] }. Channel3 when live, fixtures otherwise or on failure.
// A query that is a product page URL (http/https) is looked up instead: one product, or a 404 if
// the page couldn't be read as a product with a price.
const URL_RE = /^https?:\/\/\S+$/i;
const Body = z.object({ query: z.string().trim().min(1).max(500) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  const query = parsed.success ? parsed.data.query : "";
  const isUrl = URL_RE.test(query);
  if (!parsed.success || (!isUrl && query.length > 80)) {
    return Response.json({ error: "query must be 1 to 80 characters, or a product link" }, { status: 400 });
  }

  // Checked after validation so bad requests don't use up the quota.
  if (!rateLimit("search", clientIp(request), 20, 10 * 60 * 1000)) {
    return Response.json({ error: "Too many shoppers. Back in a minute." }, { status: 429 });
  }

  try {
    if (isUrl) {
      // Channel3 can't read some stores' pages (Amazon refuses them outright), so say so plainly.
      if (/(^|\.)amazon\./i.test(new URL(query).hostname)) {
        return Response.json(
          { products: [], error: "Amazon doesn't let shopping agents read its pages. Try the same product at Best Buy or the brand's own store." },
          { status: 404 },
        );
      }
      const product = await lookupProduct(query);
      if (!product) return Response.json({ products: [], error: "Couldn't read a price from that page. Try another link?" }, { status: 404 });
      return Response.json({ products: [toCard(product)], fromLink: true });
    }
    const products = await searchProducts(query);
    return Response.json({ products: products.slice(0, 8).map(toCard) });
  } catch {
    return Response.json({ error: "The shelves are empty right now. Try again?" }, { status: 502 });
  }
}
