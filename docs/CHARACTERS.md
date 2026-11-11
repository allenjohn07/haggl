# CHARACTERS: the pixel advisors

The signature feature: **the debate is a face-off, not a chat log.** Spark and Penny stand facing each other on a stage and talk in speech bubbles; wherever an app would show a typing indicator or a spinner, the character who is working says something instead. Characters are original. Do not use any existing franchise character, and do not reuse anything from earlier prototypes.

## Art direction

- **Dark and calm.** The characters live on a near-black interface, so they are lit from within: bright, saturated bodies with a soft, clearly visible glow in their own colour (Spark warm coral/gold, Penny teal/mint; `--spark-glow`, `--penny-glow` in `styles/tokens.css`). The advisor who is speaking or working glows brighter (`.glow-on`). The glow radius scales with the sprite. No heavy black outlines.
- **Hand-drawn pixel maps,** not procedural shapes: each frame is a small string grid (about 24x24) mapping characters to palette colours, drawn to a small canvas and scaled by an **integer** with `image-rendering: pixelated`. Frames cached per character, state and frame.

## The face-off stage (`app/(app)/_components/Stage.tsx`)

- **Layout.** Spark on the left and Penny on the right, in the middle of the screen, 4x on desktop and 3x on phones, on a hairline floor with a soft spotlight in each one's colour. No chat panes and no scrolling message list.
- **One bubble each.** When an advisor speaks, a bubble appears above their head (surface colour, hairline border, a small tail toward the speaker, Inter 15px, max 36ch) and they step forward a little in `talk`. Each advisor shows only their current line, so the screen holds the current line and the reply. A new line crossfades over the old one. On phones the bubbles stack above both characters (newest nearest them) and the older one is clamped to three lines.
- **Working, not typing.** On `think` or `lookup` the working advisor's bubble shows its pop-in line (`LINES[advisor].think`, or the server's lookup label) in a small muted style. The other stays idle, and keeps the point being answered on screen.
- **Reactions.** A message's `reaction` shows first as a small muted bubble over the speaker, then their message replaces it.
- **Evidence** (price check, alternatives, a closer look) slides in on the floor between them (under them on phones) as the compact table, and stays until the next evidence or the verdict.
- **Asks.** The asker goes to `ask` with the question in their bubble; the options are outline buttons pinned under the stage. A tap shows a "You: …" chip and both advisors react with a line from `ACKS` in `data/lines.ts`.
- **Footer:** 8 turn dots in the speakers' colours, "Turn n of 8", and a **Transcript** sheet (right on desktop, bottom on phones) with the full history: messages with their reactions, evidence, asks and answers.
- **Verdict:** the Verdict sheet opens over the stage; behind it both advisors stand in their verdict states with a cheer/sulk line.
- **Pacing.** Events are applied in order and each is held long enough to read (about 30 ms a character for a message, capped), since only one line per advisor is visible. States still follow the real event order.
- **Speech is HTML** in the UI font (Inter), not baked into the canvas. A polite live region carries the latest message or question.
- **Reduced motion:** no stepping, lifting or sliding; bubbles and cards crossfade and characters still change state and speak.

## Cast

### Spark: the "treat yourself" advisor
A tiny firework with stubby legs: a stubby rocket body in coral and hot pink with gold bands, a fizzing fuse on top that throws pixel sparks when excited. Optimistic, impulsive, generous with exclamation marks, loves features and "joy per dollar". Never pushy about money the user doesn't have. Accent: warm (coral / gold).

### Penny: the frugal skeptic
A small, round owl in sage and teal with big round reading glasses, holding a long receipt that unrolls when she checks prices. Dry, careful, deadpan; loves a bargain and a good question ("Do you need it, or want it?"). She does the price checks. Accent: cool (teal / mint).

## States

| State | Frames / fps | Spark | Penny |
|---|---|---|---|
| `idle` | 4 / 3 | bobs, fuse flickers | blinks, receipt sways |
| `think` | 3 / 4 | taps chin, fuse sputters, "..." sparks | eyes up, adjusts glasses |
| `lookup` | 4 / 6 | zips around with a tiny magnifier | receipt unrolls, scanning |
| `talk` | 3 / 6 | bounces, mouth open and shut | nods, wing gestures |
| `ask` | 2 / 3 | leans toward the user, "?" spark | raises a wing, "?" above |
| `pay` | 4 / 6 | stamps a card, coin flourish | — |
| `cheer` | 4 / 8 | fireworks burst | hoots, receipt flies up |
| `sulk` | 2 / 2 | fuse droops, one sad spark | ruffled, glasses slide down |

## Speech lines (`data/lines.ts`)

Static pools keyed by advisor and state, chosen at random with no immediate repeat. They appear instantly and cost no AI call. PG, short (under ~50 characters ideally), in voice. At least 6 per entry. The `think` lines are often addressed to the other advisor ("Shh. Let me think." / "Hold that thought, Penny."). Seed:

    spark.think:  "Shh, let me cook.", "Hold that thought, Penny!", "Ooh, wait, wait, I have a point."
    spark.lookup: "Checking the reviews. They love it.", "Digging up the good stuff."
    spark.ask:    "Quick one for you!", "Help me win this one."
    spark.cheer:  "Treat secured!", "You deserve nice things."
    spark.sulk:   "Fine. Responsible. Boo.", "My fuse is out."
    spark.pay:    "Writing up the order!", "Handing it to PayPal. Eek."
    penny.think:  "Quiet, please. Thinking.", "Let me pull this up first.", "Mm. Not so fast, Spark."
    penny.lookup: (use the server's label) "Pulling prices from other stores."
    penny.ask:    "One question before I decide.", "Be honest with me."
    penny.cheer:  "Money stays in your pocket.", "A sensible purchase. Rare."
    penny.sulk:   "I'll allow it. Reluctantly.", "Noted. Filed. Disapproved."
    errors:       slow, failed, busy pools (e.g. "PayPal's being slow. Hold tight.", "That didn't go through. Try again?", "Too many shoppers. Back in a minute.")

## Honest progress

States follow **real server events** (mapping in `docs/CONTRACTS.md`). A character in `think` means an AI turn is really in flight; `lookup` means a real tool call (Channel3) is running, and its line is the server's label.

## Accessibility

- All speech and messages are real text in the DOM, not baked into the canvas.
- Tap targets 44px or larger. Text and bubbles meet WCAG AA on the dark background.
- Reduced motion respected (see above).
