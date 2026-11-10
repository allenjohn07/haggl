// Static speech-line pools. They appear instantly and cost no AI call.
// Seeded from docs/CHARACTERS.md. The `ui` lane owns this file (target: 6+ lines per entry).

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

// Pick a random line, never the same as `last` when the pool has more than one.
export function pickLine(pool: readonly string[], last?: string): string {
  if (pool.length <= 1) return pool[0] ?? "";
  let line = last;
  while (line === last) line = pool[Math.floor(Math.random() * pool.length)];
  return line!;
}
