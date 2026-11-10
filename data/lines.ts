// Static speech-line pools. They appear instantly and cost no AI call.
// Keyed by character and state (see docs/CHARACTERS.md). The pool decides what is said,
// never when: states are driven by real server stages. The `ui` lane owns this file.

export const LINES = {
  bao: {
    think: [
      "Shh. Math in progress.",
      "Let me think. Do not interrupt a bun.",
      "Calculating how rude I can be.",
      "One moment. Plotting.",
      "Running the numbers. Politely.",
      "Hmm. How low is too low? Asking for me.",
      "Consulting my inner coupon.",
      "Thinking very hard behind this smile.",
    ],
    talk: [
      "Hear me out.",
      "Respectfully, no.",
      "I'm being very reasonable here.",
      "Bold of you to say that price out loud.",
      "With all due respect, which is a little.",
      "Lovely stall. Shame about the prices.",
    ],
    cheer: [
      "A bargain! I'm radiant.",
      "Savings, baby.",
      "That's what I call a bun-win situation.",
      "Frame this receipt.",
      "I'm puffing up with pride.",
      "Thank you kindly. I'd do it again.",
      "Steamed, fluffy, and victorious.",
    ],
    sulk: [
      "I have been wronged.",
      "Fine. I'll just own less stuff.",
      "This is not over.",
      "Betrayed by a pickle.",
      "I'm not crying. It's steam.",
      "Noted. Remembered. Forever.",
    ],
    idle: [
      "Pick something shiny.",
      "I'm ready to be annoying.",
      "I haggle. It's a lifestyle.",
      "Point me at a price tag.",
      "My coin purse is ready. Barely.",
      "I'll be polite. Mostly.",
    ],
  },
  pickle: {
    think: [
      "Hold on, consulting my feelings about money.",
      "Silence. The pickle is thinking.",
      "This stock took me years to curate.",
      "Do not rush a brined mind.",
      "Counting beads. Counting grudges.",
      "Let me ask my abacus. It hates you too.",
      "Hmph. Give me a moment.",
    ],
    talk: [
      "Absolutely not.",
      "You insult my cucumbers.",
      "That price is a crime.",
      "I have a family. Of jars.",
      "In my day, buns paid full price.",
      "Take it or leave it. Preferably take it.",
    ],
    cheer: [
      "Pleasure doing business!",
      "Ha! You got lucky.",
      "Another one for the books.",
      "A brined win.",
      "The stock stays with me. As it should.",
      "Off you trot, little bun.",
    ],
    sulk: [
      "You've robbed me, bun.",
      "I'm closing early today.",
      "My ancestors weep.",
      "Take it. TAKE IT.",
      "I'll be in the back. Sulking. Briny.",
      "This is how a pickle goes sour.",
    ],
    pay: [
      "Stamping this before you change your mind.",
      "Sealed with a vinegar kiss.",
      "Fill in the paperwork, sucker. Er, friend.",
      "Stamp. Stamp. It is done.",
      "Making it official. Against my will.",
      "Writing the order. Very firmly.",
    ],
    idle: [
      "Browse. Don't touch.",
      "Everything's haunted. Terms apply.",
      "Looking, or buying?",
      "Finest oddities this side of the brine.",
      "No refunds. No regrets. Mostly regrets.",
      "Pick one. I'm judging you either way.",
    ],
  },
  beanie: {
    search: [
      "Digging through the stock room. Hold on.",
      "Checking the shelves so you don't have to.",
      "Fetching. Don't rush me.",
      "Filing a very small search party.",
      "Cross-checking the inventory. Twice.",
      "Found the tag. Reading the fine print.",
    ],
    pay: [
      "Writing up the invoice. Neatly.",
      "Handing this to PayPal. Fingers crossed.",
      "Stamping, signing, praying.",
      "Money is about to move. Brace.",
      "Creating the order. In triplicate.",
      "Paperwork in progress. Hush.",
    ],
    cheer: [
      "Paperwork complete. Beautiful.",
      "Payment received. Nobody panic.",
      "Another satisfied customer. Allegedly.",
      "Filed, stamped, done. You're welcome.",
      "The books balance. I could weep.",
      "Receipt's ready. Try not to lose it.",
    ],
    idle: [
      "Waiting on humans. As usual.",
      "Clipboard at the ready.",
      "I keep the books. Nobody thanks me.",
      "I'll handle the boring part.",
      "Roasted, ready, mildly impatient.",
      "Let me know when there's paperwork.",
    ],
  },
  errors: {
    slow: [
      "Pickle stepped out. Back in a sec.",
      "Bao is stuck in a very long thought.",
      "The stall is a bit slow today.",
      "Hold on, someone dropped a jar.",
      "One moment. The brine is settling.",
      "Still here. Still haggling.",
    ],
    failed: [
      "That didn't go through. Try again?",
      "The shop's having a moment. One more try?",
      "Something got lost in the stock room. Again?",
      "My clipboard slipped. Shall we retry?",
      "The paperwork jammed. Give it another go?",
      "A small hiccup. The stall is still open.",
    ],
    busy: [
      "Pickle is on his break. Come back soon.",
      "Too many hagglers. Pickle needs a minute.",
      "The stall is packed. Try again shortly.",
      "Pickle is restocking. Back in a moment.",
      "Even pickles need a breather. Soon!",
      "Queue's full. Grab a tea and come back.",
    ],
  },
} as const;

// Pick a random line, never the same as `last` when the pool has more than one.
export function pickLine(pool: readonly string[], last?: string): string {
  if (pool.length <= 1) return pool[0] ?? "";
  let line = last;
  while (line === last) line = pool[Math.floor(Math.random() * pool.length)];
  return line!;
}
