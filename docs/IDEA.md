# IDEA: Haggl

## One line

Two pixel-art AI advisors argue about something you're about to buy, check what it costs elsewhere, ask you a couple of questions, and tell you whether it's worth it. If you say yes, one of them pays for it with PayPal.

## The problem

Shopping agents are coming, but "an AI that buys things for you" is hard to trust. Most of us also overspend on impulse, because nobody is there to ask "do you actually need this?" or "is it cheaper somewhere else?". Haggl makes the agent's reasoning visible and a little funny: two advisors with opposite instincts argue it out in front of you, show their evidence, include you in the decision, and only spend money when you say so.

## What the user does

1. Opens the link and types what they're thinking of buying (or taps a suggestion).
2. Picks a product and a store's price from real search results (Channel3). Prices are fixed by the stores.
3. Watches **Spark** (treat yourself) and **Penny** (frugal skeptic) argue it out face to face on a small stage, in speech bubbles above their heads; the full history is in a transcript sheet.
4. Instead of a typing indicator, the pixel character who's composing pops into the chat: "Shh, let me think", "Pulling prices from 5 stores", or a quick reaction to the other's point.
5. Gets asked two quick questions mid-debate ("What's your budget?", "How often would you use it?") and taps an answer. The argument changes with it.
6. Reads the verdict card: buy, buy it cheaper elsewhere, wait, or skip, with reasons and the best price found.
7. Makes the final call. **Buy** → Spark's agent creates the PayPal order → approve in the PayPal sandbox → receipt. **Skip** → Penny celebrates the money saved.

## Why it wins

- **Agentic commerce:** the agents research (Channel3), reason, and close the purchase with a tool call that creates the PayPal order, with the human approving.
- **Most creative / design:** pixel characters replace every "typing..." and spinner; a calm, Linear-style dark interface.
- **Best demo delivery:** an argument you can follow in a minute, a real price comparison, a real payment.
- **PayPal + AI:** without the AI there's no advice; without PayPal there's no purchase.
- **Technological implementation:** server-side prices that the client can't touch, validated tool calls, no invented prices, interactive pauses in a live stream, idempotent capture, graceful fallbacks.
- **Potential impact:** helps people spend less and trust shopping agents more.

## Constraints that shape the design

- Built solo in about 48 hours: one flow, no accounts, no database.
- Judges open it alone on a phone: it must work cold with no setup.
- Prices must be impossible for the client to tamper with.
- Sandbox money only.

## Not in scope

Accounts, wishlists, price alerts, carts, refunds, admin or analytics. If it isn't in the 3-minute video, we don't build it.
