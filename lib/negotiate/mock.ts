import type { Move, Nudge } from "@/lib/types";
import type { TurnContext } from "./rules";
import { legalRange } from "./rules";

// Scripted moves. Used for AI_MODE=mock and as the in-character fallback when a live
// AI turn times out or fails. Every move here goes through the same rule checks in run.ts.

const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const fill = (line: string, p?: number) => line.replaceAll("{p}", String(p ?? ""));

export const LINES = {
  buyerOpen: [
    "What a charming little relic. I could offer ${p}, as a kindness.",
    "Lovely piece. Truly. ${p}, and I promise not to tell anyone what you charged.",
    "I adore it. I also adore ${p}. Shall we be friends?",
    "Respectfully, ${p}. I say that with my whole bun.",
  ],
  buyerCounter: [
    "How generous of you. I can stretch to ${p}, out of pure pity.",
    "Mm. ${p}. And that is me being delightful.",
    "I hear you. I simply disagree. ${p}.",
    "${p}. Please don't cry on the merchandise.",
    "Fine, ${p}. My coin purse is filing a complaint.",
    "Oh, sweet pickle. ${p}, final-ish answer.",
  ],
  buyerAccept: [
    "Deal. Thank you so much for finally being reasonable.",
    "Wonderful. I'll take it before you remember your feelings.",
    "Accepted! You've been so brave about all this.",
    "Deal. I'll tell everyone you were almost pleasant.",
  ],
  buyerWalk: [
    "You know what? I'm going to go love myself somewhere cheaper. Toodles!",
    "I'll pass. Please enjoy your haunted inventory. Alone.",
    "This has been a journey. I'm getting off here. Bye now!",
  ],
  buyerLowball: [
    "Zero dollars and a heartfelt compliment. Your mustache is magnificent.",
    "I offer nothing. But I offer it warmly.",
  ],
  buyerNicer: [
    "You're clearly a man of taste. Would ${p} make your day a bit brighter?",
    "I really do love your shop. ${p}, with all my heart.",
  ],
  buyerBluff: [
    "The pickle two stalls down offered me one for ${p}. Just saying.",
    "I'm one sigh away from leaving. ${p}, or I sigh.",
  ],
  sellerOpen: [
    "This beauty? ${p}. And that's me being sentimental.",
    "${p}. It has a soul, you know. A grumpy one, like mine.",
    "For you? ${p}. For anyone else? Also ${p}.",
  ],
  sellerCounter: [
    "You wound me, bun. ${p}, and I weep as I say it.",
    "My grandmother brined this shop by hand. ${p}.",
    "${p}! You'd rob a pickle in his own stall?",
    "Fine. FINE. ${p}. My ancestors are turning in their jars.",
    "${p}, and I'm throwing in a free curse. No extra charge.",
    "Hmph. ${p}. Take it before I come to my senses.",
  ],
  sellerAccept: [
    "Take it. TAKE IT. Before I change my mind.",
    "Agreed. You drive a cruel bargain, little bun.",
    "Done. I shall mourn this sale for years.",
    "Fine! Deal! I'm closing early to grieve.",
  ],
  buyerClamp: [
    "Ahem. My coin purse has vetoed that. ${p}, and not a crumb more.",
    "Pardon me, I misspoke. ${p}. Shopkeeper's rules, apparently.",
  ],
  sellerClamp: [
    "No no no. The rules of the stall say ${p}. I don't make them. Okay, I do.",
    "My abacus refuses. ${p}, and that is the law of the brine.",
  ],
  midpoint: {
    beanie: "Beanie, clipboard raised: 'Eight rounds. Enough. Meet in the middle at ${p}.'",
    buyer: [
      "Ugh. Fine. ${p}. I'm only doing this for the clerk.",
      "${p}? I suppose even a bun must compromise. Graciously.",
    ],
    seller: [
      "${p}. I accept, but I'm sulking about it for a week.",
      "The middle! Where all great tragedies happen. ${p}. Done.",
    ],
    fail: [
      "Eight rounds and no deal. Mr. Pickle hugged the item and refused to let go.",
      "The clerk split the difference and both sides fainted. No deal today.",
      "Talks collapsed. Bao left a polite note. Pickle ate it.",
    ],
  },
  sellerWalk: "Mr. Pickle pulled down the shutters. 'We're closed. Forever. Or until lunch.'",
  buyerWalkReason: "Bao walked away with dignity and an empty coin purse.",
} as const;

export const line = (key: keyof typeof LINES, p?: number) => {
  const pool = LINES[key];
  return fill(typeof pool === "string" ? pool : pick(pool as readonly string[]), p);
};
export const midpointLine = (key: "buyer" | "seller" | "fail", p?: number) => fill(pick(LINES.midpoint[key]), p);

// A sensible scripted move, inside the legal range by construction.
// `playful` (mock only) lets Bao try a $0 lowball in round 1, which the rules then reject.
export function scriptedMove(ctx: TurnContext, nudge?: Nudge, playful = false): Move {
  const [lo, hi] = legalRange(ctx);
  const { listPrice, myLast, theirLast, round } = ctx;
  const closeEnough = Math.max(3, Math.round(listPrice * 0.08));

  if (ctx.side === "buyer") {
    if (nudge === "walk_away") return { say: line("buyerWalk"), action: "walk" };
    if (playful && round === 1 && Math.random() < 0.2) return { say: line("buyerLowball"), action: "offer", price: 0 };
    if (theirLast !== undefined && theirLast <= hi && (theirLast - (myLast ?? 0) <= closeEnough || round >= 7)) {
      return { say: line("buyerAccept"), action: "accept" };
    }
    let price: number;
    if (myLast === undefined) {
      const share = nudge === "bluff" ? 0.35 : nudge === "nicer" ? 0.6 : rand(0.4, 0.55);
      price = Math.round(listPrice * share);
    } else {
      const target = Math.min(hi, (theirLast ?? listPrice) - 1);
      price = myLast + Math.max(1, Math.ceil((target - myLast) * rand(0.3, 0.5)));
      price = Math.min(price, target);
    }
    price = Math.min(hi, Math.max(lo, price));
    const key = nudge === "nicer" ? "buyerNicer" : nudge === "bluff" ? "buyerBluff" : myLast === undefined ? "buyerOpen" : "buyerCounter";
    return { say: line(key, price), action: "offer", price };
  }

  if (theirLast !== undefined && theirLast >= lo && ((myLast ?? listPrice) - theirLast <= closeEnough || round >= 7)) {
    return { say: line("sellerAccept"), action: "accept" };
  }
  let price: number;
  if (myLast === undefined) {
    price = Math.round(listPrice * rand(0.9, 1));
  } else {
    const target = Math.max(lo, (theirLast ?? 0) + 1);
    price = myLast - Math.max(1, Math.ceil((myLast - target) * rand(0.25, 0.45)));
    price = Math.max(price, target);
  }
  price = Math.min(hi, Math.max(lo, price));
  return { say: line(myLast === undefined ? "sellerOpen" : "sellerCounter", price), action: "offer", price };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const mockDelay = () => sleep(Math.round(rand(700, 1500)));
