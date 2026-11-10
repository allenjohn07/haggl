import type { Advisor } from "@/lib/types";
import type { PixelState } from "@/components/pixel/sprites";

// Static speech pools. They decide WHAT a character says, never WHEN (real events decide that).
// PG, short, in voice. No AI call, so they appear instantly.

type Pools = Record<PixelState, string[]>;

export const LINES: Record<Advisor, Pools> & { errors: Record<"slow" | "failed" | "busy", string[]> } = {
  spark: {
    idle: [
      "Ooh, what are we shopping for?",
      "I'm ready. I was born ready.",
      "Life's short. Shop happy.",
      "Show me something shiny.",
      "Fuse lit, standing by!",
      "Joy per dollar, that's my thing.",
    ],
    think: [
      "Shh, let me cook.",
      "Hold that thought, Penny!",
      "Ooh, wait, wait, I have a point.",
      "Penny, zip it, I'm thinking.",
      "Give me one sec. It's good.",
      "Shh! Genius at work.",
      "Okay, okay, hear me out...",
      "Let me find the fun part.",
    ],
    lookup: [
      "Checking the reviews. They love it.",
      "Digging up the good stuff.",
      "Pulling the shiny details.",
      "Hunting for features. So many!",
      "Let me pull this from here.",
      "Zooming in on the specs.",
    ],
    talk: [
      "Okay, here's the thing!",
      "Listen to this one.",
      "Penny. Penny. Hear me out.",
      "Big point incoming!",
      "You're going to love this.",
      "Counterpoint: joy!",
    ],
    ask: [
      "Quick one for you!",
      "Help me win this one.",
      "Tell me, tell me!",
      "Your call, friend!",
      "Settle this for us?",
      "One tap. Make it count.",
    ],
    pay: [
      "Writing up the order!",
      "Handing it to PayPal. Eek.",
      "Stamping it. Officially.",
      "Card's out. Here we go!",
      "Sending it off to PayPal.",
      "Treat incoming! Almost there.",
    ],
    cheer: [
      "Treat secured!",
      "You deserve nice things.",
      "Fireworks! Literally me!",
      "Best. Decision. Today.",
      "Woo! Joy per dollar: high.",
      "Told you it was a good one.",
    ],
    sulk: [
      "Fine. Responsible. Boo.",
      "My fuse is out.",
      "I'll just fizzle over here.",
      "Penny wins. Again.",
      "Not even a little treat?",
      "Okay. I respect it. Sadly.",
    ],
  },
  penny: {
    idle: [
      "Let's see what this costs.",
      "I've got my receipt ready.",
      "Calm. Careful. Cheap.",
      "Every dollar counts.",
      "Glasses on. Go ahead.",
      "Do you need it, or want it?",
    ],
    think: [
      "Quiet, please. Thinking.",
      "Let me pull this up first.",
      "Mm. Not so fast, Spark.",
      "Shh, Spark. Numbers first.",
      "Hold on. Let me check that.",
      "Hm. Give me a moment.",
      "Spark, inside voice.",
      "Let me think about that.",
    ],
    lookup: [
      "Pulling prices from other stores.",
      "Let me pull this from here.",
      "Unrolling the receipt.",
      "Checking who sells it cheaper.",
      "Comparing stores. Hold on.",
      "Reading the fine print.",
    ],
    talk: [
      "Here's what I found.",
      "Let's be sensible.",
      "Counterpoint, Spark.",
      "The numbers say this.",
      "Not so fast.",
      "Hear me out, calmly.",
    ],
    ask: [
      "One question before I decide.",
      "Be honest with me.",
      "Quick check, please.",
      "This matters. Pick one.",
      "Tell me the truth.",
      "Help me settle this.",
    ],
    pay: [
      "I'll be watching the total.",
      "Fine. Proceed carefully.",
      "Receipt, please.",
      "Checking the total twice.",
      "Mm. Go on then.",
      "Keep the receipt.",
    ],
    cheer: [
      "Money stays in your pocket.",
      "A sensible purchase. Rare.",
      "Hoo! Good call.",
      "Filed under: smart.",
      "That's a fair price.",
      "I approve. Mark the date.",
    ],
    sulk: [
      "I'll allow it. Reluctantly.",
      "Noted. Filed. Disapproved.",
      "My glasses are slipping.",
      "Spark, you're a bad influence.",
      "I'm adding this to my notes.",
      "Mm. If you insist.",
    ],
  },
  errors: {
    slow: [
      "PayPal's being slow. Hold tight.",
      "Still on it. One moment.",
      "Taking a little longer. Hang on.",
      "The line is long. Nearly there.",
      "Slow servers. Not my fault!",
      "Patience. Penny says hi.",
    ],
    failed: [
      "That didn't go through. Try again?",
      "Oops, we lost the thread.",
      "Something fizzled. One more go?",
      "The receipt jammed. Retry?",
      "We tripped. Let's try that again.",
      "Hm, that broke. Shall we retry?",
    ],
    busy: [
      "Too many shoppers. Back in a minute.",
      "We're swamped. Try again shortly.",
      "Long queue today. One minute?",
      "Catching our breath. Back soon.",
      "Busy, busy! Give us a minute.",
      "So popular. Try again in a bit.",
    ],
  },
};

// A random line from the pool that isn't the same as the last one.
export function pickLine(pool: string[], last?: string): string {
  if (pool.length < 2) return pool[0] ?? "";
  let line = last;
  while (line === last) line = pool[Math.floor(Math.random() * pool.length)];
  return line as string;
}
