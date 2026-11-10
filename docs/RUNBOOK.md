# RUNBOOK: PayPal AI Hackathon rules

Source: https://paypalaihackathon.devpost.com (Overview, Rules, Resources, Updates, FAQs). Sponsor: PayPal Inc. Administrator: Devpost, Inc. If this file and the live page disagree, the live Official Rules win; tell the human.

## Deadline

**Thu Nov 12 2026, 12:00pm PST = 1:00pm Mountain (3:00pm EST, 8:00pm GMT).**
Submissions opened Oct 1 2026. Judging: Dec 1 to Dec 15 2026. Winners announced about Dec 21 2026.

- After about 10:00am Mountain Thursday: merge only fixes.
- After the deadline: **no commits, README edits or video swaps** until winners are announced. Submissions can be edited only as drafts before the deadline.
- Keep the demo, test credentials, API keys and any trials or credits **active until winners are announced.**

## What we must build

- An application that integrates the PayPal developer platform (free sandbox) with an AI tool, model or platform of our choice.
- PayPal integration must be **central**, not decoration. The AI must be meaningfully incorporated.
- It must be a **working** prototype or proof of concept. Mockups, static prototypes and non-functional demos do not qualify.
- It must run reliably and function as shown in the video and description.
- It must be new, or significantly updated after Oct 1 2026.
- Third-party SDKs, APIs and data must be used within their terms.

## Submission checklist (everything is required)

- [ ] **Text description** of features and functionality. Name BOTH PayPal and AI in it, in the "Built With" section and in the video.
- [ ] **Working demo:** a hosted URL (what we use) or clear setup and run instructions in the repo.
- [ ] **Public repository** on GitHub with all source code, assets and instructions.
- [ ] **Open-source LICENSE** (MIT) visible in the repo's About section.
- [ ] **README** with setup and run steps. No secrets; use environment variables.
- [ ] **Demo video:** under 3 minutes, uploaded **public on YouTube**, showing the project working on its intended device (a phone). No third-party trademarks, copyrighted music or material without permission. The link goes on the submission form.
- [ ] **AI tools used** and how they were used.
- [ ] **Sponsor tools** ticked on the form for any sponsor prize we are entering (see below).
- [ ] **Testing access** for the Sponsor, Administrator and Judges until judging ends, including test credentials (the PayPal sandbox buyer login).
- [ ] **English**, or English translations of all materials.
- [ ] Teammates invited and accepted (solo: nothing to do).
- [ ] No financial or preferential support from the Sponsor or Administrator was used to develop the project.
- [ ] Ownership: original work, nothing infringing.

Submit early if possible. Devpost reviewers check for a working build, a public repo with license, and a public video.

## Video tips (from the organizers)

Under 3 minutes, public on YouTube. Open with the problem and the audience. Show PayPal and AI working end to end. Cut loading screens and setup steps. An AI voiceover is acceptable. **Upload early**, since processing can take hours; you can keep editing until the deadline.

## Judging

- **Stage 1 (pass/fail):** the project reasonably fits the theme and applies the required PayPal and AI. The review team checks for a working build, a public repo with an open source license and a public video.
- **Stage 2:** five equally weighted criteria:
  1. Technological Implementation
  2. Design
  3. Potential Impact
  4. Innovation / Idea
  5. Presentation
- Judging may use expert panels, peer review, automated AI-driven analysis, or a combination. Ties are broken by scores on the criteria in order, then a judge vote.
- Judges include PayPal developer advocates and engineers plus representatives from AG Grid, APIMatic, Bryntum, Channel3, Elastic, Postman and Render.

## Prizes we are aiming for

- Grand prizes: $12,000 / $8,000 / $5,000.
- Honorable mentions ($5,000 each): **Best Use of Agentic Commerce, Most Creative, Best Demo Delivery, Best Use of PayPal + AI**, Most Impactful.
- Sponsor prizes need the sponsor's tool to be really used: **Render** (we host there; $50 credit available), **Channel3** (only if we use its API meaningfully for product search or enrichment; 20,000 free credits, promo code on its Devpost page).
- A project can win one Grand Prize or one Honorable Mention, plus one Sponsor Prize.

## Eligibility (the owner, check this)

Open to individuals of legal age in their country, teams, and organizations. Not open to residents of Brazil, Quebec, Russia, Crimea, Cuba, Iran, North Korea and other comprehensively sanctioned places, nor to sponsor or administrator staff and their families, or judges. Winners must pass identity verification and submit tax forms within 10 business days.

## Other terms worth knowing

- We keep ownership. PayPal gets a non-exclusive license for judging, and may use names and likenesses to promote the hackathon for three years.
- Multiple entries are allowed only if each is substantially different.
- Disputes go to arbitration under New York law.
- Help: the PayPal Discord (PayPal and sponsor teams answer there).

## Things that make Claude's job easier

- PayPal docs: developer.paypal.com (REST API, Orders v2, Checkout), the Developer Dashboard, and the sandbox getting-started repo on GitHub (`paypaldev/getting-started-with-paypal-sandbox`).
- PayPal AI: the AI Toolkit (github.com/paypal/AI-Toolkit), docs.paypal.ai, the Agent Toolkit quickstart and the MCP server quickstart.
- Check request and field names against these docs as you build; they have changed across versions.
- Known sandbox trouble reported by others: vault refusals on platform apps, MCP errors, and "we aren't able to process your payment" errors. Use a plain Orders v2 flow with the sandbox Personal (buyer) account and avoid vaulting.
