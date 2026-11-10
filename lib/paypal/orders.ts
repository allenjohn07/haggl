import { getProduct } from "@/data/products";
import { getDeal, updateDeal } from "@/lib/deals";
import { appUrl, describeError, PayPalError, paypalFetch } from "@/lib/paypal/client";

// PayPal Orders v2. Verified against https://developer.paypal.com/api/orders/v2/schema.json (v2.36):
// - create: POST /v2/checkout/orders, return/cancel URLs in payment_source.paypal.experience_context
//   (application_context is deprecated); the buyer is sent to the "payer-action" link.
// - capture: POST /v2/checkout/orders/{id}/capture, empty body; order status COMPLETED on success.
// - PayPal-Request-Id: repeating a request with the same id returns the earlier result.

type Link = { href: string; rel: string };
type Order = {
  id: string;
  status: "CREATED" | "SAVED" | "APPROVED" | "VOIDED" | "COMPLETED" | "PAYER_ACTION_REQUIRED";
  links?: Link[];
  purchase_units?: { payments?: { captures?: { id: string; status: string }[] } }[];
};

// The seller agent's tool and POST /api/checkout both call this.
// The price ALWAYS comes from the stored Deal, never from the caller.
const creating = new Map<string, Promise<{ orderId: string; approveUrl: string }>>();

export async function createOrderForDeal(dealId: string): Promise<{ orderId: string; approveUrl: string }> {
  // Two callers at once (agent tool + retry button) share one order.
  let p = creating.get(dealId);
  if (!p) {
    p = createOrder(dealId).finally(() => creating.delete(dealId));
    creating.set(dealId, p);
  }
  return p;
}

async function createOrder(dealId: string): Promise<{ orderId: string; approveUrl: string }> {
  const deal = getDeal(dealId);
  if (!deal) throw new PayPalError("deal not found", 404);
  if (deal.status === "captured") throw new PayPalError("deal already paid", 409);
  const product = getProduct(deal.productId);
  if (!Number.isFinite(deal.price) || deal.price <= 0) throw new PayPalError("deal has no valid price");

  try {
    const order = await paypalFetch<Order>("/v2/checkout/orders", {
      method: "POST",
      requestId: `haggle-create-${dealId}-${crypto.randomUUID()}`,
      body: {
        intent: "CAPTURE",
        purchase_units: [
          {
            custom_id: dealId,
            description: `Haggle: ${product?.name ?? "a very haggled item"}`.slice(0, 127),
            amount: { currency_code: "USD", value: deal.price.toFixed(2) },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "Haggle",
              user_action: "PAY_NOW",
              shipping_preference: "NO_SHIPPING",
              // PayPal appends ?token=<orderId>&PayerID=... to the return URL.
              return_url: appUrl(`/api/capture?dealId=${encodeURIComponent(dealId)}`),
              cancel_url: appUrl(`/deal/${encodeURIComponent(dealId)}?status=cancelled`),
            },
          },
        },
      },
    });
    const approveUrl = order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
    if (!approveUrl) throw new PayPalError("PayPal order has no approval link");

    updateDeal(dealId, { status: "order_created", paypalOrderId: order.id });
    return { orderId: order.id, approveUrl };
  } catch (err) {
    console.error(`[paypal] create order failed for deal ${dealId}: ${describeError(err)}`);
    if (getDeal(dealId)?.status !== "captured") updateDeal(dealId, { status: "failed" });
    throw err;
  }
}

// Captures one PayPal order. Safe to call any number of times:
// the PayPal-Request-Id is derived from the order id, ORDER_ALREADY_CAPTURED counts as success,
// and concurrent calls for the same order share one request.
const capturing = new Map<string, Promise<{ ok: boolean; captureId?: string }>>();

export function captureOrder(orderId: string): Promise<{ ok: boolean; captureId?: string }> {
  let p = capturing.get(orderId);
  if (!p) {
    p = doCapture(orderId).finally(() => capturing.delete(orderId));
    capturing.set(orderId, p);
  }
  return p;
}

const captureIdOf = (o: Order) => o.purchase_units?.[0]?.payments?.captures?.[0]?.id;

async function doCapture(orderId: string): Promise<{ ok: boolean; captureId?: string }> {
  const path = `/v2/checkout/orders/${encodeURIComponent(orderId)}`;
  try {
    const order = await paypalFetch<Order>(`${path}/capture`, {
      method: "POST",
      requestId: `haggle-capture-${orderId}`,
      body: {},
    });
    if (order.status === "COMPLETED") return { ok: true, captureId: captureIdOf(order) };
    console.error(`[paypal] capture of ${orderId} returned status ${order.status}`);
  } catch (err) {
    console.error(`[paypal] capture of ${orderId} failed: ${describeError(err)}`);
    if (err instanceof PayPalError && err.status === 0) return { ok: false }; // no config / no network
  }
  // Already captured (ORDER_ALREADY_CAPTURED) or an unclear result: ask PayPal for the truth.
  try {
    const order = await paypalFetch<Order>(path, { method: "GET" });
    if (order.status === "COMPLETED") return { ok: true, captureId: captureIdOf(order) };
  } catch (err) {
    console.error(`[paypal] get order ${orderId} failed: ${describeError(err)}`);
  }
  return { ok: false };
}

// The return_url handler's logic. Marks the deal captured or failed.
export async function captureDeal(dealId: string, orderId: string): Promise<"captured" | "failed" | "missing"> {
  const deal = getDeal(dealId);
  if (!deal) return "missing";
  if (deal.status === "captured") return "captured";
  if (!orderId || orderId !== deal.paypalOrderId) {
    console.error(`[paypal] capture for deal ${dealId}: order id does not match the deal`);
    return "failed";
  }
  const { ok } = await captureOrder(orderId);
  // Another request may have finished while we waited; never downgrade a captured deal.
  if (getDeal(dealId)?.status === "captured") return "captured";
  updateDeal(dealId, { status: ok ? "captured" : "failed" });
  return ok ? "captured" : "failed";
}
