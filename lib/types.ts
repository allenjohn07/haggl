// Shared types. Source of truth: docs/CONTRACTS.md. Keep the two in sync.
// Prices are numbers in USD dollars with cents (e.g. 129.99). Format with toFixed(2).

export type Advisor = "spark" | "penny"; // spark: "treat yourself"; penny: the frugal skeptic

// One retailer's price for a product (from Channel3 `offers[]`).
export type Offer = {
  offerId: string;            // stable within the product, e.g. "<productId>:<domain>"
  merchant: string;           // display name or domain, e.g. "bestbuy.com"
  price: number;
  compareAtPrice?: number;    // "was" price, if the merchant shows one
  url: string;                // merchant product page (shown as a link, never fetched by the client)
  inStock: boolean;
};

// A product as stored on the server (lib/products.ts). Prices are never taken from the client.
export type Product = {
  id: string;
  title: string;
  brand?: string;
  image?: string;
  description?: string;
  keyFeatures: string[];
  rating?: { score: number; count: number }; // score out of 5
  offers: Offer[];            // at least one
};

// What the browser gets from /api/search. Same data, trimmed for display.
export type ProductCard = {
  id: string;
  title: string;
  brand?: string;
  image?: string;
  rating?: { score: number; count: number };
  bestOffer: Offer;           // the cheapest in-stock offer
  offerCount: number;
};

// A tap-to-answer question one advisor asks the user mid-debate.
export type Ask = {
  askId: string;
  from: Advisor;
  question: string;           // max ~90 chars
  options: string[];          // 2 to 4 chips, each max ~28 chars
};

// Price evidence an advisor pulled with a tool, shown as a card in the chat.
export type Evidence = {
  from: Advisor;
  kind: "prices" | "alternatives" | "details";
  title: string;              // e.g. "Same item, 4 stores"
  items: { label: string; price?: number; note?: string; productId?: string; offerId?: string }[];
};

export type Stage =
  | "search"        // Channel3 product search for the picker
  | "think"         // an advisor's AI turn is in flight (with `advisor`)
  | "lookup"        // an advisor's tool call is running: price check, alternatives (with `advisor`)
  | "waiting_user"  // paused on an Ask
  | "verdict"       // the joint verdict is being written
  | "checkout"      // the advisor's create_paypal_order tool call is creating the PayPal order
  | "capture";      // capturing the approved PayPal order

export type VerdictCall = "buy" | "buy_elsewhere" | "wait" | "skip";

export type Verdict = {
  call: VerdictCall;
  headline: string;           // handwritten on the card, max ~60 chars
  reasons: string[];          // 2 to 4 short bullets
  productId: string;          // what to buy if the user says yes (may be an alternative)
  offerId: string;            // which offer; must exist on that stored product
  price: number;              // copied from the stored offer by the server
  savings?: number;           // vs. the offer the user first picked, if cheaper
  options?: VerdictOption[];  // comparison: recommended first, then the original pick if different (set by the server)
};

export type Purchase = {
  purchaseId: string;         // unguessable (crypto.randomUUID)
  debateId: string;
  productId: string;
  offerId: string;
  title: string;
  merchant: string;
  price: number;              // from the stored offer, decided by the server
  pickedPrice: number;        // the price of the offer the user first picked
  status: "created" | "order_created" | "captured" | "failed";
  paypalOrderId?: string;
  createdAt: number;
};

// One product in the verdict's comparison, built by the server from its stored offers.
// The verdict lists the recommended offer first, then the user's original pick if it differs.
export type VerdictOption = {
  productId: string;
  offerId: string;
  title: string;
  brand?: string;
  image?: string;
  rating?: { score: number; count: number };
  merchant: string;
  price: number;
  compareAtPrice?: number;
  url: string;                // the store's product page
  inStock: boolean;
  recommended: boolean;       // the verdict's pick
  picked: boolean;            // the user's original pick
  linked?: boolean;           // the product the user brought from a pasted link
};
