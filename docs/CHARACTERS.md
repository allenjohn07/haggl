# CHARACTERS: the pixel cast

The signature feature: **wherever a normal app shows "Thinking...", a pixel character shows up and says something instead.** Characters are original. Do not use any existing franchise character.

## Technique

- Draw into a low-res `<canvas>` and scale it by an **integer** with `image-rendering: pixelated`.
- Rasterize each sprite from simple shape functions into a 32x32 grid, then shade it (lit top-left, shaded bottom-right), outline it with one dark colour, and add a face and props.
- A per-state animation table: `{ frames, fps }`, with frames cached per character, state and frame.
- Speech bubbles and name tags are **HTML overlays** over the canvas, so text stays crisp and accessible.
- A small palette with day and dusk variants. Respect `prefers-reduced-motion` (hold frame 0, keep the speech).
- The scene is a tiny market stall: awning, counter, hanging lanterns, cobblestones, the item on the counter. Mobile portrait layout first.

## Cast

### Bao: the buyer (the user's agent)
A steamed-bun blob with a tiny bow tie and a coin purse. Polite on the surface, passive-aggressive underneath. Voice: overly courteous, quietly savage. Colour: warm cream and soft pink.

### Mr. Pickle: the seller
A grumpy pickle shopkeeper with a mustache, an apron and a small abacus. Takes everything personally. Loves his "haunted" stock. Voice: sulky, dramatic, old-world. Colour: pickle green with a brown apron.

### Beanie: the clerk
A coffee bean with round glasses and a clipboard. Neutral narrator for work that isn't an agent's turn (searching, creating the PayPal order, capturing the payment). Voice: dry, efficient, slightly smug. Colour: espresso brown.

## States

| State | Frames / fps | Looks like |
|---|---|---|
| `idle` | 4 / 3 | Breathing squash and stretch, occasional blink |
| `think` | 3 / 4 | Eyes up, tiny sweat or "..." bubble, a paw to the chin |
| `search` | 4 / 5 | Flipping through papers or peering through a magnifier |
| `talk` | 3 / 6 | Mouth open and shut, little hop on strong offers |
| `pay` | 4 / 5 | Stamping the receipt, coin or card flourish |
| `cheer` | 4 / 8 | Jump with both arms up, sparkles |
| `sulk` | 2 / 2 | Slumped, one eye closed, small rain cloud |

## Speech lines (`data/lines.ts`)

Static pools, chosen at random with no immediate repeat. They appear **instantly** and cost no AI call. Keep every line PG, short (under ~60 characters ideally, max ~80) and in the character's voice. The seed below is a starting point; write at least 6 per entry.

    export const LINES = {
      bao: {
        think: [
          "Shh. Math in progress.",
          "Let me think. Do not interrupt a bun.",
          "Calculating how rude I can be.",
          "One moment. Plotting.",
        ],
        talk: [
          "Hear me out.",
          "Respectfully, no.",
          "I'm being very reasonable here.",
          "Bold of you to say that price out loud.",
        ],
        cheer: [
          "A bargain! I'm radiant.",
          "Savings, baby.",
          "That's what I call a bun-win situation.",
          "Frame this receipt.",
        ],
        sulk: [
          "I have been wronged.",
          "Fine. I'll just own less stuff.",
          "This is not over.",
          "Betrayed by a pickle.",
        ],
        idle: [
          "Pick something shiny.",
          "I'm ready to be annoying.",
          "I haggle. It's a lifestyle.",
        ],
      },
      pickle: {
        think: [
          "Hold on, consulting my feelings about money.",
          "Silence. The pickle is thinking.",
          "This stock took me years to curate.",
          "Do not rush a brined mind.",
        ],
        talk: [
          "Absolutely not.",
          "You insult my cucumbers.",
          "That price is a crime.",
          "I have a family. Of jars.",
        ],
        cheer: [
          "Pleasure doing business!",
          "Ha! You got lucky.",
          "Another one for the books.",
          "A brined win.",
        ],
        sulk: [
          "You've robbed me, bun.",
          "I'm closing early today.",
          "My ancestors weep.",
          "Take it. TAKE IT.",
        ],
        pay: [
          "Stamping this before you change your mind.",
          "Sealed with a vinegar kiss.",
          "Fill in the paperwork, sucker. Er, friend.",
        ],
        idle: [
          "Browse. Don't touch.",
          "Everything's haunted. Terms apply.",
          "Looking, or buying?",
        ],
      },
      beanie: {
        search: [
          "Digging through the stock room. Hold on.",
          "Checking the shelves so you don't have to.",
          "Fetching. Don't rush me.",
          "Filing a very small search party.",
        ],
        pay: [
          "Writing up the invoice. Neatly.",
          "Handing this to PayPal. Fingers crossed.",
          "Stamping, signing, praying.",
          "Money is about to move. Brace.",
        ],
        cheer: [
          "Paperwork complete. Beautiful.",
          "Payment received. Nobody panic.",
          "Another satisfied customer. Allegedly.",
        ],
        idle: [
          "Waiting on humans. As usual.",
          "Clipboard at the ready.",
        ],
      },
      errors: {
        slow: ["Pickle stepped out. Back in a sec.", "Bao is stuck in a very long thought."],
        failed: ["That didn't go through. Try again?", "The shop's having a moment. One more try?"],
        busy: ["Pickle is on his break. Come back soon."],
      },
    } as const;

## Honest progress

Bubbles and states follow **real server stages** (see the mapping in `docs/CONTRACTS.md`). The line pool only decides what the character says, never when. A character in `think` means an AI turn is really in flight.

## Accessibility

- All speech is real text in the DOM (a live region for the latest line), not baked into the canvas.
- Tap targets 44px or larger. Colour contrast of bubbles meets WCAG AA.
- Reduced motion: no hopping or sparkles; states still change and the speech still appears.
