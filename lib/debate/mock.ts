import { bestOffer } from "@/lib/products";
import type { Advisor } from "@/lib/types";
import type { Say } from "./agents";
import { budgetOf, costPerUse, leansWait, opener, shortName as short, type Answer, type State } from "./rules";
import type { LookupTool } from "./tools";

// Scripted moves: all of mock mode, and the in-character fallback when a live AI turn fails.
// They follow the same arc as the live prompts (pitch, price check, rebuttals, alternatives, landing),
// only quote prices from the stored offers and evidence, and still pass through the same checks.

const pick = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
const $ = (n: number) => `$${n.toFixed(2)}`;

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

// Which lookup a scripted advisor runs this turn, if any. Penny's lookups are forced by the engine.
export function scriptedLookup(advisor: Advisor, s: State, allowed: LookupTool[]): LookupTool | null {
  const n = s.messages.length + 1;
  if (advisor === "penny") return allowed[0] ?? null;
  if (allowed.includes("look_closer") && (n === 3 || Math.random() < 0.5)) return "look_closer";
  return null;
}

// Every reaction starts with a different word, so two never open the same way in one debate.
const REACTIONS: Record<Advisor, string[]> = {
  spark: [
    "Oh come ON, Penny.", "Okay, that one stung.", "Rude. Accurate, but rude.", "Ugh. Numbers again.",
    "Wow. Cold.", "Booo. Continue.", "Hey! I was enjoying that.", "Listen, sparkle matters.",
  ],
  penny: [
    "Cute. Wrong, but cute.", "Noted. Unmoved.", "Calm down, sparkler.", "Bold claim. Checking.",
    "Mm. A want, not a need.", "Sure. And I'm a peacock.", "Adorable. Next.", "That's not a reason.",
  ],
};

export function scriptedReaction(advisor: Advisor, s: State): string {
  const used = new Set(s.messages.map((m) => (m.reaction ? opener(m.reaction) : "")));
  const fresh = REACTIONS[advisor].filter((r) => !used.has(opener(r)));
  return pick(fresh.length ? fresh : REACTIONS[advisor]);
}

function answerLine(advisor: Advisor, a: Answer, s: State): string {
  if (a.answer === null) {
    return advisor === "spark" ? pick(["They went quiet! I'm counting that as a yes.", "No answer. Mysterious. I respect it."]) : pick(["No answer. I'll assume the careful option.", "Silence. I'll take that as doubt."]);
  }
  const budget = budgetOf(s);
  if (budget !== undefined && /budget|spend/i.test(a.question)) {
    const fits = bestOffer(s.product).price <= budget;
    if (advisor === "spark") return fits ? `"${a.answer}"! It fits! The universe has spoken!` : `"${a.answer}". I hear it. I hate it.`;
    return fits ? `"${a.answer}". Annoyingly, it fits.` : `"${a.answer}". So it doesn't fit. Interesting.`;
  }
  if (/rarely|can wait|not really|just want/i.test(a.answer)) {
    return advisor === "spark" ? `"${a.answer}"? Oof. That hurts my case.` : `"${a.answer}". Music to my ears.`;
  }
  return advisor === "spark" ? `"${a.answer}"! Hear that, Penny?` : `"${a.answer}". Fine. That counts for something.`;
}

// Where the scripted debate lands, in the same order as ruleVerdict, so the last lines match the verdict.
function landing(s: State): "over" | "wait" | "cheaper" | "buy" {
  const best = bestOffer(s.product).price;
  const budget = budgetOf(s);
  if (budget !== undefined && best > budget) return "over";
  if (leansWait(s)) return "wait";
  return best < s.picked.price ? "cheaper" : "buy";
}

export function scriptedSay(advisor: Advisor, s: State, fresh?: Answer): Say {
  const n = s.messages.length + 1;
  const p = s.product;
  const best = bestOffer(p);
  const cheaper = best.price < s.picked.price;
  const gap = Math.round((s.picked.price - best.price) * 100) / 100;
  const features = p.keyFeatures.length ? p.keyFeatures : ["the whole package"];
  const feature = short(features[(n >> 1) % features.length], 48).replace(/[.!]+$/, "");
  const rating = p.rating ? `${p.rating.score.toFixed(1)} stars from ${p.rating.count.toLocaleString("en-US")} people` : "";
  const alt = s.evidence.find((e) => e.kind === "alternatives")?.items[0];
  const altName = alt ? short(alt.label, 28) : "";
  const budget = budgetOf(s);
  const altFits = !!alt && alt.price !== undefined && budget !== undefined && alt.price <= budget;
  const cpu = costPerUse(s);
  const lead = fresh ? `${answerLine(advisor, fresh, s)} ` : "";
  const reaction = n === 1 ? "" : scriptedReaction(advisor, s);
  // A line not said yet in this debate, if there is one.
  const pickNew = (xs: string[]) => {
    const unsaid = xs.filter((x) => !s.messages.some((m) => m.text.includes(x)));
    return pick(unsaid.length ? unsaid : xs);
  };

  let text: string;
  if (advisor === "spark") {
    if (n === 1) {
      text = pickNew([
        `Penny, look. ${short(p.title)}. ${feature}. I'm already in love.`,
        rating ? `${rating}, Penny. That's not hype, that's a fan club. We're joining.` : `Penny, ${feature.toLowerCase()}. Tell me that isn't a treat.`,
        `Don't start, Penny. ${feature}. They deserve nice things, and this is a nice thing.`,
      ]);
    } else if (n === 5 && alt) {
      text = pickNew([
        `${altName}? That's a coupon, not a treat. ${feature} is why this one costs more.`,
        `Sure, ${altName} is cheaper. So is a paper hat. ${feature}, Penny!`,
      ]);
    } else if (n >= 7) {
      text = {
        over: altFits ? `Fine. Over budget is over budget. If ${altName} makes them happy, I'll cheer for it.` : "Fine. Over budget is over budget. I'll sulk quietly. Mostly.",
        wait: "Alright. If it can wait, it can wait. But when it's time, this is the one. No take-backs.",
        cheaper: "Fine, you win on the store, Penny. Same thing, less money. But it's still a yes from me.",
        buy: "I'll give you the cost-per-use maths, Penny. And it still says yes. Treat approved.",
      }[landing(s)];
    } else {
      text = pickNew([
        rating ? `${rating}. That many people can't all be wrong, Penny.` : `${feature}. Every single day. That's joy per dollar.`,
        `${feature}. You can't put a price on that. Well, you can, but you shouldn't.`,
        `Life's short, Penny. Nobody ever said "I wish I'd been more sensible about ${short(p.title, 20).toLowerCase()}".`,
      ]);
    }
  } else if (n === 2) {
    text = cheaper
      ? `Same thing is ${$(best.price)} at ${best.merchant}. That's ${$(gap)} extra for the joy of clicking first.`
      : `${p.offers.length > 1 ? "Checked every store" : "Only one store has it"}. ${$(s.picked.price)} is the lowest. Annoying. Doesn't mean they need it.`;
  } else if (n === 4) {
    text = alt
      ? `Exhibit B: ${altName}, ${$(alt.price!)} at ${alt.note}. Same job, and money left over for snacks.`
      : `I hunted for something cheaper and similar. Nothing. Fine. Do they need it, or just want it?`;
  } else if (n >= 8) {
    text = {
      over: altFits ? `Where I land: not at this price. ${altName} fits the budget. Spark will live.` : "Where I land: not at this price. It can wait for a better one.",
      wait: "Where I land: it's lovely and it can wait. A want in a cart is still money in a pocket.",
      cheaper: `Here's where I land: buy it, but from ${best.merchant}. I'm frugal, not a monster.`,
      buy: "Where I land: they'll use it, the price is the best around. I'll allow it. Once.",
    }[landing(s)];
  } else {
    text = pickNew([
      `${$(cpu.daily)} a day if they use it daily for a year. If it sits in a drawer, that maths gets ugly.`,
      "A cart full of treats is how a budget dies, Spark.",
      "Wanting it isn't the same as needing it. Waiting costs nothing.",
    ]);
  }
  return { text: (lead + text).trim(), reaction };
}

// Penny asks about budget or need; Spark about how often or whether it can wait. Chips stay short.
export function scriptedAsk(advisor: Advisor, s: State): { question: string; options: string[] } {
  const price = bestOffer(s.product).price;
  const low = Math.max(10, Math.floor((price * 0.8) / 10) * 10);
  const high = Math.ceil((price * 1.2) / 10) * 10;
  if (advisor === "penny") {
    return pick([
      { question: "Be honest. What's your budget for this?", options: [`Under $${low}`, `Up to $${high}`, "Money's no object"] },
      { question: "Be honest. Do you need it, or want it?", options: ["Need it", "Want it", "Bit of both"] },
    ]);
  }
  return pick([
    { question: "How often would you actually use it?", options: ["Every day", "Every week", "Rarely, honestly"] },
    { question: "Could this wait a month?", options: ["Yes, it can wait", "No, I need it soon"] },
  ]);
}
