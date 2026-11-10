# Haggl

Two AI agents haggle over a price in front of you as pixel-art characters, then close the deal with a real PayPal sandbox payment at the price they agreed on.

Built for the PayPal AI Hackathon (2026).

## How it works

1. Pick an item at Mr. Pickle's market stall.
2. Optionally nudge your buyer agent, Bao: **Be nicer**, **Bluff** or **Walk away**.
3. Watch Bao and Mr. Pickle trade offers live. Each agent has a private price limit, and the server enforces it.
4. When they agree, the seller agent calls a `create_paypal_order` tool that creates a PayPal order at the negotiated price.
5. Approve the payment in the PayPal sandbox and land on the SOLD screen.

### How AI is used

Two Claude agents (Anthropic API, default `claude-haiku-5-5`) play the buyer and the seller. They return structured moves (offer, accept, walk), which the server checks against each agent's private limit before showing them. The seller agent closes the sale with a tool call.

### How PayPal is used

The seller's tool call creates a PayPal **Orders v2** order (intent `CAPTURE`, USD) in the **sandbox**. The amount always comes from the deal the server stored, never from the browser. After you approve, the app captures the order once (the capture is idempotent) and shows the receipt.

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
| `AI_MODE` | `mock` (scripted negotiations, free) or `live` (real Claude calls) |
| `AI_MODEL` | `claude-haiku-5-5` (default) or `claude-sonnet-5-5` |
| `PAYPAL_CLIENT_ID` | PayPal **sandbox** app client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal **sandbox** app secret (server only) |
| `PAYPAL_BASE` | `https://api-m.sandbox.paypal.com` |
| `APP_URL` | Base URL used for PayPal return and cancel URLs, e.g. `http://localhost:3000` |

Never commit `.env.local`. Only sandbox PayPal credentials are used.

## Run

```sh
npm run dev        # http://localhost:3000
```

`AI_MODE=mock` runs the whole flow with scripted negotiations and no AI cost.

## Tech

Next.js (App Router), TypeScript, Tailwind CSS, Anthropic Claude API, PayPal REST API (Orders v2, sandbox), HTML Canvas pixel art. Hosted on Render.

## License

[MIT](LICENSE)
