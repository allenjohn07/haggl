// Shared types. Source of truth: docs/CONTRACTS.md. Keep the two in sync.

export type Side = "buyer" | "seller";

// One turn by an agent. The server validates it before it is shown or stored.
export type Move = {
  say: string;                         // in-character line, max ~200 chars
  action: "offer" | "accept" | "walk";
  price?: number;                      // whole dollars; required for "offer", ignored otherwise
};

export type Product = {
  id: string;                          // slug, e.g. "haunted-camera"
  name: string;
  blurb: string;                       // one funny line
  emoji: string;                       // shown on the card
  listPrice: number;                   // whole dollars
  sellerFloor: number;                 // PRIVATE: seller never accepts below this
  buyerMax: number;                    // PRIVATE: buyer never accepts above this
};

export type Nudge = "nicer" | "bluff" | "walk_away";

export type Stage =
  | "search"        // looking up / preparing the item (Beanie)
  | "buyer_think"   // buyer agent is generating a turn (Bao)
  | "seller_think"  // seller agent is generating a turn (Mr. Pickle)
  | "checkout"      // seller agent's tool call is creating the PayPal order (Beanie)
  | "capture";      // capturing the approved PayPal order (Beanie)

export type Deal = {
  dealId: string;                      // unguessable (crypto.randomUUID)
  productId: string;
  price: number;                       // agreed price, decided by the server
  listPrice: number;
  status: "agreed" | "order_created" | "captured" | "failed";
  paypalOrderId?: string;
  createdAt: number;
};
