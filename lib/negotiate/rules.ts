import { z } from "zod";
import type { Move, Side } from "@/lib/types";

// The negotiation rules from docs/CONTRACTS.md, enforced in code.
// `limit` is the acting side's PRIVATE limit (buyerMax or sellerFloor). Never log it.

export const MAX_ROUNDS = 8;
export const MAX_SAY = 200;

// Shape check for any move, live or scripted.
export const MoveSchema = z.object({
  say: z.string().trim().min(1),
  action: z.enum(["offer", "accept", "walk"]),
  price: z.number().optional(),
});

// What a side knows when it takes a turn.
export type TurnContext = {
  side: Side;
  round: number;          // 1..MAX_ROUNDS
  listPrice: number;
  limit: number;          // this side's private limit
  myLast?: number;        // this side's latest offer
  theirLast?: number;     // the other side's latest offer
};

// Legal whole-dollar offer range for this side.
export function legalRange(ctx: TurnContext): [number, number] {
  return ctx.side === "buyer"
    ? [1, Math.min(ctx.limit, ctx.listPrice)]
    : [Math.max(1, Math.min(ctx.limit, ctx.listPrice)), ctx.listPrice];
}

// Returns the broken rule as a sentence for the re-prompt, or null if the move is legal.
export function checkMove(move: Move, ctx: TurnContext): string | null {
  const [lo, hi] = legalRange(ctx);
  if (move.action === "walk") return null;
  if (move.action === "offer") {
    const p = move.price;
    if (p === undefined || !Number.isInteger(p)) return "An offer needs a whole-dollar price.";
    if (p < lo || p > hi) {
      return ctx.side === "buyer"
        ? `Your offer must be a whole number from $1 to $${hi}. You may never go above your limit.`
        : `Your offer must be a whole number from $${lo} to $${hi}. You may never go below your floor.`;
    }
    return null;
  }
  // accept: only the other side's latest offer, and only within your limit.
  if (ctx.theirLast === undefined) return "There is no offer from the other side to accept yet. Make an offer.";
  if (ctx.side === "buyer" && ctx.theirLast > ctx.limit) {
    return `You cannot accept $${ctx.theirLast}: it is above your limit. Make a counter-offer instead.`;
  }
  if (ctx.side === "seller" && ctx.theirLast < ctx.limit) {
    return `You cannot accept $${ctx.theirLast}: it is below your floor. Make a counter-offer instead.`;
  }
  return null;
}

// Last resort after a failed re-prompt: force the move into the legal range.
export function clampMove(move: Move, ctx: TurnContext): Move {
  const [lo, hi] = legalRange(ctx);
  const wanted = move.price ?? (ctx.side === "buyer" ? hi : lo);
  const price = Math.min(hi, Math.max(lo, Math.round(wanted)));
  return { say: move.say, action: "offer", price };
}

// An offer that crosses the other side's latest offer becomes an accept of that offer
// (better for the mover, and it ends the haggle cleanly). Call only on legal moves.
export function normalizeMove(move: Move, ctx: TurnContext): Move {
  if (move.action !== "offer" || ctx.theirLast === undefined || move.price === undefined) return move;
  const crosses = ctx.side === "buyer" ? move.price >= ctx.theirLast : move.price <= ctx.theirLast;
  return crosses ? { say: move.say, action: "accept" } : move;
}

// Clean up the line: one line, capped, and never naming the private limit
// unless it is also the price on the table.
export function cleanSay(say: string, ctx: TurnContext, price?: number): string | null {
  const s = say.replace(/\s+/g, " ").trim().slice(0, MAX_SAY);
  if (!s) return null;
  const mentionsLimit = new RegExp(`(^|[^0-9])${ctx.limit}([^0-9]|$)`).test(s);
  if (mentionsLimit && price !== ctx.limit) return null;
  return s;
}
