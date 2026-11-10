import { getOffer, getProduct } from "@/lib/products";
import type { Purchase } from "@/lib/types";

// In-memory purchase store. Single Render instance, no database.
const g = globalThis as unknown as { __purchases?: Map<string, Purchase> };
const purchases = (g.__purchases ??= new Map<string, Purchase>());

// The price always comes from the stored offer. Returns undefined if the product/offer is unknown.
export function createPurchase(debateId: string, productId: string, offerId: string, pickedPrice: number): Purchase | undefined {
  const product = getProduct(productId);
  const offer = getOffer(productId, offerId);
  if (!product || !offer) return undefined;
  const purchase: Purchase = {
    purchaseId: crypto.randomUUID(),
    debateId,
    productId,
    offerId,
    title: product.title,
    merchant: offer.merchant,
    price: offer.price,
    pickedPrice,
    status: "created",
    createdAt: Date.now(),
  };
  purchases.set(purchase.purchaseId, purchase);
  return purchase;
}

export function getPurchase(purchaseId: string): Purchase | undefined {
  return purchases.get(purchaseId);
}

export function updatePurchase(purchaseId: string, patch: Partial<Omit<Purchase, "purchaseId">>): Purchase | undefined {
  const p = purchases.get(purchaseId);
  if (!p) return undefined;
  Object.assign(p, patch);
  return p;
}
