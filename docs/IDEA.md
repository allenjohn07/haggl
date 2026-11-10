# IDEA: Haggle

## One line

Two AI agents haggle over a price in front of you as pixel-art characters, then close the deal with a real PayPal sandbox payment at the price they agreed on.

## The problem

Negotiating is exhausting and awkward, so most people don't do it and overpay. Agentic commerce (software that shops and pays on your behalf) is coming, but it is hard to picture and harder to trust. Haggle makes it visible, funny and safe: you watch the agent work, you can nudge it, and you approve the payment yourself.

## What the user does

1. Opens the link on a phone and sees a little market stall with two characters.
2. Picks an item (a "haunted" film camera, a sentient lamp, and so on).
3. Optionally nudges their buyer agent: **Be nicer**, **Bluff**, **Walk away**.
4. Watches Bao (the buyer) and Mr. Pickle (the shopkeeper) trade offers in a chat. A haggle meter shows the two prices converging.
5. When they agree, Mr. Pickle stamps the deal and his agent creates the PayPal order itself.
6. The user approves in PayPal (sandbox) and lands on a SOLD screen with a shareable receipt ("got it for 38% off").

## Why it wins

- **Agentic Commerce:** the seller agent closes the sale by calling a tool that creates the PayPal order. The AI is not a chatbot bolted next to a checkout button; it is the thing that moves the money.
- **Most Creative / Design:** pixel characters replace every spinner and "Thinking..." with a speaking character, so even waiting is entertainment.
- **Best Demo Delivery:** the demo is 3 minutes of a funny negotiation, then a real payment. Easy to follow, easy to remember.
- **PayPal + AI:** each is essential. Without PayPal there is no deal; without AI there is no negotiation.
- **Technological Implementation:** server-enforced price limits, private agent limits that never leak, streamed turns, idempotent capture, graceful fallbacks.
- **Potential Impact:** a friendly, transparent way to picture agent-to-agent commerce, with the human always approving the payment.

## Constraints that shape the design

- Built solo in about 48 hours, so there is one screen, one flow and no database.
- Judges open it alone on a phone, so it must work cold with no setup.
- It must be impossible for the client to tamper with the price.
- Sandbox money only. The result still has to feel real.

## Not in scope

Accounts, a real marketplace, multi-item carts, refunds, admin or analytics. If it isn't visible in the 3-minute video, we don't build it.
