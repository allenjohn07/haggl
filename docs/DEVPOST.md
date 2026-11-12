# DEVPOST submission

Copy each section into the Devpost form. Keep this in sync with `README.md`. Only two brackets remain, and both need the owner: the sandbox buyer login and the YouTube link. A submission with a bracket left in it is unfinished.

## Project name
Haggl

## Tagline (short)
Two AI advisors argue about your purchase, check every store, and pay with PayPal only when you say yes.

## Description (name both PayPal and AI)

**Inspiration.** Shopping agents are coming, but an AI that spends your money is hard to trust. And most of us overspend on impulse because nobody asks "do you actually need it?" or "is it cheaper somewhere else?". We wanted an agent whose reasoning you can watch, that includes you in the decision, and that only pays when you say yes.

**What it does.** You search for something you're thinking of buying (real products and prices from many stores, via Channel3) and pick one. Two AI advisors then debate it in front of you: **Spark** says treat yourself, **Penny** is the frugal skeptic. Penny checks the same item at other stores and finds cheaper alternatives; Spark makes the case with ratings and features. Twice they stop and ask you a quick question, such as your budget or how often you'd use it, and your answers change the argument. They end with a verdict (buy, buy it cheaper elsewhere, wait, or skip) and a side-by-side comparison of their pick and yours. Tap **Buy with PayPal** and the advisor's agent creates the PayPal order itself; you approve it in PayPal and get a receipt. Wherever an app would show a spinner or typing dots, a pixel character pops in and talks instead. You can also paste a product link from any store, and past debates and receipts are saved in History.

**How we built it.**
- **Stack:** Next.js and TypeScript on Render, styled with Tailwind and shadcn/ui.
- **AI:** two Claude agents (Claude Haiku 5.5, Anthropic API) take turns with tool use: price check across stores, cheaper alternatives, a closer look at ratings, and a joint verdict. Every turn streams to the browser over server-sent events, and the stream pauses for your answers and resumes.
- **Commerce data:** Channel3's product API supplies products, each store's offer, similar products and link lookups. When a pasted link can't be read, we match the product name written in the link.
- **PayPal:** on Buy, the advisor calls a `create_paypal_order` tool that creates a PayPal **Orders v2** order (CAPTURE, USD) in the **sandbox** for the store's price. We capture it on return, exactly once, even if the page reloads. In this sandbox demo our PayPal business account stands in for the store; in production the store stays the merchant of record and is paid directly through PayPal's agentic commerce services.
- **Trust in code, not prompts:**
  - The server sets every price from the stored store offer; neither the browser nor the AI can change it.
  - An advisor can't quote a price nobody found.
  - The verdict is validated against real offers.
  - A slow or failing AI turn falls back to a scripted, in-character move, so the demo never breaks.
- **Craft:** hand-drawn pixel sprites on an integer-scaled canvas, with states that follow the real server stages; small synthesized sound effects; a mobile-first layout.
- **Quality:** unit tests on the price, verdict, PayPal and link rules, plus CI and CodeQL on every pull request.

**Challenges.** Making two LLM agents actually disagree instead of politely agreeing by message two, without inventing facts or prices. Pausing a live stream mid-debate to wait for the user, then resuming cleanly. Keeping prices honest: every number the agents say is checked against real store offers. Reading product links from big retailers that block automated access, which we solved by matching the product name in the link. And getting the payment step to feel safe: the agent prepares the order, but the human always approves it.

**Accomplishments.** A complete, working loop: real products and prices, a live AI debate you can follow and steer, a verdict with a real comparison, and a real PayPal sandbox payment, all on a phone with no sign-in. Characters replace every loading state. The AI is creative, but the money rules are enforced in code and covered by tests.

**What we learned.** Agent trust comes from structure more than from prompts: validated tools, prices the server owns, and a human approval step. Two agents with opposite goals produce far more useful reasoning than one agent asked to be balanced. And waiting is a design opportunity: a character with something to say beats a spinner.

**What's next.** Real checkout with the store as merchant of record through PayPal's agentic commerce services (Agent Ready, Store Sync); offering Buy only at stores that accept PayPal; price-drop alerts for "wait" verdicts; and spending limits the advisors respect.

## Built with
Next.js, TypeScript, Tailwind CSS, shadcn/ui, Anthropic Claude API (Claude Haiku 5.5), PayPal REST API (Orders v2, sandbox), Channel3 API, Render, HTML Canvas, Vitest, GitHub Actions, CodeQL.

## AI tools used and how
- **Claude Haiku 5.5** (Anthropic API): powers both advisors in the product: the personas, the tool calls (price check, alternatives, closer look), the questions to the user, the joint verdict, and the `create_paypal_order` tool call that starts the payment.
- **Claude Code**: used to build the app, including the code, the tests, the pixel sprites (drawn as pixel maps in code) and the speech-line pools, with the owner directing the design and every product decision.

## Sponsor tools to tick on the form
- **Render**: hosts the live demo.
- **Channel3**: product search, store prices, similar products and link lookups.

## Testing instructions for judges (required)
Open **https://haggl-664a.onrender.com** on a phone or a computer. No sign-in needed.
1. Tap **Start shopping**.
2. Search for something, or tap a suggestion like "espresso machine", and tap a product to pick it. Then tap **Ask Spark and Penny**.
3. Watch them debate. Tap an answer when they ask you something.
4. On the verdict, tap **Buy with PayPal**.
5. On PayPal's page, choose **Log In** (not the card form) and use this **sandbox** test buyer:
   - Email: [SANDBOX BUYER EMAIL]
   - Password: [SANDBOX BUYER PASSWORD]
6. Approve the payment. You land on the receipt. No real money moves.

Optional: paste a product link (e.g. from Best Buy or Amazon) into the search box; open **History** to see past debates and transcripts.

## Links
- Demo: https://haggl-664a.onrender.com
- Repo: https://github.com/allenjohn07/haggl (MIT license)
- Video: [YOUTUBE URL] (public, under 3 minutes)

## Final checklist
- [ ] Every [BRACKET] above is filled in (sandbox buyer login, YouTube link)
- [ ] PayPal and AI both named in the description, "Built with" and the video
- [ ] Demo URL works on a phone from a cold start
- [ ] Sandbox buyer credentials work (log in once yourself first)
- [ ] Repo is public, MIT license visible in About, README complete, no secrets
- [ ] Video is public on YouTube and under 3 minutes
- [ ] Render and Channel3 ticked as sponsor tools
- [ ] Submitted before 1:00pm Mountain Thursday (earlier is better)
