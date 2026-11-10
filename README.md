# Haggl

Two pixel-art AI advisors argue about something you're about to buy, check what it costs elsewhere, ask you a couple of questions, and tell you whether it's worth it. If you say yes, one of them pays for it with a real PayPal sandbox payment.

Built for the PayPal AI Hackathon (2026).

## How it works

1. Search for something you're thinking of buying and pick a product and a store's price (real results from Channel3).
2. Watch **Spark** (treat yourself) and **Penny** (frugal skeptic) message each other about it. Penny pulls the same item's prices at other stores and cheaper alternatives.
3. While an advisor is working, its pixel character pops into the chat instead of a typing indicator.
4. Answer the two quick questions they ask you; the argument changes with your answers.
5. Read the verdict: buy, buy it cheaper elsewhere, wait, or skip.
6. **Buy** → Spark's agent calls a `create_paypal_order` tool → approve in the PayPal sandbox → receipt. Or **Skip** and see what you saved.

### How AI is used

Two Claude agents (Anthropic API, default `claude-haiku-5-5`) play the advisors. They call tools to check prices and find alternatives, ask the user questions, react to each other, and write a joint verdict. The server validates every message (no invented prices) and the verdict (the price always comes from the stored store offer). On **Buy**, the advisor closes the purchase with a tool call.

### How PayPal is used

The advisor's tool call creates a PayPal **Orders v2** order (intent `CAPTURE`, USD) in the **sandbox** for the store's fixed price, read from the server's stored offer, never from the browser. After you approve, the app captures the order once (the capture is idempotent) and shows the receipt.

### How Channel3 is used

Channel3's product search API (`/v1/search`) supplies the products, each store's offer and price, ratings and key features, and similar products for the price check.

## Setup

Requirements: Node.js 20+ and npm.

```sh
git clone https://github.com/allenjohn07/haggl.git
cd haggl
npm install
cp .env.example .env.local   # then fill in the values
```

### Environment variables

| Name | What it is |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key (server only) |
| `AI_MODE` | `mock` (scripted debates, free) or `live` (real Claude calls) |
| `AI_MODEL` | `claude-haiku-5-5` (default) or `claude-sonnet-5-5` |
| `CHANNEL3_API_KEY` | Channel3 API key (server only) |
| `SEARCH_MODE` | `mock` (saved fixtures) or `live` (real Channel3 search) |
| `PAYPAL_CLIENT_ID` | PayPal **sandbox** app client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal **sandbox** app secret (server only) |
| `PAYPAL_BASE` | `https://api-m.sandbox.paypal.com` |
| `APP_URL` | Base URL used for PayPal return and cancel URLs, e.g. `http://localhost:3000` |

Never commit `.env.local`. Only sandbox PayPal credentials are used.

## Run

```sh
npm run dev        # http://localhost:3000
```

With `AI_MODE=mock` and `SEARCH_MODE=mock`, the whole flow runs offline with no API cost.

## Tech

Next.js (App Router), TypeScript, Tailwind CSS, Anthropic Claude API, Channel3 product search API, PayPal REST API (Orders v2, sandbox), HTML Canvas pixel art. Hosted on Render.

## License

[MIT](LICENSE)
