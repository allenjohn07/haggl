import { rememberProducts } from "@/lib/products";
import type { State } from "@/lib/debate/rules";
import type { Product } from "@/lib/types";

// A product with one offer per [store, price], all in stock.
export function product(id: string, title: string, offers: [string, number][], brand = "Acme"): Product {
  return {
    id,
    title,
    brand,
    keyFeatures: [],
    offers: offers.map(([merchant, price]) => ({ offerId: `${id}:${merchant}`, merchant, price, url: `https://${merchant}/p/${id}`, inStock: true })),
  };
}

// A debate state where the user picked `pickedStore`'s offer of `p`. Products are remembered like a real search.
export function state(p: Product, pickedStore: string, extra: Partial<State> = {}): State {
  rememberProducts([p, ...(extra.alternatives ?? [])]);
  const picked = p.offers.find((o) => o.merchant === pickedStore)!;
  return {
    debate: { debateId: "d-test", productId: p.id, offerId: picked.offerId, asks: new Map() },
    product: p,
    picked,
    evidence: [],
    messages: [],
    answers: [],
    alternatives: [],
    used: { check_prices: false, find_alternatives: false, look_closer: false },
    ...extra,
  };
}
