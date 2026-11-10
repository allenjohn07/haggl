import { z } from "zod";
import { searchProducts } from "@/lib/channel3";
import { toCard } from "@/lib/products";
import { clientIp, rateLimit } from "@/lib/ratelimit";

// POST { query } -> { products: ProductCard[] }. Channel3 when live, fixtures otherwise or on failure.
const Body = z.object({ query: z.string().trim().min(1).max(80) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "query must be 1 to 80 characters" }, { status: 400 });

  // Checked after validation so bad requests don't use up the quota.
  if (!rateLimit("search", clientIp(request), 20, 10 * 60 * 1000)) {
    return Response.json({ error: "Too many shoppers. Back in a minute." }, { status: 429 });
  }

  try {
    const products = await searchProducts(parsed.data.query);
    return Response.json({ products: products.slice(0, 8).map(toCard) });
  } catch {
    return Response.json({ error: "The shelves are empty right now. Try again?" }, { status: 502 });
  }
}
