import { z } from "zod";
import { LINES } from "@/data/lines";
import { getDeal } from "@/lib/deals";
import { createOrderForDeal } from "@/lib/paypal/orders";

// Re-creates the PayPal order for a stored Deal (expired link, cancelled, failed).
// Body is { dealId } only: the price always comes from the stored Deal.
const Body = z.object({ dealId: z.string().min(1).max(100) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "dealId is required" }, { status: 400 });

  const deal = getDeal(parsed.data.dealId);
  if (!deal) return Response.json({ error: "deal not found" }, { status: 404 });
  if (deal.status === "captured") return Response.json({ error: "already paid" }, { status: 409 });

  try {
    const { approveUrl } = await createOrderForDeal(deal.dealId);
    return Response.json({ approveUrl });
  } catch {
    // Details are logged server-side by createOrderForDeal.
    return Response.json({ error: LINES.errors.failed[0] }, { status: 502 });
  }
}
