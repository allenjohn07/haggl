import { z } from "zod";
import { getOffer } from "@/lib/products";
import { createPurchase } from "@/lib/purchases";
import { createOrderForPurchase } from "@/lib/paypal/orders";
import { sparkCallsOrderTool } from "@/lib/debate/agents";
import { getDebate } from "@/lib/debate/store";

// POST /api/buy { debateId, productId, offerId } -> { purchaseId, approveUrl } | 502 { purchaseId, error }.
// Allowed only after the verdict, for the verdict's pick or the user's original pick.
// The price always comes from the stored offer; Spark's agent closes with create_paypal_order({ purchaseId }).

const Body = z.object({ debateId: z.string().min(1).max(100), productId: z.string().min(1).max(200), offerId: z.string().min(1).max(300) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "debateId, productId and offerId are required" }, { status: 400 });

  const { debateId, productId, offerId } = parsed.data;
  const debate = getDebate(debateId);
  if (!debate?.verdict) return Response.json({ error: "Unknown debate" }, { status: 404 });

  const v = debate.verdict;
  const isVerdictPick = productId === v.productId && offerId === v.offerId;
  const isOriginalPick = productId === debate.productId && offerId === debate.offerId;
  if (!isVerdictPick && !isOriginalPick) return Response.json({ error: "That offer isn't one of the choices" }, { status: 400 });

  const pickedPrice = getOffer(debate.productId, debate.offerId)?.price;
  const purchase = pickedPrice !== undefined ? createPurchase(debateId, productId, offerId, pickedPrice) : undefined;
  if (!purchase) return Response.json({ error: "That offer isn't available any more" }, { status: 400 });

  // The agentic moment: Spark's agent calls the tool. Mock mode, or a failed AI call: the server runs it.
  if (process.env.AI_MODE === "live") await sparkCallsOrderTool(purchase.purchaseId, purchase.title, purchase.price);

  try {
    // The tool takes only the id; the handler reads the price from the stored Purchase.
    const { approveUrl } = await createOrderForPurchase(purchase.purchaseId);
    return Response.json({ purchaseId: purchase.purchaseId, approveUrl });
  } catch {
    // Details are logged by createOrderForPurchase (which also marks the purchase failed).
    return Response.json({ purchaseId: purchase.purchaseId, error: "PayPal's being slow. Try again from the receipt." }, { status: 502 });
  }
}
