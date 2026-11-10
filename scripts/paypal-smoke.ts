// PayPal sandbox smoke test.
//   1) npx tsx --env-file=.env.local scripts/paypal-smoke.ts
//      Creates a purchase and a PayPal order, prints the approve URL. Open it, log in as the sandbox buyer, approve.
//      (The return to localhost will fail if no dev server is running; that's fine, the order stays approved.)
//   2) npx tsx --env-file=.env.local scripts/paypal-smoke.ts <orderId>
//      Captures the approved order twice in a row and twice at once. All must report the same capture id.
import { rememberProducts } from "@/lib/products";
import { createPurchase } from "@/lib/purchases";
import { describeError } from "@/lib/paypal/client";
import { captureOrder, createOrderForPurchase } from "@/lib/paypal/orders";

async function create() {
  rememberProducts([
    {
      id: "smoke-headphones",
      title: "Smoke Test Headphones",
      keyFeatures: [],
      offers: [{ offerId: "smoke-headphones:example.com", merchant: "example.com", price: 89.99, url: "https://example.com", inStock: true }],
    },
  ]);
  const purchase = createPurchase("smoke", "smoke-headphones", "smoke-headphones:example.com", 89.99)!;
  console.log(`purchase ${purchase.purchaseId}: ${purchase.title} for $${purchase.price.toFixed(2)}`);
  const { orderId, approveUrl } = await createOrderForPurchase(purchase.purchaseId);
  console.log(`order   ${orderId}`);
  console.log(`approve ${approveUrl}`);
  console.log(`then:   npx tsx --env-file=.env.local scripts/paypal-smoke.ts ${orderId}`);
}

async function capture(orderId: string) {
  const first = await captureOrder(orderId);
  const second = await captureOrder(orderId);
  const [third, fourth] = await Promise.all([captureOrder(orderId), captureOrder(orderId)]);
  const all = [first, second, third, fourth];
  all.forEach((r, i) => console.log(`capture #${i + 1}: ok=${r.ok} captureId=${r.captureId ?? "-"}`));
  const ids = new Set(all.map((r) => r.captureId));
  if (!all.every((r) => r.ok) || ids.size !== 1) {
    console.error("FAIL: captures were not all successful with one capture id (was the order approved?)");
    process.exit(1);
  }
  console.log("PASS: idempotent, one capture");
}

const orderId = process.argv[2];
(orderId ? capture(orderId) : create()).catch((err) => {
  console.error(`FAIL: ${describeError(err)}`);
  process.exit(1);
});
