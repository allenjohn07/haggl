import { z } from "zod";
import { getOffer, getProduct } from "@/lib/products";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { runDebate } from "@/lib/debate/run";
import { eventStream, SSE_HEADERS } from "@/lib/debate/sse";
import { createDebate } from "@/lib/debate/store";

// POST /api/debate { productId, offerId } -> text/event-stream (docs/CONTRACTS.md).
// POST handlers are never cached, so this streams per request (Cache Components is on).

const Body = z.object({ productId: z.string().min(1).max(200), offerId: z.string().min(1).max(300), compareId: z.string().min(1).max(300).optional() });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "productId and offerId are required" }, { status: 400 });

  const { productId, offerId, compareId } = parsed.data;
  const product = getProduct(productId);
  const picked = getOffer(productId, offerId);
  if (!product || !picked) return Response.json({ error: "Unknown product or offer" }, { status: 404 });

  // Only valid requests count against the limit.
  if (!rateLimit("debate", clientIp(request), 6, 10 * 60 * 1000)) {
    return Response.json({ error: "Spark and Penny need a breather. Back in a few minutes." }, { status: 429 });
  }

  const debate = createDebate(productId, offerId);
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort());
  const compare = compareId ? getProduct(compareId) : undefined; // only products the server already stored (search or link lookup)
  const events = runDebate(debate, product, picked, { signal: abort.signal, compare });
  return new Response(eventStream(events, () => abort.abort()), { headers: SSE_HEADERS });
}
