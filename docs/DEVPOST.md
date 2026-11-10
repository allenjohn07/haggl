# DEVPOST submission draft

Keep this in sync with `README.md`. Replace everything in [BRACKETS] before submitting. A submission with a bracket left in it is unfinished.

## Project name
Haggl: the agents that haggle (and actually pay)

## Tagline
Watch two pixel-art AI agents negotiate a price, then close the deal with a real PayPal payment.

## Description (name both PayPal and AI)

**Inspiration.** Agentic commerce is coming, but it's hard to picture and harder to trust. We wanted to make it visible, funny and safe: you watch the agent work, you can nudge it, and you approve the payment yourself.

**What it does.** Pick an item and watch Bao, your buyer agent, haggle live against Mr. Pickle, a grumpy shopkeeper agent. Each has a private price limit. You can nudge Bao to be nicer, bluff, or walk away. When they agree, the seller agent closes the sale by calling a tool that creates a PayPal order at the negotiated price. You approve in PayPal and get a SOLD receipt you can share. Wherever a normal app would show a spinner, a pixel character shows up and talks instead.

**How we built it.** Next.js and TypeScript on Render. Two Claude agents (Claude Haiku 5.5 for fast turns) take turns through the Anthropic SDK, streamed to the browser over server-sent events. The server enforces each agent's private limit and decides the final price, so the client can never alter it. The seller agent's `create_paypal_order` tool call creates a PayPal Orders v2 order in the PayPal sandbox; we capture it on return, idempotently. The characters are procedural pixel art drawn on an integer-scaled canvas, and their states follow the real server stages.

**Challenges.** Keeping agents from leaking or breaking their private limits; making slow or failed AI turns feel in-character rather than broken; getting a pixel look that stays crisp on any phone.

**Accomplishments.** [FILL IN after the build: what you're proudest of.]

**What we learned.** [FILL IN.]

**What's next.** Real sellers who run their own agents, saved payment preferences and spending limits, and agent-to-agent receipts.

## Built with
Next.js, TypeScript, Tailwind CSS, Anthropic Claude API (Claude Haiku 5.5), PayPal REST API (Orders v2, sandbox), [PayPal Agent Toolkit if used], Render, HTML Canvas.

## AI tools used and how
- **Claude Haiku 5.5** (Anthropic API): powers both negotiating agents (buyer and seller personas, private limits, structured moves, and the seller's PayPal tool call).
- **Claude Code**: used to build the app, with parallel agents working in separate git worktrees.
- Pixel characters and speech-line pools were written by hand and with Claude; [CONFIRM].

## Sponsor tools to tick on the form
Render (hosting). [Channel3 only if used.]

## Testing instructions for judges (required)
Open [DEMO URL] on a phone. No sign-in needed.
1. Pick an item and tap **Start haggling**.
2. Watch the negotiation. When a deal is reached, tap **Pay with PayPal**.
3. Log in to the PayPal **sandbox** with this test buyer account:
   - Email: [SANDBOX BUYER EMAIL]
   - Password: [SANDBOX BUYER PASSWORD]
4. Approve the payment. You land on the SOLD screen. No real money moves.

## Links
- Demo: [DEMO URL]
- Repo: [GITHUB URL] (MIT license)
- Video: [YOUTUBE URL] (public, under 3 minutes)

## Video script (target 2:30, hard limit 3:00)
| Time | What's on screen | Say |
|---|---|---|
| 0:00 to 0:10 | Phone, the market stall | "Negotiating is exhausting, so most of us just overpay. What if your agent did it for you?" |
| 0:10 to 0:25 | Pick the item, tap a nudge | "Meet Haggl. Pick an item, nudge your buyer, and watch." |
| 0:25 to 1:25 | The live negotiation, characters talking, meter converging | Let it play; one line of narration at most |
| 1:25 to 1:50 | Deal, Pickle stamps it, Beanie "writing up the invoice" | "When they agree, the seller agent calls a tool that creates the PayPal order itself." |
| 1:50 to 2:15 | PayPal sandbox approval, SOLD screen, share card | "I approve the payment. The server set the price, so no one can tamper with it." |
| 2:15 to 2:30 | Quick architecture card | "Claude agents, streamed over SSE, PayPal Orders on Render. Haggl: agentic commerce you can watch." |

Record on a real phone (screen recording). No copyrighted music. Upload early; processing takes time.

## Final checklist
- [ ] Every [BRACKET] above is filled in
- [ ] PayPal and AI both named in the description, "Built with" and the video
- [ ] Demo URL works on a phone from a cold start
- [ ] Sandbox buyer credentials work
- [ ] Repo is public, MIT license visible in About, README complete, no secrets
- [ ] Video is public on YouTube and under 3 minutes
- [ ] Sponsor tools ticked
- [ ] Submitted before 1:00pm Mountain Thursday (earlier is better)
