import { appUrl } from "@/lib/paypal/client";
import { capturePurchase } from "@/lib/paypal/orders";

// PayPal's return_url: /api/capture?purchaseId=<id>&token=<orderId>&PayerID=<...>
// Idempotent: a reload or a double request never captures twice.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const purchaseId = params.get("purchaseId") ?? "";
  const token = params.get("token") ?? "";
  if (!purchaseId) return Response.redirect(appUrl("/"), 303);

  const page = `/receipt/${encodeURIComponent(purchaseId)}`;
  const result = await capturePurchase(purchaseId, token);
  return Response.redirect(appUrl(result === "failed" ? `${page}?status=failed` : page), 303);
}
