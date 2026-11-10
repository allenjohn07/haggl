import { z } from "zod";
import { getPurchase } from "@/lib/purchases";
import { createOrderForPurchase } from "@/lib/paypal/orders";

// Re-creates the PayPal order for a stored Purchase (expired link, cancelled, failed).
// Body is { purchaseId } only: the price always comes from the stored Purchase.
const Body = z.object({ purchaseId: z.string().min(1).max(100) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "purchaseId is required" }, { status: 400 });

  const purchase = getPurchase(parsed.data.purchaseId);
  if (!purchase) return Response.json({ error: "purchase not found" }, { status: 404 });
  if (purchase.status === "captured") return Response.json({ error: "already paid" }, { status: 409 });

  try {
    const { approveUrl } = await createOrderForPurchase(purchase.purchaseId);
    return Response.json({ approveUrl });
  } catch {
    // Details are logged server-side by createOrderForPurchase.
    return Response.json({ error: "PayPal didn't answer. One more try?" }, { status: 502 });
  }
}
