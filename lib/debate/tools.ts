import { findAlternatives } from "@/lib/channel3";
import { bestOffer } from "@/lib/products";
import type { Advisor, Evidence } from "@/lib/types";
import type { State } from "./rules";

// The advisors' real lookups. Each returns an evidence card (or null if nothing was found).
// The stage label is written before the call runs and says honestly what is happening.

export type LookupTool = "check_prices" | "find_alternatives" | "look_closer";

export function lookupLabel(tool: LookupTool, s: State): string {
  if (tool === "check_prices") {
    const n = s.product.offers.length;
    return n > 1 ? `Pulling prices from ${n} stores` : "Pulling the price from the store";
  }
  if (tool === "find_alternatives") return "Looking for similar, cheaper picks";
  return "Reading the reviews and specs";
}

export async function runLookup(tool: LookupTool, s: State, from: Advisor): Promise<Evidence | null> {
  s.used[tool] = true;
  const { product, picked } = s;

  if (tool === "check_prices") {
    const offers = [...product.offers].sort((a, b) => a.price - b.price);
    return {
      from,
      kind: "prices",
      title: offers.length > 1 ? `Same item, ${offers.length} stores` : "Same item, 1 store",
      items: offers.map((o) => ({
        label: o.merchant,
        price: o.price,
        note: [
          o.offerId === picked.offerId ? "your pick" : "",
          o.inStock ? "" : "out of stock",
          o.compareAtPrice && o.compareAtPrice > o.price ? `was $${o.compareAtPrice.toFixed(2)}` : "",
        ].filter(Boolean).join(", ") || undefined,
        productId: product.id,
        offerId: o.offerId,
      })),
    };
  }

  if (tool === "find_alternatives") {
    let alts: Awaited<ReturnType<typeof findAlternatives>> = [];
    try {
      alts = (await findAlternatives(product, 3)).filter((p) => p.id !== product.id && p.offers.length > 0);
    } catch {
      console.warn("[debate] findAlternatives failed");
    }
    if (alts.length === 0) return null;
    s.alternatives.push(...alts); // findAlternatives already remembered them in lib/products
    return {
      from,
      kind: "alternatives",
      title: alts.length === 1 ? "1 similar pick" : `${alts.length} similar picks`,
      items: alts.map((p) => {
        const o = bestOffer(p);
        return { label: p.title, price: o.price, note: o.merchant, productId: p.id, offerId: o.offerId };
      }),
    };
  }

  const items: Evidence["items"] = [];
  if (product.rating) {
    items.push({ label: `Rated ${product.rating.score.toFixed(1)}/5`, note: `${product.rating.count.toLocaleString("en-US")} reviews` });
  }
  for (const f of product.keyFeatures.slice(0, 4)) items.push({ label: f });
  if (items.length === 0) return null;
  return { from, kind: "details", title: "A closer look", items };
}

// Plain-text version of the evidence so far, for the AI prompt.
export function evidenceText(s: State): string {
  if (s.evidence.length === 0) return "No lookups yet.";
  return s.evidence
    .map((e) => {
      const rows = e.items.map((i) => `  - ${i.label}${i.price !== undefined ? `: $${i.price.toFixed(2)}` : ""}${i.note ? ` (${i.note})` : ""}${i.offerId ?` [productId ${i.productId}, offerId ${i.offerId}]` : ""}`);
      return `${e.title} (found by ${e.from}):\n${rows.join("\n")}`;
    })
    .join("\n");
}
