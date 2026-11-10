# PLAN

Owner: one human, solo. Several parallel Claude sessions do the work. Times are Mountain. Deadline: **Thu Nov 12, 1:00pm.**

## Timeline

| When | Goal | Done means |
|---|---|---|
| Tue afternoon | **Phase 0:** rules, contracts, scaffold, LICENSE, `.env.example`, products. Pushed to `main`. | App boots; CONTRACTS.md is the single source of truth |
| Tue night | **Engine** negotiates in mock and live mode from a terminal script. **PayPal** creates and captures a sandbox order locally. | Both lanes have a PR merged |
| Wed morning | **UI** (stall scene, characters, speech bubbles, chat, haggle meter) on real SSE. **First Render deploy.** | Opens on a phone at the Render URL |
| Wed afternoon | Integrate A+B+C. Real-phone test end to end with the sandbox buyer. Polish, error states, fallbacks. | Full demo path works twice in a row |
| Wed evening | README, Devpost text, test credentials, record the video, upload it **public** to YouTube, **submit.** | Devpost shows "Submitted" |
| Thu morning | Fixes only. Stop by about 10:00am. Final check that the demo URL and keys work. | Nothing broken |

## Phases and who does what

**Phase 0 (orchestrator, on `main`).** Read RUNBOOK, CLAUDE.md and CONTRACTS.md. Scaffold the app in the current folder. Add the MIT `LICENSE`, `.env.example` and a README skeleton. Make sure `.gitignore` covers `.env*`. Create `data/products.ts` with 6 items. Verify `npm run dev` works. Commit and push.

**Phase 1 (three agents in parallel, each in its own worktree).**

- `engine`: the two-agent loop, personas, private limits, nudges, rule enforcement, SSE, mock mode, timeout fallback, the seller's `create_paypal_order` tool hook, per-IP rate limit.
- `paypal`: OAuth token, create order from the server-side deal price, approval redirect, capture on return (idempotent), SOLD page and share card, in-character error screens.
- `ui`: mobile-first screen, pixel characters, speech bubbles, chat log, haggle meter, nudge buttons, product picker, confetti. Built against mock SSE events from CONTRACTS.md so it never waits for `engine`.

**Phase 2 (orchestrator, plus a `ship` agent).** Merge PRs as they land, integrate, deploy to Render, run the phone test, write the README and `docs/DEVPOST.md`, script and record the video, submit.

## Render deployment

- New **Web Service** from the GitHub repo. Build: `npm install && npm run build`. Start: `npm start`.
- Add every env var from `.env.example`. Set `APP_URL` to the Render URL and use it for PayPal return and cancel URLs.
- **Free instances sleep when idle.** Judges would hit a cold start, so use the sponsor's $50 credit (or a paid instance) to keep the service awake through about Dec 21.
- Single instance only, because the deal store is in memory.
- Deploy early on Wednesday morning so hosting problems show up with time to fix them.

## What to cut if we fall behind (in this order)

1. Share-card image (keep the SOLD screen).
2. Channel3 (use the hard-coded products).
3. Nudge buttons beyond **Be nicer** and **Walk away**.
4. Beanie the clerk (let Pickle narrate the PayPal steps).
5. PayPal webhook (we capture on return, so we don't need it).
6. Extra character states (keep idle, think, talk, cheer, sulk).

Never cut: the live negotiation, the real PayPal sandbox payment, the public repo and license, the README, the YouTube video, the hosted demo.

## Definition of done for the demo

- [ ] Opens on a phone with no login or setup.
- [ ] Pick an item, watch the haggle, reach a deal (or the dramatic fallback), pay in the PayPal sandbox, see SOLD. Works twice in a row.
- [ ] No spinner or "Thinking..." anywhere; a character speaks instead.
- [ ] Slow or failed AI never shows an error; a scripted in-character move takes over.
- [ ] No secrets in the repo, LICENSE visible, README complete.
- [ ] Video under 3 minutes, public on YouTube, link in the Devpost form.
- [ ] Sandbox buyer test credentials are in the Devpost testing instructions.
