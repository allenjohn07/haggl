// Run a negotiation directly (no HTTP) and print its events, plus privacy and rule checks.
//   npx tsx scripts/negotiate.ts [productId|all] [nudge]
// Uses AI_MODE from the environment (default mock).
import { PRODUCTS, getProduct } from "@/data/products";
import { negotiate } from "@/lib/negotiate/run";
import type { Nudge, Product } from "@/lib/types";

const ALLOWED_KEYS: Record<string, string[]> = {
  stage: ["stage", "label"],
  message: ["side", "say", "action", "price", "round"],
  deal: ["dealId", "productId", "price", "listPrice"],
  order: ["dealId", "approveUrl"],
  order_failed: ["dealId", "message"],
  nodeal: ["reason"],
  error: ["message"],
  done: [],
};

async function runOne(product: Product, nudge?: Nudge): Promise<string[]> {
  const problems: string[] = [];
  console.log(`\n=== ${product.id}${nudge ? ` (nudge: ${nudge})` : ""} ===`);
  const t0 = Date.now();
  for await (const { event, data } of negotiate(product, nudge)) {
    const json = JSON.stringify(data);
    console.log(`+${String(Date.now() - t0).padStart(5)}ms ${event.padEnd(12)} ${json}`);

    // Leak check: only contract fields, never private-limit field names.
    const keys = Object.keys(data);
    const extra = keys.filter((k) => !ALLOWED_KEYS[event]?.includes(k));
    if (!ALLOWED_KEYS[event]) problems.push(`unknown event ${event}`);
    if (extra.length) problems.push(`${event} has unexpected fields ${extra.join(",")}`);
    if (/sellerFloor|buyerMax/i.test(json)) problems.push(`${event} mentions a private field name`);

    // Rule check against this product's private limits.
    const d = data as { side?: string; action?: string; price?: number };
    if (event === "message" && d.price !== undefined) {
      if (d.side === "buyer" && d.price > product.buyerMax) problems.push(`buyer went above max: ${d.price}`);
      if (d.side === "seller" && d.price < product.sellerFloor) problems.push(`seller went below floor: ${d.price}`);
      if (!Number.isInteger(d.price) || d.price < 1 || d.price > product.listPrice) problems.push(`illegal price ${d.price}`);
    }
    if (event === "deal") {
      const p = (data as { price: number }).price;
      if (p > product.buyerMax || p < product.sellerFloor) problems.push(`deal price outside limits: ${p}`);
    }
  }
  return problems;
}

async function main() {
  const [arg = "all", nudgeArg] = process.argv.slice(2);
  const nudge = nudgeArg as Nudge | undefined;
  const products = arg === "all" ? PRODUCTS : [getProduct(arg)].filter((p): p is Product => !!p);
  if (!products.length) throw new Error(`unknown product ${arg}`);
  console.log(`AI_MODE=${process.env.AI_MODE ?? "mock"}`);

  const problems: string[] = [];
  for (const p of products) problems.push(...(await runOne(p, nudge)).map((m) => `${p.id}: ${m}`));

  if (problems.length) {
    console.error(`\nFAIL\n${problems.join("\n")}`);
    process.exit(1);
  }
  console.log(`\nOK: ${products.length} negotiation(s), no private fields leaked, all prices within limits.`);
}

main();
