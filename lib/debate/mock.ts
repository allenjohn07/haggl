import { bestOffer } from "@/lib/products";
import type { Advisor } from "@/lib/types";
import type { Say } from "./agents";
import { budgetOf, type Answer, type State } from "./rules";
import type { LookupTool } from "./tools";

// Scripted moves: all of mock mode, and the in-character fallback when a live AI turn fails.
// They only quote prices from the stored offers and evidence, and still pass through the same checks.

const pick = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
const $ = (n: number) => `$${n.toFixed(2)}`;
const short = (t: string) => (t.length > 40 ? t.slice(0, 40).replace(/\s+\S*$/, "") : t);

export const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal?.aborted) return resolve();
    const t = setTimeout(done, ms);
    function done() {
      clearTimeout(t);
      signal?.removeEventListener("abort", done);
      resolve();
    }
    signal?.addEventListener("abort", done);
  });

export const between = (min: number, max: number) => min + Math.random() * (max - min);

// Which lookup a scripted advisor runs this turn, if any.
export function scriptedLookup(advisor: Advisor, s: State, allowed: LookupTool[]): LookupTool | null {
  const n = s.messages.length + 1;
  if (allowed.includes("check_prices")) return "check_prices";
  if (advisor === "spark" && allowed.includes("look_closer") && (n === 3 || Math.random() < 0.5)) return "look_closer";
  if (advisor === "penny" && allowed.includes("find_alternatives") && n >= 4) return "find_alternatives";
  return null;
}

const REACTIONS: Record<Advisor, string[]> = {
  spark: ["Oh, come ON, Penny.", "Okay, fair. But hear me out!", "Ugh, numbers. Fine.", "You're no fun. Continue.", "Bold of you. Wrong, but bold."],
  penny: ["Bold claim. Checking.", "Mm. Noted.", "Enthusiasm isn't a reason.", "Calm down, sparkler.", "That's a want, not a need."],
};

// No repeats within one debate while the pool lasts.
export function scriptedReaction(advisor: Advisor, s: State): string {
  const used = new Set(s.messages.map((m) => m.reaction));
  const fresh = REACTIONS[advisor].filter((r) => !used.has(r));
  return pick(fresh.length ? fresh : REACTIONS[advisor]);
}

function answerLine(advisor: Advisor, a: Answer, s: State): string {
  if (a.answer === null) {
    return advisor === "spark"
      ? pick(["They went quiet on us! I'm taking that as a yes.", "No answer! Mysterious. I respect it."])
      : pick(["No answer. I'll assume the careful option.", "Silence. Wise, or busy. I'll be careful either way."]);
  }
  const budget = budgetOf(s);
  const best = bestOffer(s.product);
  if (budget !== undefined && /budget|spend/i.test(a.question)) {
    const fits = best.price <= budget;
    if (advisor === "spark") return fits ? `${$(best.price)} fits inside "${a.answer}"! The universe has spoken!` : `"${a.answer}". Okay. I hear it. I hate it, but I hear it.`;
    return fits ? `"${a.answer}" covers ${$(best.price)}. Annoyingly, it fits.` : `"${a.answer}" doesn't cover ${$(best.price)}. That's a problem.`;
  }
  if (/rarely|can wait/i.test(a.answer)) {
    return advisor === "spark" ? `"${a.answer}"? Oof. Okay, that one hurts my case.` : `"${a.answer}". So it can sit in a cart for a while.`;
  }
  return advisor === "spark" ? `"${a.answer}"! See, Penny? This is a real use, not a whim.` : `"${a.answer}". Fine. That counts for something.`;
}

export function scriptedSay(advisor: Advisor, s: State, fresh?: Answer): Say {
  const n = s.messages.length + 1;
  const p = s.product;
  const best = bestOffer(p);
  const cheaper = best.price < s.picked.price;
  const feature = p.keyFeatures[Math.floor(Math.random() * Math.max(p.keyFeatures.length, 1))] ?? "the whole package";
  const rating = p.rating ? `${p.rating.score.toFixed(1)} stars from ${p.rating.count.toLocaleString("en-US")} people` : "people seem to love it";
  const alts = s.evidence.find((e) => e.kind === "alternatives");
  const alt = alts?.items[0];
  const reaction = n === 1 ? "" : scriptedReaction(advisor, s);
  const lead = fresh ? `${answerLine(advisor, fresh, s)} ` : "";
  // A line not said yet in this debate, if there is one.
  const pickNew = (xs: string[]) => {
    const unsaid = xs.filter((x) => !s.messages.some((m) => m.text.includes(x)));
    return pick(unsaid.length ? unsaid : xs);
  };

  let text: string;
  if (advisor === "spark") {
    if (n === 1) {
      text = pickNew([
        `Penny! ${short(p.title)}. ${rating}. ${feature}. I'm already in love.`,
        `Okay Penny, don't start. ${$(s.picked.price)} for ${feature.toLowerCase()}? That's joy per dollar right there.`,
        `Penny, look at this one. ${rating}! I think we've found a treat.`,
      ]);
    } else if (n >= 7) {
      text = pickNew([
        "Final word: you deserve nice things, and this is a nice thing. Within reason, yes, Penny.",
        `Look, we checked the prices, we asked the questions. ${feature} is still great. I rest my case.`,
      ]);
    } else {
      text = pickNew([
        `${feature}. Every single day. You can't put a price on that. Well, you can, it's ${$(best.price)}.`,
        `${rating}, Penny. That many people can't all be wrong.`,
        alt ? `Sure, ${short(alt.label)} is cheaper, but is it THIS one? No. It is not.` : "Cheaper exists, sure. Better? Not that I can see.",
      ]);
    }
  } else {
    if (n === 2) {
      text = cheaper
        ? `Same thing is ${$(best.price)} at ${best.merchant}. You picked ${$(s.picked.price)}. Let's not pay extra for the joy of it.`
        : `I checked. ${$(s.picked.price)} at ${s.picked.merchant} is already the lowest. Annoying. Doesn't mean we need it.`;
    } else if (n === 4 && s.used.find_alternatives) {
      text = alt
        ? `Also: ${short(alt.label)} is ${$(alt.price!)} at ${alt.note}. Similar job, less money.`
        : "I looked for something similar and cheaper. Nothing worth it. Credit where due.";
    } else if (n >= 8) {
      text = pickNew([
        "Fine. My final position: only if it earns its keep. We've laid it out. Let's call it.",
        "Here's where I land: buy it smart or don't buy it. Verdict time.",
      ]);
    } else {
      text = pickNew([
        "Do they need it, or want it? Those are different prices, emotionally.",
        "A cart full of treats is how a budget dies, Spark.",
        `${$(best.price)} is ${$(best.price)}. Joy doesn't show up on the statement.`,
      ]);
    }
  }
  return { text: (lead + text).trim(), reaction };
}

// Penny asks about budget or need; Spark about how often or whether it can wait.
export function scriptedAsk(advisor: Advisor, s: State): { question: string; options: string[] } {
  const price = bestOffer(s.product).price;
  const low = Math.max(10, Math.floor((price * 0.8) / 10) * 10);
  const high = Math.ceil((price * 1.2) / 10) * 10;
  if (advisor === "penny") {
    return pick([
      { question: "What's your budget for this?", options: [`Under $${low}`, `Up to $${high}`, "Money's no object"] },
      { question: "Be honest. Do you need it, or want it?", options: ["Need it", "Want it", "Bit of both"] },
    ]);
  }
  return pick([
    { question: "How often would you actually use it?", options: ["Every day", "Every week", "Rarely, honestly"] },
    { question: "Could this wait a month?", options: ["Yes, it can wait", "No, I need it soon"] },
  ]);
}
