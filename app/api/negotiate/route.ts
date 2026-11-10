import { z } from "zod";
import { getProduct } from "@/data/products";
import { negotiate } from "@/lib/negotiate/run";
import { eventStream, SSE_HEADERS } from "@/lib/negotiate/sse";
import { allow, clientIp } from "@/lib/negotiate/ratelimit";

// POST handlers are never cached, so this streams per request (Cache Components is on;
// route segment configs like `dynamic` are not used with it).

const Body = z.object({
  productId: z.string().min(1),
  nudge: z.enum(["nicer", "bluff", "walk_away"]).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });

  const product = getProduct(parsed.data.productId);
  if (!product) return Response.json({ error: "Unknown product" }, { status: 400 });

  if (!allow(clientIp(req))) {
    return Response.json({ error: "Pickle is on his break. Come back soon." }, { status: 429 });
  }

  return new Response(eventStream(negotiate(product, parsed.data.nudge)), { headers: SSE_HEADERS });
}
