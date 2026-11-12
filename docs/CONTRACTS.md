# CONTRACTS

Everyone builds against this file. Adding to it is always fine. If you rename or remove something, update this file and every caller in the same PR.

## The flow in one paragraph

The user searches for something they're thinking of buying (Channel3), picks a product and an offer (a fixed price at one store), and then watches their two advisors, **Spark** (treat yourself) and **Penny** (frugal skeptic), message each other about whether it's worth it. Penny pulls the same item's prices at other stores and cheaper alternatives (Channel3). Twice during the debate an advisor stops and asks the user a tap-to-answer question; the debate waits for the answer and uses it. The advisors end with a joint **verdict** (buy, buy elsewhere, wait, skip). The user makes the final call: **Buy** pays the fixed price through PayPal (the advisor calls the `create_paypal_order` tool), **Skip** ends with the advisors reacting. Nobody negotiates a price; prices come from the stores.

## Types (`lib/types.ts`)

`Advisor`, `Offer`, `Product`, `ProductCard`, `Ask`, `Evidence`, `Stage`, `VerdictCall`, `Verdict`, `Purchase`. See the file; it is the source of truth for field names. Prices are USD dollars with cents (`129.99`).

## Shared server stores

- `lib/products.ts`: in-memory product cache. `rememberProducts(list)`, `getProduct(id)`, `getOffer(productId, offerId)`, `bestOffer(p)`, `toCard(p)`. **Every product the user can pick and every alternative an advisor shows must be remembered here first.** Purchase prices are read from here only.
- `lib/purchases.ts`: in-memory purchases. `createPurchase(debateId, productId, offerId, pickedPrice)` copies the price from the stored offer; `getPurchase`, `updatePurchase`.
- `lib/channel3/index.ts` (`search` lane): `searchProducts(query): Promise<Product[]>` and `findAlternatives(product, limit?): Promise<Product[]>` (similar products, cheaper first). Both call `rememberProducts`. `SEARCH_MODE=mock` (default) serves fixtures from `data/fixtures/`, so everything works offline.
- `lib/ratelimit.ts`: `clientIp(request)`, `rateLimit(name, ip, limit, windowMs) => boolean`. Use it for every rate-limited route.
- `lib/paypal/orders.ts` (`paypal`): `createOrderForPurchase(purchaseId) => { orderId, approveUrl }`, `captureOrder(orderId)`, `capturePurchase(purchaseId, orderId)`.

Single Render instance, so in-memory is fine. No database.

## Debate rules (enforced in `lib/debate`, not just in prompts)

- **Turns alternate,** Spark first: Spark pitches, Penny answers. **Max 8 advisor messages** (4 each), then the verdict.
- **They disagree until the end.** Spark champions buying, Penny pushes back; each message has a job (pitch, price check, rebuttal, alternative, answer to it, cost per use, landing) and they only converge in messages 7 and 8. Every message adds a new point; **a price may appear in at most 2 messages** (re-prompt, then the sentence repeating it is dropped). Cost per use at the picked price (daily and weekly for a year) is computed by the server and given to them as a fact.
- **Penny's first turn always runs the price check** (`check_prices` tool: the picked product's offers across stores) and the result is streamed as an `evidence` card. **Penny's second turn always runs `find_alternatives`** (Channel3 similar products, cheaper first, nothing under a quarter of the price); the AI is asked to call it, and the server runs it if it doesn't. If alternatives come back, Penny must name one and Spark's next message must answer it (re-prompt once if not). Spark may call `look_closer` once (ratings, key features). Tool calls are real and stream `stage: lookup` with an honest label ("Pulling prices from 5 stores").
- **Two asks, guaranteed** (max 3). The engine asks Penny for a question after message 2 (budget or need) and Spark after message 5 (how often, or can it wait). An `Ask` has 2 to 4 short options. The stream emits `ask`, then `stage: waiting_user`, and **waits** for `POST /api/debate/answer`. Keep-alive comments every 15 s. If no answer comes in 90 s, the debate continues with "no answer" and the advisors say so in character. Answers are given to both advisors for the rest of the debate.
- **Reactions:** every message after the first carries a short `reaction` (max 60 chars) to the other advisor's last message ("Cute. Wrong, but cute."). No two reactions in a debate start with the same word, and none starts with "Fair"; a reaction that breaks this is replaced by a scripted one. The UI shows it on the pixel character as the message lands.
- **No invented prices:** a dollar amount in an advisor's text must match a price in the evidence, the picked offer, or a user answer (within $1); the gap between the picked price and an evidence price ("$30 cheaper") and the server's cost-per-use figures also count. Otherwise reject, re-prompt once, then drop that sentence.
- **Text limits:** message `text` aims for 90 to 160 chars, hard cap 200 (re-prompt once if over, then trimmed at a sentence boundary; over 160, trailing sentences are dropped when a full thought of 100+ chars remains), PG, in voice. `Ask.question` max 70 chars, one question, 2 to 4 options of max 24 chars (re-prompt once, then a scripted ask). Verdict `headline` max 50 chars, `reasons` max 80 chars each.
- **Verdict:** one final AI call writes the joint `Verdict`. The server validates it: `productId`/`offerId` must exist in `lib/products.ts` (the picked product or an alternative that was shown), and **`price` and `savings` are always recomputed from the stored offers**. If invalid, a rule-based verdict is used (cheapest offer of the picked product; `buy_elsewhere` if it's cheaper than the pick, else `buy` if it fits the user's budget answer, else `wait`).
- **Each AI turn: 12 s timeout, one retry, then a scripted in-character move.** After a turn fails twice, the rest of that debate is scripted, so an outage costs one slow turn. The stream never shows a raw error.
- **Protect the key:** cap `max_tokens`, rate-limit per IP, never log prompts.

## API routes

### `POST /api/search`
Request `{ query: string }` (1 to 80 chars). Response `{ products: ProductCard[] }` (max 8, products with at least one offer). 400 for a bad body. Rate limit 20 per 10 minutes per IP → 429 `{ error }`.

### `POST /api/debate`
Request `{ productId: string, offerId: string }` (the user's pick; must exist in the store). Response `text/event-stream`. Each event is `event: <name>` + `data: <json>`. 404 for an unknown product or offer. Rate limit 6 debates per 10 minutes per IP → 429 `{ error }`.

| Event | Data | When |
|---|---|---|
| `start` | `{ debateId, product: ProductCard, picked: Offer }` | First event |
| `stage` | `{ stage: Stage, advisor?: Advisor, label: string }` | Before each unit of real work. Drives the pixel characters |
| `message` | `{ id, from: Advisor, text, reaction?, turn }` | After each validated advisor message |
| `evidence` | `Evidence & { id }` | A tool call returned prices, alternatives or details |
| `ask` | `Ask` | An advisor asks the user. Followed by `stage: waiting_user` |
| `answer` | `{ askId, answer: string \| null }` | The server received an answer (or `null` after the 90 s timeout) |
| `verdict` | `Verdict` | The joint verdict. The debate is over. `options` carries the comparison (recommended offer first, then the original pick if different), built by the server from stored offers, with each store's product `url` for "View at store" |
| `error` | `{ message }` | Only for unrecoverable problems. The UI shows an in-character screen |
| `done` | `{}` | Stream complete |

### `POST /api/debate/answer`
Request `{ debateId, askId, answer }`. `answer` must be one of the ask's options. 204 on success. 404 unknown debate or ask, 409 already answered, 400 not an option.

### `POST /api/buy`
The user's final call after the verdict. Request `{ debateId, productId, offerId }`: must be either the verdict's pick or the user's original pick (the UI offers both when they differ). The server creates the `Purchase` (price from the stored offer), then **Spark's agent closes the sale by calling the tool `create_paypal_order({ purchaseId })`**. The tool takes only the id; the handler runs `createOrderForPurchase`. If the AI call fails, the server runs the tool itself. Response `{ purchaseId, approveUrl }`, or 502 `{ purchaseId, error }` (the UI then sends the user to `/receipt/<purchaseId>`, which has a retry). 404 unknown debate, 400 an offer that isn't allowed.

### `POST /api/checkout`
`{ purchaseId }` → `{ approveUrl }`. Re-creates the order from the stored Purchase (expired, cancelled, failed). 404 unknown, 409 already paid, 502 PayPal failed. Never accepts a price.

### `GET /api/capture?purchaseId=<id>&token=<paypalOrderId>`
PayPal's `return_url`. Captures **idempotently** (a reload never captures twice), marks the purchase `captured`, redirects (303) to `/receipt/<purchaseId>`; on failure to `/receipt/<purchaseId>?status=failed`. PayPal's `cancel_url` is `/receipt/<purchaseId>?status=cancelled`.

### `/receipt/[purchaseId]` (page)
Reads the stored Purchase (dynamic, never cached). States: **paid** (captured), **retry** (created / order_created / failed / cancelled → a button that POSTs `/api/checkout` and redirects to PayPal), **not found**. All in character. A share line ("Penny and Spark said yes. Paid $79.99, saved $20.") and "Check something else" back to `/`.

### Skip
Client only. After the verdict, **Skip** shows the advisors reacting (Penny cheers, Spark sulks) and how much was not spent, with "Check something else". No server call.

## Character states (`components/pixel`)

`idle | think | lookup | talk | ask | pay | cheer | sulk`

Driven only by real events (the line pools in `data/lines.ts` decide what is said, never when). The debate is shown on a face-off stage: Spark left, Penny right, one speech bubble above each head (their current line only), evidence between or under them, ask options under the stage, and a Transcript sheet with the full history. Details in `docs/CHARACTERS.md`.

| Event | Spark | Penny |
|---|---|---|
| picking a product | idle | idle |
| `stage: search` | lookup | idle |
| `stage: think` (advisor X) | X: **think**, their bubble shows a muted pop-in line in place of a typing indicator | other: idle, their last message stays up |
| `stage: lookup` (advisor X) | X: **lookup**, their bubble shows the server's label | other: idle |
| `message` from X | X: **talk** (steps forward), `reaction` shows as a small muted bubble, then the message replaces it | other: idle |
| `evidence` | the card slides in on the stage and stays until the next evidence or the verdict | |
| `ask` from X | X: **ask**, the question in their bubble, options under the stage | other: idle, bubble cleared |
| user answers | both react with a short line; a "You: …" chip shows the answer | |
| `stage: verdict` | think | think |
| `verdict` buy | cheer | cheer |
| `verdict` buy_elsewhere | cheer | cheer |
| `verdict` wait | sulk | cheer |
| `verdict` skip | sulk | cheer |
| buy in flight (`checkout`) | **pay** | idle |
| receipt paid | cheer | cheer |
| user taps Skip | sulk | cheer |

## Environment variables (`.env.example`)

    ANTHROPIC_API_KEY=            # server only
    AI_MODE=mock                  # mock | live
    AI_MODEL=claude-haiku-5-5     # or claude-sonnet-5-5
    CHANNEL3_API_KEY=             # server only
    SEARCH_MODE=mock              # mock (fixtures) | live (Channel3)
    PAYPAL_CLIENT_ID=             # sandbox app
    PAYPAL_CLIENT_SECRET=         # sandbox app, server only
    PAYPAL_BASE=https://api-m.sandbox.paypal.com
    APP_URL=http://localhost:3000 # used for PayPal return/cancel URLs

## Design tokens

One shared file, `styles/tokens.css`, owned by the `ui` lane; `app/globals.css` maps it to Tailwind names. Everyone uses it.

- **Look:** Linear-style. Near-black background `#08090a`, surfaces barely lifted (`#0f1011`, `#141516`), hairline borders (white at 5 to 10% alpha), small radii (6 to 8px), mostly greys. Secondary text `#8a8f98`.
- **One brand accent:** indigo `#5e6ad2` for primary actions, selection and focus rings. Green `#4cb782` only for status ("Live", savings).
- **Advisor accents are small identity marks:** Spark coral `#f2785c`, Penny teal `#4cc3a8`, used as a dot or a name, and as the soft glow and floor spotlight around their own sprite. Never big filled bubbles.
- **Type:** Inter (variable, with the optical-size axis) for everything, 13 to 14px body at -0.01em, headings semibold at -0.02em and modest sizes. Geist Mono, small and tabular (`.num`), for prices. No other fonts.
- **Components:** shadcn/ui (`components/ui/*`, Radix base, `cn` from `lib/utils.ts`): button, input, badge, separator, sheet (the verdict: right panel on desktop, bottom sheet on phones), kbd.
- **Motion:** 150 to 200ms ease-out, opacity and translate only; off for `prefers-reduced-motion`. No gradients as decoration, glassmorphism, big shadows or glow buttons. The PayPal button keeps PayPal's yellow with the wordmark set in text.

## Routes (pages)

`/` is a one-screen landing page (headline, one call to action, an animated glyph-ember field). `/app` is the app (search, debate, verdict). `/history`, `/receipt/<id>`. Links that start something new go to `/app`; the wordmark goes to `/`.

## Search typeahead, store links and sounds (UI only)

- **Typeahead:** the search box suggests common searches as you type, from the local list in `data/typeahead.ts` (no API call per keystroke). Picking one runs a normal `/api/search`.
- **Product links:** pasting a product page URL into search (or into "Compare with a product link" on the pick bar) looks it up with Channel3's `/v1/lookup`. `POST /api/search` returns that one product, or 404 with a message (Amazon refuses lookups, so it gets a clear "try Best Buy or the brand's store"). If Channel3 can't read a page, the server fetches it once and reads the product data the store publishes for search engines (schema.org JSON-LD, then Open Graph price tags) in `lib/channel3/page.ts`. Works on most brand and Shopify-style stores; big retailers that block non-browsers (Walmart, Target) still fail with the same clear message. Only public http(s) hosts are fetched. `POST /api/debate` takes an optional `compareId`: the advisors see that product as an alternative from the start ("From your link"), the verdict may recommend it, and it is always in `verdict.options` with `linked: true`.
- **"View at store":** the pick bar, the debate's product header and each verdict option link to the store's own product page (`Offer.url`), in a new tab.
- **Sounds:** `app/(app)/_lib/sounds.ts` plays small synthesized sounds (`@web-kits/audio`, MIT, no audio files): a soft pop when an advisor's line lands (Spark a little higher, from the left; Penny lower, from the right), a two-note chime on an ask, and a short chord on the verdict. Every interaction also has its own quiet sound: search (rising swoosh), suggestion arrows (tick), picking a product, starting the debate, answering, opening and closing sheets, buying (a small "cha-ching"), skipping, store links and errors. A mute toggle sits in the debate's top bar and is remembered in `localStorage` (`haggl:sound`).

## History (UI only, this browser)

`/history` lists past debates, newest first: the product, the verdict, the outcome (bought, with a link to `/receipt/<purchaseId>`, or skipped) and the full transcript in a sheet. Stored in `localStorage` (`haggl:history`, last 30) by `app/(app)/_lib/history.ts`: saved when a verdict arrives, outcome added on Buy or Skip. No accounts and no database, so it's per browser. The landing page shows a "Recent" list and every top bar outside the debate links to History. Note: purchases live in server memory, so a receipt link can show "not found" after a server restart.
