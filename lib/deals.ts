import type { Deal } from "@/lib/types";

// In-memory deal store. Single Render instance, no database.
// Kept on globalThis so dev hot-reloads don't wipe it.
const g = globalThis as unknown as { __deals?: Map<string, Deal> };
const deals = (g.__deals ??= new Map<string, Deal>());

export function createDeal(productId: string, price: number, listPrice: number): Deal {
  const deal: Deal = {
    dealId: crypto.randomUUID(),
    productId,
    price,
    listPrice,
    status: "agreed",
    createdAt: Date.now(),
  };
  deals.set(deal.dealId, deal);
  return deal;
}

export function getDeal(dealId: string): Deal | undefined {
  return deals.get(dealId);
}

export function updateDeal(dealId: string, patch: Partial<Omit<Deal, "dealId">>): Deal | undefined {
  const deal = deals.get(dealId);
  if (!deal) return undefined;
  Object.assign(deal, patch);
  return deal;
}
