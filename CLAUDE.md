# Haggle: PayPal AI Hackathon

Haggle is a mobile-first web app where two AI agents (a buyer and a grumpy shopkeeper) negotiate a price live as pixel-art characters. When they agree, the seller agent closes the deal by calling a tool that creates a PayPal sandbox order at the negotiated price. The user approves in PayPal and gets a SOLD screen. One human (the owner) drives several parallel Claude sessions, so the rules below keep them from colliding.

Read these first, in this order:

- `docs/RUNBOOK.md`: **read this first.** The organizers' rules, deadline, submission checklist, judging and prizes. What disqualifies us is in there.
- `docs/IDEA.md`: what we're building and why
- `docs/CONTRACTS.md`: types, SSE events, API routes, character states. Everyone builds against this.
- `docs/CHARACTERS.md`: the pixel cast, their states and the speech-line pools
- `docs/PLAN.md`: timeline, lanes, what to cut if we fall behind
- `docs/DEVPOST.md`: the public story and the submission text. Update it when the product changes.
- `docs/reference/pixel-spike.html`: a working prototype of the pixel-art technique to reuse (do not copy its characters)
- `docs/reference/amble-CLAUDE.md`: an older project's rules file, for style only
- `_kickoff/` (local only, gitignored): the original kickoff pack, frozen for reference. Never edit it; the live docs are the ones above.

## The organizers' rules bind every change

They come from `docs/RUNBOOK.md`. Breaking one can get us disqualified, so they beat anything else here.

- **Nothing may look unfinished.** No dead buttons, no "coming soon", no placeholder text or lorem ipsum. Hide a feature that isn't working.
- **PayPal AND AI must both be real.** PayPal sandbox integration is central, and the AI does the negotiating. Mockups, static prototypes and fake payments do not count.
- **The repo is public.** A visible MIT `LICENSE`, a README with setup and run steps, and no secrets anywhere (code, logs, fixtures, PR text, screenshots). If a key leaks, tell the human immediately so it can be rotated.
- **Submission closes Thu Nov 12 2026, 12:00pm PST (1:00pm Mountain).** After about 10:00am Mountain Thursday, merge only fixes.
- **After the deadline, change nothing** (no commits, README edits or video swaps) until winners are announced (around Dec 21). The live demo, its test credentials and the API keys behind it must keep working until then.
- **Judges open the link alone on a phone.** Every flow must work with no partner, no account and no setup of their own.

## Build only what the demo shows

**If a judge won't see it or touch it in the 3-minute video, don't build it.** The demo path is:

pick an item → (optional nudge) → watch Bao and Mr. Pickle haggle → deal → seller agent creates the PayPal order → approve in PayPal → SOLD screen and share card

Making that path work, look great and hold up on a phone beats any new feature.

- **Before starting anything new, name the moment in the demo where it shows.** If you can't, polish something on the path instead.
- **Don't build:** accounts or auth, a database, admin or analytics pages, a real seller marketplace, multi-item carts, a refunds UI, extra settings, API routes no screen calls, tests beyond a smoke script, or config and abstractions for things we aren't demoing.
- **Outcomes and research belong in the Devpost text,** not in new code.
- If a prompt or doc asks for something off the path, skip it and tell the human why.

## Stack (decided)

Next.js App Router, TypeScript, Tailwind. Anthropic SDK called directly (no agent frameworks). Default model `claude-haiku-5-5` for fast turns; `AI_MODEL` can switch to `claude-sonnet-5-5`. In-memory deal store (single Render instance). Deployed to Render as a Node web service. No database.

Env vars are listed in `.env.example`. `AI_MODE=mock` plays scripted negotiations so development costs nothing; `AI_MODE=live` is for testing the real thing and for the demo.

## How the code must behave

- **The server decides the price.** The client never sends a price to checkout. `buyerMax` and `sellerFloor` are enforced in code, not just in prompts: if an agent breaks its limit, reject the move and re-prompt once, then clamp. Max 8 rounds.
- **Honest progress.** Character states are driven by real server stages (`search`, `buyer_think`, `seller_think`, `checkout`, `capture`), not fake timers.
- **Never show a spinner or "Thinking...".** A pixel character with a speech bubble replaces it. Bubble lines come from static pools in `data/lines.ts`, so they appear instantly and cost no AI call.
- **Never look broken.** If an AI turn takes over 12 seconds or fails, retry once, then fall back to an in-character scripted move so the negotiation still finishes. A PayPal failure shows an in-character error and a retry button.
- **Protect the key.** Cap `max_tokens`, cap rounds, and rate-limit `/api/negotiate` per IP so the public demo can't drain the Anthropic budget.
- **Secrets stay server-side.** Only `NEXT_PUBLIC_*` values reach the browser, and nothing secret is ever `NEXT_PUBLIC_`.
- **Phone first.** Design for a 390px-wide screen with real tap targets (44px minimum). Test on a real phone over HTTPS before calling anything done.
- **Respect `prefers-reduced-motion`.** Characters still show state and speech, with less animation.

## How to work (one human, several parallel Claude sessions)

**1. Get into a worktree before you change anything.** Never work on `main` or in the main checkout. If `git branch --show-current` says `main`, create a worktree with `git worktree add .claude/worktrees/<name> -b <name> origin/main` (or use the EnterWorktree tool if you have it).

**2. Name it `<lane>-<short-name>`,** for both the worktree and the branch, for example `engine-seller-persona`, `paypal-capture`, `ui-speech-bubbles`. Lanes: `engine`, `paypal`, `ui`, `ship`. If the session started with a random branch name, rename it before your first push: `git branch -m <lane>-<short-name>`.

**3. Sync first.** Run `git fetch origin && git merge origin/main`, then install dependencies if `package.json` changed. If you haven't read `docs/RUNBOOK.md` this session, read it now.

**4. Commit small and push each time.** Your first commit adds `docs/wip/<branch>.md` (who you are, what you're building, which files you'll touch, and a status line you keep current). Delete it in your last commit before merging. Open a draft PR after your first commit:

    git push -u origin HEAD
    gh pr create --draft --fill

Do not add `Co-authored-by` lines to commits or PRs unless the human asks.

**5. Merge when it works.** No review needed:

    git fetch origin && git merge origin/main   # then check the app still runs
    git push
    gh pr ready
    gh pr merge --squash

If GitHub says "not mergeable" or "base branch was modified", wait a few seconds and retry.

**6. Clean up.** A merged branch is finished; never commit to it again. For more work, `git switch -c <lane>-<next-thing> origin/main`. Otherwise tell the human it's merged.

## Lanes and file ownership

Stay inside your lane's files. If you must touch another lane, keep it tiny and say so in the PR.

| Lane | Owns |
|---|---|
| `engine` | `lib/negotiate/*`, `app/api/negotiate/*`, `data/products.ts` |
| `paypal` | `lib/paypal/*`, `app/api/checkout/*`, `app/api/capture/*`, `app/deal/*` |
| `ui` | `components/pixel/*`, `app/(game)/*`, `data/lines.ts`, global styles and design tokens |
| `ship` | `README.md`, `docs/DEVPOST.md`, deployment config, smoke script |

## Working alongside everyone

- **Small PRs, merged often.** Aim to merge within the hour. Long-lived branches cause conflicts.
- **Shared dependencies and types go first.** Put them in their own small PR and merge it right away.
- **`docs/CONTRACTS.md` must stay true.** Adding to a contract is always fine. If you rename or remove something, update it and every caller in the same PR.
- **Don't reformat, rename or reorganize code you aren't otherwise changing.**
- **Prefer new files** over growing a shared one.
- **Don't use `git stash`.** It is shared across worktrees. Make a WIP commit instead.
- **Never force-push, and never push to `main` directly** (except the one initial Phase 0 commit).
- **If `main` is broken, fix that first,** on its own branch.
- **If a lockfile conflicts,** take main's copy and reinstall. Resolve other conflicts yourself, keeping what both sides intended.

## Running things

- **Ports:** start the dev server with a free `PORT`, and never kill a process you didn't start.
- **Mocks by default:** keep `AI_MODE=mock` in dev. Use `AI_MODE=live` only to test the real thing.
- **PayPal is sandbox only.** `PAYPAL_BASE` must be `https://api-m.sandbox.paypal.com`. Never use live credentials.
- **Deploys:** only `main` deploys to Render. Check `docs/PLAN.md` for the service settings.

## Building

- Choose the simplest thing that works for the demo.
- Check for an existing helper or component before writing one.
- Use the shared design tokens and components, or several sessions will produce several looks.
- Keep code plain and short; the owner has to be able to explain all of it.
- Keep the pixel look consistent: integer-scaled low-res canvas, the shared palette, the same outline colour, HTML overlays for crisp text.

Before you call something done, run it and see it work, and say plainly what you did and didn't check.
