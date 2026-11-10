import type { Move, Nudge, Product, Side, Stage } from "@/lib/types";
import { toPublic } from "@/data/products";
import { createDeal, updateDeal } from "@/lib/deals";
import { createOrderForDeal } from "@/lib/paypal/orders";
import { MAX_ROUNDS, checkMove, clampMove, cleanSay, normalizeMove, type TurnContext } from "./rules";
import { line, midpointLine, LINES, mockDelay, scriptedMove, sleep } from "./mock";
import { liveMove, sellerCallsOrderTool, type HistoryEntry } from "./agents";

// The negotiation loop as an async generator of SSE-ready events (see docs/CONTRACTS.md).
// Private limits stay in here; events carry only public data.

export type NegotiationEvent =
  | { event: "stage"; data: { stage: Stage; label: string } }
  | { event: "message"; data: { side: Side; say: string; action: Move["action"]; price?: number; round: number } }
  | { event: "deal"; data: { dealId: string; productId: string; price: number; listPrice: number } }
  | { event: "order"; data: { dealId: string; approveUrl: string } }
  | { event: "order_failed"; data: { dealId: string; message: string } }
  | { event: "nodeal"; data: { reason: string } }
  | { event: "error"; data: { message: string } }
  | { event: "done"; data: Record<string, never> };

const NUDGE_TEXT: Record<Nudge, string> = {
  nicer: "Be noticeably nicer and warmer this turn, and concede a little more than usual.",
  bluff: "Bluff this turn: claim you have a cheaper option elsewhere and push the price down hard.",
  walk_away: "Walk away now, politely and savagely, with a parting line.",
};

const isLive = () => process.env.AI_MODE === "live";
const NAMES: Record<Side, string> = { buyer: "Bao", seller: "Mr. Pickle" };

export async function* negotiate(product: Product, nudge?: Nudge): AsyncGenerator<NegotiationEvent> {
  try {
    yield* run(product, nudge);
  } catch (err) {
    console.warn(`[negotiate] unexpected failure: ${err instanceof Error ? err.name : "unknown"}`);
    yield { event: "error", data: { message: "The shop's having a moment. One more try?" } };
  }
  yield { event: "done", data: {} };
}

async function* run(product: Product, nudge?: Nudge): AsyncGenerator<NegotiationEvent> {
  const pub = toPublic(product);
  const history: HistoryEntry[] = [];
  const latest: Partial<Record<Side, number>> = {};
  // Live AI until a turn fails (after its retry); then scripted moves for the rest of
  // this negotiation, so a dead key or outage costs one slow turn, not sixteen.
  let aiUp = isLive();

  yield { event: "stage", data: { stage: "search", label: `Beanie is fetching the ${pub.name}` } };
  if (!aiUp) await mockDelay();

  // One agent turn: think -> move -> rule check -> (re-prompt once) -> (clamp) -> message.
  async function* turn(side: Side, round: number, turnNudge?: Nudge): AsyncGenerator<NegotiationEvent, Move> {
    const other: Side = side === "buyer" ? "seller" : "buyer";
    const ctx: TurnContext = {
      side,
      round,
      listPrice: product.listPrice,
      limit: side === "buyer" ? product.buyerMax : product.sellerFloor,
      myLast: latest[side],
      theirLast: latest[other],
    };
    yield { event: "stage", data: { stage: side === "buyer" ? "buyer_think" : "seller_think", label: `${NAMES[side]} is thinking` } };

    const ask = async (instruction?: string, retry = false): Promise<Move> => {
      if (aiUp) {
        const m = await liveMove(ctx, pub, history, instruction);
        if (m) return m;
        aiUp = false; // fall through to the in-character scripted move
      }
      await mockDelay();
      return scriptedMove(ctx, turnNudge, !retry && !isLive());
    };

    const instruction = turnNudge ? NUDGE_TEXT[turnNudge] : undefined;
    let move = await ask(instruction);
    if (turnNudge === "walk_away") move = { say: move.say, action: "walk" };

    const broken = checkMove(move, ctx);
    if (broken) {
      move = await ask(`${instruction ?? ""} Your last move was rejected. Rule: ${broken}`.trim(), true);
      if (checkMove(move, ctx)) {
        move = clampMove(move, ctx);
        move.say = line(side === "buyer" ? "buyerClamp" : "sellerClamp", move.price);
      }
    }
    move = normalizeMove(move, ctx);

    const price = move.action === "offer" ? move.price : move.action === "accept" ? ctx.theirLast : undefined;
    move.say = cleanSay(move.say, ctx, price) ?? scriptedSay(side, move.action, price);
    if (move.action === "offer") latest[side] = move.price;
    history.push({ side, action: move.action, price, say: move.say });
    yield { event: "message", data: { side, say: move.say, action: move.action, price, round } };
    return move;
  }

  let dealPrice: number | undefined;
  for (let round = 1; round <= MAX_ROUNDS && dealPrice === undefined; round++) {
    for (const side of ["buyer", "seller"] as const) {
      const move = yield* turn(side, round, side === "buyer" && round === 1 ? nudge : undefined);
      if (move.action === "walk") {
        yield { event: "nodeal", data: { reason: side === "buyer" ? LINES.buyerWalkReason : LINES.sellerWalk } };
        return;
      }
      if (move.action === "accept") {
        // Deal price = the other side's latest offer, from server history.
        dealPrice = latest[side === "buyer" ? "seller" : "buyer"];
        break;
      }
    }
  }

  // The dramatic fallback: the clerk proposes the midpoint of the last two offers.
  if (dealPrice === undefined) {
    const { buyer, seller } = latest;
    const mid = buyer !== undefined && seller !== undefined ? Math.round((buyer + seller) / 2) : undefined;
    if (mid === undefined || mid > product.buyerMax || mid < product.sellerFloor) {
      yield { event: "nodeal", data: { reason: midpointLine("fail") } };
      return;
    }
    yield { event: "message", data: { side: "buyer", say: midpointLine("buyer", mid), action: "accept", price: mid, round: MAX_ROUNDS } };
    yield { event: "message", data: { side: "seller", say: midpointLine("seller", mid), action: "accept", price: mid, round: MAX_ROUNDS } };
    dealPrice = mid;
  }

  yield* closeDeal(product, dealPrice, aiUp);
}

// A safe in-character line for a move whose own line was unusable.
function scriptedSay(side: Side, action: Move["action"], price?: number): string {
  if (action === "walk") return side === "buyer" ? line("buyerWalk") : LINES.sellerWalk;
  if (action === "accept") return line(side === "buyer" ? "buyerAccept" : "sellerAccept");
  return line(side === "buyer" ? "buyerCounter" : "sellerCounter", price);
}

// The agentic commerce moment: the seller agent calls create_paypal_order({ dealId }).
async function* closeDeal(product: Product, price: number, aiUp: boolean): AsyncGenerator<NegotiationEvent> {
  const deal = createDeal(product.id, price, product.listPrice);
  yield { event: "deal", data: { dealId: deal.dealId, productId: product.id, price, listPrice: product.listPrice } };
  yield { event: "stage", data: { stage: "checkout", label: "Mr. Pickle is calling create_paypal_order" } };

  // Live: the seller agent makes the tool call. Mock (or if the AI call fails): scripted call.
  if (aiUp) await sellerCallsOrderTool(deal.dealId, price, toPublic(product));
  else await sleep(600);

  try {
    // The tool takes only the dealId; the price comes from the stored Deal.
    const { orderId, approveUrl } = await createOrderForDeal(deal.dealId);
    updateDeal(deal.dealId, { status: "order_created", paypalOrderId: orderId });
    yield { event: "order", data: { dealId: deal.dealId, approveUrl } };
  } catch (err) {
    console.warn(`[negotiate] PayPal order failed: ${err instanceof Error ? err.name : "unknown"}`);
    updateDeal(deal.dealId, { status: "failed" });
    yield { event: "order_failed", data: { dealId: deal.dealId, message: "That didn't go through. Try again?" } };
  }
}
