# CHARACTERS: the pixel advisors

The signature feature: **wherever a chat app would show a typing indicator or a spinner, the pixel character who is working pops into the chat and says something instead.** Characters are original. Do not use any existing franchise character, and do not reuse anything from earlier prototypes.

## Art direction

- **Dark and calm.** The characters live on a near-black interface, so they are lit from within: bright, saturated bodies with a faint glow (kept subtle so it sits in the calm, Linear-style UI), no heavy black outlines.
- **Hand-drawn pixel maps,** not procedural shapes: each frame is a small string grid (about 24x24) mapping characters to palette colours, drawn to a small canvas and scaled by an **integer** with `image-rendering: pixelated`. Frames cached per character, state and frame.
- **They move into the chat.** A character slides up into the conversation where a typing indicator would be, does its thing, and slides out when the message lands. On the side-by-side layout it appears on the sender's own screen and peeks into the other's.
- **Speech is HTML** in the UI font (Inter), not handwriting: a small muted chip next to the sprite with the advisor's name in their accent colour. It stays crisp and accessible (a live region carries the latest line).
- **Reduced motion:** no sliding or bouncing; characters still appear, change state and speak.

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
