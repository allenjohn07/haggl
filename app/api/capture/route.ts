import { appUrl } from "@/lib/paypal/client";
import { captureDeal } from "@/lib/paypal/orders";

// PayPal's return_url: /api/capture?dealId=<id>&token=<orderId>&PayerID=<...>
// Idempotent: a reload or a double request never captures twice.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const dealId = params.get("dealId") ?? "";
  const token = params.get("token") ?? "";
  if (!dealId) return Response.redirect(appUrl("/"), 303);

  const page = `/deal/${encodeURIComponent(dealId)}`;
  const result = await captureDeal(dealId, token);
  return Response.redirect(appUrl(result === "failed" ? `${page}?status=failed` : page), 303);
}
