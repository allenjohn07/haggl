import { z } from "zod";
import { bestOffer, getOffer, getProduct } from "@/lib/products";
import type { Advisor, Evidence, Offer, Product, Verdict } from "@/lib/types";
import type { Debate } from "./store";

// The debate rules from docs/CONTRACTS.md, enforced in code (not just in prompts).

export const MAX_MESSAGES = 8;
// After which message number an advisor asks the user, and who asks.
export const ASK_AFTER: Record<number, Advisor> = { 2: "penny", 5: "spark" };
export const TEXT_MAX = 280;
export const REACTION_MAX = 60;
export const QUESTION_MAX = 90;
export const OPTION_MAX = 28;

export type Message = { id: string; from: Advisor; text: string; reaction?: string; turn: number };
export type Answer = { askId: string; from: Advisor; question: string; answer: string | null };

// Everything one debate knows. Lives only inside the running stream.
export type State = {
  debate: Debate;
  product: Product;
  picked: Offer;
  evidence: (Evidence & { id: string })[];
  messages: Message[];
  answers: Answer[];
  alternatives: Product[]; // alternatives that were shown as evidence
  used: { check_prices: boolean; find_alternatives: boolean; look_closer: boolean };
};

export const otherAdvisor = (a: Advisor): Advisor => (a === "spark" ? "penny" : "spark");
export const NAMES: Record<Advisor, string> = { spark: "Spark", penny: "Penny" };

// Trim to a limit at a word boundary.
export function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max / 2)).trimEnd() + "…";
}

// ---- No invented prices ----

const MONEY = /\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/g;

function amountsIn(text: string): number[] {
  return [...text.matchAll(MONEY)].map((m) => Number(m[1].replace(/,/g, "") + (m[2] ? `.${m[2]}` : "")));
}

// Prices an advisor may mention: the pick, every price in the evidence, numbers in the user's
// answers, and the gap between the pick and an evidence price ("$30 cheaper").
export function knownPrices(s: State): number[] {
  const evidence = s.evidence.flatMap((e) => e.items.map((i) => i.price)).filter((p): p is number => p !== undefined);
  const answers = s.answers.flatMap((a) => (a.answer ? amountsIn(a.answer) : []));
  const gaps = evidence.map((p) => Math.abs(s.picked.price - p));
  return [s.picked.price, ...evidence, ...answers, ...gaps];
}

export function unbackedAmounts(text: string, known: number[]): number[] {
  return amountsIn(text).filter((n) => !known.some((k) => Math.abs(k - n) <= 1));
}

// Last resort: drop each sentence that carries an unbacked amount.
export function dropUnbacked(text: string, known: number[]): string {
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  return sentences.filter((x) => unbackedAmounts(x, known).length === 0).join("").trim();
}

// ---- Asks ----

const AskInput = z.object({
  question: z.string().trim().min(5),
  options: z.array(z.string().trim().min(1).max(OPTION_MAX)).min(2).max(4),
});

export function cleanAsk(input: unknown): { question: string; options: string[] } | null {
  const parsed = AskInput.safeParse(input);
  if (!parsed.success) return null;
  const options = [...new Set(parsed.data.options)];
  if (options.length < 2) return null;
  return { question: clip(parsed.data.question, QUESTION_MAX), options };
}

// The budget the user gave, if any ("Under $150" -> 150).
export function budgetOf(s: State): number | undefined {
  for (const a of s.answers) {
    if (!a.answer || !/budget|spend/i.test(a.question)) continue;
    const n = amountsIn(a.answer);
    if (n.length) return Math.max(...n);
  }
  return undefined;
}

// The user said it can wait or they'd rarely use it.
export function leansWait(s: State): boolean {
  return s.answers.some((a) => a.answer !== null && /rarely|can wait|not really|just want/i.test(a.answer));
}

// ---- Verdict ----

const VerdictInput = z.object({
  call: z.enum(["buy", "buy_elsewhere", "wait", "skip"]),
  headline: z.string().trim().min(3),
  reasons: z.array(z.string().trim().min(3)).min(2).max(4),
  productId: z.string(),
  offerId: z.string(),
});

// Price and savings always come from the stored offers, never from the AI.
function priced(s: State, productId: string, offerId: string): { price: number; savings?: number } | null {
  const offer = getOffer(productId, offerId);
  if (!offer) return null;
  const savings = Math.round((s.picked.price - offer.price) * 100) / 100;
  return { price: offer.price, savings: savings > 0 ? savings : undefined };
}

export function validateVerdict(input: unknown, s: State): Verdict | null {
  const parsed = VerdictInput.safeParse(input);
  if (!parsed.success) return null;
  const v = parsed.data;
  const allowed = v.productId === s.product.id || s.alternatives.some((p) => p.id === v.productId);
  if (!allowed || !getProduct(v.productId)) return null;
  const price = priced(s, v.productId, v.offerId);
  if (!price) return null;
  const known = [...knownPrices(s), price.price, price.savings ?? 0];
  const reasons = v.reasons.filter((r) => unbackedAmounts(r, known).length === 0).map((r) => clip(r, 120));
  if (reasons.length < 2 || unbackedAmounts(v.headline, known).length) return null;
  return { call: v.call, headline: clip(v.headline, 60), reasons, productId: v.productId, offerId: v.offerId, ...price };
}

const $ = (n: number) => `$${n.toFixed(2)}`;

// Rule-based verdict: the cheapest offer of the pick; buy_elsewhere if cheaper than the pick,
// buy if it fits the budget answer, else a shown alternative that fits, else wait.
export function ruleVerdict(s: State): Verdict {
  const best = bestOffer(s.product);
  const budget = budgetOf(s);
  const cheaper = best.price < s.picked.price;

  if (budget !== undefined && best.price > budget) {
    const alt = s.alternatives
      .map((p) => ({ p, o: bestOffer(p) }))
      .filter((x) => x.o.price <= budget)
      .sort((a, b) => a.o.price - b.o.price)[0];
    if (alt) {
      return {
        call: "buy_elsewhere",
        headline: "Same idea, inside your budget",
        reasons: [
          `The pick is ${$(best.price)} at best, over your budget.`,
          `${clip(alt.p.title, 50)} is ${$(alt.o.price)} at ${alt.o.merchant}.`,
          "Penny approves. Spark is coping.",
        ],
        productId: alt.p.id,
        offerId: alt.o.offerId,
        ...priced(s, alt.p.id, alt.o.offerId)!,
      };
    }
    return {
      call: "wait",
      headline: "Not at this price. Wait for a drop.",
      reasons: [`Best price found is ${$(best.price)}, over your budget.`, "Nothing similar fit either.", "Spark will sulk, but your wallet wins."],
      productId: s.product.id,
      offerId: best.offerId,
      ...priced(s, s.product.id, best.offerId)!,
    };
  }

  if (leansWait(s)) {
    return {
      call: "wait",
      headline: "Nice, but it can wait",
      reasons: ["You said it isn't urgent.", `If you change your mind, ${best.merchant} has it for ${$(best.price)}.`, "Spark disagrees, loudly."],
      productId: s.product.id,
      offerId: best.offerId,
      ...priced(s, s.product.id, best.offerId)!,
    };
  }

  if (cheaper) {
    return {
      call: "buy_elsewhere",
      headline: `Buy it, but at ${best.merchant}`.slice(0, 60),
      reasons: [`Same item for ${$(best.price)} instead of ${$(s.picked.price)}.`, "You'll actually use it.", "Both of us agree. Rare."],
      productId: s.product.id,
      offerId: best.offerId,
      ...priced(s, s.product.id, best.offerId)!,
    };
  }

  return {
    call: "buy",
    headline: "Go for it. You picked the best price.",
    reasons: [`${$(s.picked.price)} at ${s.picked.merchant} is the lowest we found.`, "It fits what you told us.", "Spark is thrilled. Penny allows it."],
    productId: s.product.id,
    offerId: s.picked.offerId,
    ...priced(s, s.product.id, s.picked.offerId)!,
  };
}
