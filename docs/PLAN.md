# PLAN

Owner: one human, solo. Several parallel Claude sessions do the work. Times are Mountain. Deadline: **Thu Nov 12, 1:00pm.**

The first version (two agents bargaining over a price) was replaced on Tue Nov 10 by the advisor debate in `docs/IDEA.md`. The PayPal order and capture code carried over.

## Timeline

| When | Goal | Done means |
|---|---|---|
| Tue afternoon | Pivot foundation: docs, contracts, shared types and stores, PayPal moved to purchases. | Merged to `main`, app boots |
| Tue evening to night | **Engine** debates in mock and live from a terminal script. **Search** returns Channel3 results (fixtures and live). **UI** has the dark theme, the new characters and the chat screens on mock events. | Each lane has a PR merged |
| Wed morning | UI on the real stream, verdict, buy, receipt. **First Render deploy.** | Opens on a phone at the Render URL |
| Wed afternoon | Real-phone test end to end with live AI, live Channel3 and the sandbox buyer. Polish, error states, pacing. | Full demo path works twice in a row |
| Wed evening | README, Devpost text, test credentials, record the video, upload it **public** to YouTube, **submit.** | Devpost shows "Submitted" |
| Thu morning | Fixes only. Stop by about 10:00am. Final check that the demo URL and keys work. | Nothing broken |

## Lanes

- `engine`: the debate loop (Spark and Penny, tools, asks and waiting for answers, reactions, no invented prices, verdict), SSE, `/api/debate`, `/api/debate/answer`, `/api/buy` with the `create_paypal_order` tool, mock mode, fallbacks, rate limits, `scripts/debate.ts`.
- `search`: Channel3 client (`/v1/search`), mapping to `Product`, `findAlternatives`, fixtures for mock mode, `/api/search`.
- `ui`: dark theme and tokens, fonts (Inter and Geist Mono, shadcn/ui), the pixel advisors, search and picker, the debate screens (two side by side on wide screens, one thread on phones), ask chips, evidence cards, verdict card, buy and skip, the receipt page.
- `paypal`: done (orders, capture, checkout). Only fixes.
- `ship`: README, Devpost, deploy config, smoke checks.

## Render deployment

- New **Web Service** from the GitHub repo. Build: `npm install && npm run build`. Start: `npm start`.
- Add every env var from `.env.example`. Set `APP_URL` to the Render URL.
- Keep the instance awake through about Dec 21 (the $50 credit or a paid instance). Single instance only (in-memory stores).
- Long SSE streams with pauses: keep-alive comments every 15 s.

## What to cut if we fall behind (in this order)

1. The share line on the receipt.
2. `find_alternatives` (keep the same-product price check across stores).
3. The third ask (keep two).
4. `buy_elsewhere` as a separate buy option (the verdict can still mention it).
5. Extra character states (keep idle, think, lookup, talk, cheer, sulk).

Never cut: the live debate, the asks, the price check, the real PayPal sandbox payment, the pixel characters replacing typing indicators, the public repo and license, the README, the video, the hosted demo.

## Definition of done for the demo

- [ ] Opens on a phone with no login or setup.
- [ ] Search, pick, watch the debate, answer two questions, see the verdict, pay in the PayPal sandbox, see the receipt. Works twice in a row.
- [ ] No spinner, typing dots or "Thinking..." anywhere; a character pops in instead.
- [ ] Slow or failed AI or Channel3 never shows an error; a scripted in-character move or fixture takes over.
- [ ] No secrets in the repo, LICENSE visible, README complete.
- [ ] Video under 3 minutes, public on YouTube, link in the Devpost form.
- [ ] Sandbox buyer test credentials are in the Devpost testing instructions.
