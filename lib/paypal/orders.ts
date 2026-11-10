import { getPurchase, updatePurchase } from "@/lib/purchases";
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

// The advisor's create_paypal_order tool and POST /api/checkout both call this.
// The price ALWAYS comes from the stored Purchase, never from the caller.
const creating = new Map<string, Promise<{ orderId: string; approveUrl: string }>>();

export async function createOrderForPurchase(purchaseId: string): Promise<{ orderId: string; approveUrl: string }> {
  // Two callers at once (agent tool + retry button) share one order.
  let p = creating.get(purchaseId);
  if (!p) {
    p = createOrder(purchaseId).finally(() => creating.delete(purchaseId));
    creating.set(purchaseId, p);
  }
  return p;
}

async function createOrder(purchaseId: string): Promise<{ orderId: string; approveUrl: string }> {
  const purchase = getPurchase(purchaseId);
  if (!purchase) throw new PayPalError("purchase not found", 404);
  if (purchase.status === "captured") throw new PayPalError("purchase already paid", 409);
  if (!Number.isFinite(purchase.price) || purchase.price <= 0) throw new PayPalError("purchase has no valid price");

  try {
    const order = await paypalFetch<Order>("/v2/checkout/orders", {
      method: "POST",
      requestId: `haggl-create-${purchaseId}-${crypto.randomUUID()}`,
      body: {
        intent: "CAPTURE",
        purchase_units: [
          {
            custom_id: purchaseId,
            description: `Haggl: ${purchase.title}`.slice(0, 127),
            amount: { currency_code: "USD", value: purchase.price.toFixed(2) },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "Haggl",
              user_action: "PAY_NOW",
              shipping_preference: "NO_SHIPPING",
              // PayPal appends ?token=<orderId>&PayerID=... to the return URL.
              return_url: appUrl(`/api/capture?purchaseId=${encodeURIComponent(purchaseId)}`),
              cancel_url: appUrl(`/purchase/${encodeURIComponent(purchaseId)}?status=cancelled`),
            },
          },
        },
      },
    });
    const approveUrl = order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
    if (!approveUrl) throw new PayPalError("PayPal order has no approval link");

    updatePurchase(purchaseId, { status: "order_created", paypalOrderId: order.id });
    return { orderId: order.id, approveUrl };
  } catch (err) {
    console.error(`[paypal] create order failed for purchase ${purchaseId}: ${describeError(err)}`);
    if (getPurchase(purchaseId)?.status !== "captured") updatePurchase(purchaseId, { status: "failed" });
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
      requestId: `haggl-capture-${orderId}`,
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

// The return_url handler's logic. Marks the purchase captured or failed.
export async function capturePurchase(purchaseId: string, orderId: string): Promise<"captured" | "failed" | "missing"> {
  const purchase = getPurchase(purchaseId);
  if (!purchase) return "missing";
  if (purchase.status === "captured") return "captured";
  if (!orderId || orderId !== purchase.paypalOrderId) {
    console.error(`[paypal] capture for purchase ${purchaseId}: order id does not match the purchase`);
    return "failed";
  }
  const { ok } = await captureOrder(orderId);
  // Another request may have finished while we waited; never downgrade a captured purchase.
  if (getPurchase(purchaseId)?.status === "captured") return "captured";
  updatePurchase(purchaseId, { status: ok ? "captured" : "failed" });
  return ok ? "captured" : "failed";
}
