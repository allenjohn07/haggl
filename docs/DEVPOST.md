# DEVPOST submission draft

Keep this in sync with `README.md`. Replace everything in [BRACKETS] before submitting. A submission with a bracket left in it is unfinished.

## Project name
Haggl: two AI advisors argue so you don't overspend

## Tagline
Pixel-art AI advisors debate your purchase, check other stores' prices, ask you what matters, and pay with PayPal only when you say yes.

## Description (name both PayPal and AI)

**Inspiration.** Shopping agents are coming, but an AI that spends your money is hard to trust, and most of us overspend on impulse because nobody asks "do you need it?" or "is it cheaper elsewhere?". We wanted to make an agent's reasoning visible, a little funny, and include the human in every step.

**What it does.** Search for something you're thinking of buying and pick a store's price. Your two advisors, Spark (treat yourself) and Penny (frugal skeptic), message each other about it. Penny pulls the same item's prices at other stores and cheaper alternatives; Spark digs into ratings and features. Mid-debate they stop and ask you quick questions, and your answers change the argument. They end with a verdict: buy, buy it cheaper elsewhere, wait, or skip. If you tap Buy, Spark's agent closes the purchase by calling a tool that creates a PayPal order for the store's price; you approve in PayPal and get a receipt. Wherever a chat app would show typing dots, the advisor's pixel character pops in and talks instead.

**How we built it.** Next.js and TypeScript on Render. Two Claude agents (Claude Haiku 5.5) take turns through the Anthropic SDK with tool use, streamed to the browser over server-sent events; the stream pauses for the user's answers and resumes. Channel3's product search API supplies products, each store's offer, and similar products. The server stores every offer and decides every price, rejects advisor messages that mention prices not in the evidence, and validates the verdict. The advisor's `create_paypal_order` tool creates a PayPal Orders v2 order in the sandbox; we capture it on return, idempotently. The characters are hand-drawn pixel art on an integer-scaled canvas, and their states follow the real server stages.

**Challenges.** [FILL IN after the build.]

**Accomplishments.** [FILL IN after the build.]

**What we learned.** [FILL IN.]

**What's next.** Price-drop alerts for "wait" verdicts, spending limits the advisors respect, and checkout with the real store.

## Built with
Next.js, TypeScript, Tailwind CSS, Anthropic Claude API (Claude Haiku 5.5), Channel3 API, PayPal REST API (Orders v2, sandbox), [PayPal Agent Toolkit if used], Render, HTML Canvas.

## AI tools used and how
- **Claude Haiku 5.5** (Anthropic API): powers both advisors (personas, tool calls for price checks and alternatives, questions to the user, the verdict, and the PayPal tool call).
- **Claude Code**: used to build the app, with parallel agents working in separate git worktrees.
- Pixel characters and speech-line pools: [CONFIRM how they were made].

## Sponsor tools to tick on the form
Render (hosting), Channel3 (product search and prices).

## Testing instructions for judges (required)
Open [DEMO URL] on a phone. No sign-in needed.
1. Search for something (or tap a suggestion) and pick a product.
2. Watch Spark and Penny debate. Tap an answer when they ask you something.
3. On the verdict, tap **Buy** (PayPal).
4. Log in to the PayPal **sandbox** with this test buyer account:
   - Email: [SANDBOX BUYER EMAIL]
   - Password: [SANDBOX BUYER PASSWORD]
5. Approve the payment. You land on the receipt. No real money moves.

## Links
- Demo: [DEMO URL]
- Repo: [GITHUB URL] (MIT license)
- Video: [YOUTUBE URL] (public, under 3 minutes)

## Video script (target 2:30, hard limit 3:00)
| Time | What's on screen | Say |
|---|---|---|
| 0:00 to 0:12 | Phone, the search screen | "We all overspend on impulse. What if two advisors argued it out first?" |
| 0:12 to 0:25 | Search, pick headphones at one store | "Meet Haggl. Pick something you want." |
| 0:25 to 1:20 | The debate: characters popping in, price check card, a question, tapping an answer | Let it play; one line of narration at most |
| 1:20 to 1:40 | Verdict card | "They agree: buy it, but at the cheaper store." |
| 1:40 to 2:10 | Buy, Spark writes the order, PayPal sandbox approval, receipt | "The advisor calls a tool that creates the PayPal order. The server sets the price; nobody can tamper with it." |
| 2:10 to 2:30 | Quick architecture card | "Claude agents, Channel3 prices, PayPal Orders, on Render. Haggl: shopping agents you can watch and trust." |

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
