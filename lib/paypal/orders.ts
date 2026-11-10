import { getDeal } from "@/lib/deals";

// STUB. The `paypal` lane replaces the body with the real Orders v2 call.
// The signature is the contract (docs/CONTRACTS.md): price always comes from the stored Deal.
export async function createOrderForDeal(dealId: string): Promise<{ orderId: string; approveUrl: string }> {
  const deal = getDeal(dealId);
  if (!deal) throw new Error("deal not found");
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const orderId = `STUB-${dealId.slice(0, 8)}`;
  return { orderId, approveUrl: `${base}/deal/${dealId}` };
}
