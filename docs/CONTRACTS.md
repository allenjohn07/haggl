# CONTRACTS

Everyone builds against this file. Adding to it is always fine. If you rename or remove something, update this file and every caller in the same PR.

## Types (`lib/types.ts`)

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

## Deal store (`lib/deals.ts`, shared)

In memory, on `globalThis`, single instance. `createDeal(productId, price, listPrice)` (status `agreed`, `dealId` from `crypto.randomUUID()`), `getDeal(dealId)`, `updateDeal(dealId, patch)`. `engine` creates deals; `paypal` reads and updates them. Prices passed to `createDeal` come only from the server's negotiation history.

**Privacy rule:** `sellerFloor` and `buyerMax` never leave the server. They are not in any SSE event, API response, client bundle or log line. The client gets only `id`, `name`, `blurb`, `emoji` and `listPrice`.

## Negotiation rules (enforced in `lib/negotiate`, not just in prompts)

- Max **8 rounds**. A round is one buyer move plus one seller move.
- The buyer opens. Offers are whole dollars between 1 and `listPrice`.
- The buyer may never accept or offer above `buyerMax`. The seller may never accept below `sellerFloor`.
- If a move breaks a rule: reject it, re-prompt that agent once with the rule stated, and if it still breaks it, clamp the price into the legal range and say so in-character.
- A buyer `accept` is only valid if it accepts the seller's latest offer. A seller `accept` is only valid if it accepts the buyer's latest offer.
- **Deal price = the accepted offer,** computed by the server from the stored history. Never taken from the client or from free text.
- `walk` ends the negotiation with a `nodeal`.
- After round 8 with no deal: the dramatic fallback. The server proposes the midpoint of the last two offers; if it is within both limits, both agents accept in character and a deal is made. Otherwise `nodeal` with a funny reason.
- Each AI turn has a **12 second timeout**, one retry, then an in-character **scripted fallback move** that stays inside the legal range. The stream never shows a raw error to a judge.
- `nudge` is injected as a private instruction to the buyer's next turn only ("be nicer", "bluff", "walk away"). `walk_away` makes the buyer walk immediately (with a line); it is a legitimate way to end the demo early.

## Seller tool (the agentic commerce moment)

When the seller accepts, the **seller agent closes the deal by calling a tool:**

    create_paypal_order({ dealId: string })

- The tool takes **only** the `dealId`. The price comes from the server's stored `Deal`, never from the model.
- The implementation is `createOrderForDeal(dealId)` in `lib/paypal/orders.ts`. It creates a PayPal Orders v2 order (intent `CAPTURE`, currency USD) for `deal.price` and returns `{ orderId, approveUrl }`.
- If time allows, use PayPal's Agent Toolkit for this call. Otherwise wrap the REST call. Verify request shapes against the current PayPal docs.
- The tool call is visible in the stream (`stage: "checkout"`, then `order`).

## API routes

### `GET /api/products`
Returns `Product[]` with private fields removed: `{ id, name, blurb, emoji, listPrice }[]`.

### `POST /api/negotiate`
Request: `{ productId: string, nudge?: Nudge }`
Response: `text/event-stream` (SSE). Each event is `event: <name>` + `data: <json>`. Events:

| Event | Data | When |
|---|---|---|
| `stage` | `{ stage: Stage, label: string }` | Before each unit of work; drives the characters |
| `message` | `{ side: Side, say: string, action: Move["action"], price?: number, round: number }` | After each validated move |
| `deal` | `{ dealId: string, productId: string, price: number, listPrice: number }` | Both sides agreed |
| `order` | `{ dealId: string, approveUrl: string }` | The seller's tool call created the PayPal order |
| `nodeal` | `{ reason: string }` | Walk-away or a failed fallback |
| `error` | `{ message: string }` | Only for unrecoverable problems; the UI shows an in-character screen |
| `done` | `{}` | Stream complete |

Rate limit: per IP (for example 10 negotiations per 10 minutes). Over the limit returns HTTP 429 with `{ error: "..." }`, shown in character ("Pickle is on his break.").

### `POST /api/checkout`
Request: `{ dealId: string }` → `{ approveUrl: string }`.
Used to **re-create** the order if the first approval link expired or the user came back. Same price from the stored `Deal`. 404 for an unknown `dealId`.

### `GET /api/capture?token=<paypalOrderId>&dealId=<dealId>`
PayPal's `return_url`. Captures the order (**idempotent**: a second call with the same order returns the same result, never a second capture), marks the deal `captured`, then redirects to `/deal/<dealId>`. On failure redirects to `/deal/<dealId>?status=failed`.

### `GET /deal/[dealId]` (page)
Reads the stored `Deal`. Shows SOLD (captured), a retry button (order_created or failed), or a friendly "deal not found" in character. Includes the share card ("Got it for 38% off") computed from `listPrice` and `price`.

## Character states (`components/pixel`)

`idle | think | search | talk | pay | cheer | sulk`

Stage to state mapping (the UI owns this mapping; it only reads `stage` events):

| Stage / event | Bao (buyer) | Mr. Pickle (seller) | Beanie (clerk) |
|---|---|---|---|
| (no work) | idle | idle | idle |
| `search` | idle | idle | **search** |
| `buyer_think` | **think** | idle | idle |
| `message` from buyer | **talk** | idle | idle |
| `seller_think` | idle | **think** | idle |
| `message` from seller | idle | **talk** | idle |
| `checkout` | idle | **pay** (stamps the deal) | **pay** |
| `capture` | idle | idle | **pay** |
| `deal` | **cheer** | **sulk** | idle |
| captured SOLD page | **cheer** | **sulk** | **cheer** |
| `nodeal` | **sulk** | **cheer** | idle |

Speech bubbles read from `data/lines.ts`, keyed by `character` and `state` (see `docs/CHARACTERS.md`). A bubble appears the moment its state starts; negotiation `say` text appears in the chat log and as a short bubble on the speaker.

## Environment variables (`.env.example`)

    ANTHROPIC_API_KEY=            # server only
    AI_MODE=mock                  # mock | live
    AI_MODEL=claude-haiku-5-5     # or claude-sonnet-5-5
    PAYPAL_CLIENT_ID=             # sandbox app
    PAYPAL_CLIENT_SECRET=         # sandbox app, server only
    PAYPAL_BASE=https://api-m.sandbox.paypal.com
    APP_URL=http://localhost:3000 # used for PayPal return/cancel URLs

Optional, only if Channel3 is used: `CHANNEL3_API_KEY`.

## Design tokens

One shared file (`styles/tokens.css` or Tailwind theme): pixel palette (warm market stall, day and dusk variants), outline colour `#2a2033`, UI chip style (frosted light and dark), font pair (a rounded UI font plus a mono for prices). The `ui` lane owns it; everyone else imports from it.
