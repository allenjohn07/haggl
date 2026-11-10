import Anthropic from "@anthropic-ai/sdk";
import type { Move, Side } from "@/lib/types";
import type { PublicProduct } from "@/data/products";
import { MoveSchema, MAX_ROUNDS, type TurnContext } from "./rules";

// Live agents: one short Anthropic call per turn, structured via a tool.
// Prompts contain the acting side's private limit. NEVER log prompts or requests.

const MODEL = process.env.AI_MODEL || "claude-haiku-5-5";
const TIMEOUT_MS = 12_000;
const MAX_TOKENS = 400;

export type HistoryEntry = { side: Side; action: Move["action"]; price?: number; say: string };

const PERSONAS: Record<Side, string> = {
  buyer:
    "You are Bao, a steamed-bun blob with a tiny bow tie and a coin purse, buying for the user at a tiny market stall. " +
    "Voice: overly courteous, quietly savage. Compliments with a knife in them. You want the lowest price you can get.",
  seller:
    "You are Mr. Pickle, a grumpy pickle shopkeeper with a mustache, an apron and a small abacus. " +
    "Voice: sulky, dramatic, old-world. You take every offer personally and you love your 'haunted' stock. You want the highest price you can get.",
};

const MOVE_TOOL: Anthropic.Tool = {
  name: "make_move",
  description: "Make your negotiation move. Always call this exactly once.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      say: { type: "string", description: "Your in-character line. PG, funny, one or two short sentences, under 200 characters." },
      action: { type: "string", enum: ["offer", "accept", "walk"], description: "offer a price, accept the other side's latest offer, or walk away" },
      price: { type: "integer", description: "Whole dollars. Required when action is offer." },
    },
    required: ["say", "action"],
    additionalProperties: false,
  },
};

const ORDER_TOOL: Anthropic.Tool = {
  name: "create_paypal_order",
  description: "Close the agreed deal by creating the PayPal order for it. The price comes from the stored deal.",
  strict: true,
  input_schema: {
    type: "object",
    properties: { dealId: { type: "string", description: "The id of the agreed deal" } },
    required: ["dealId"],
    additionalProperties: false,
  },
};

let client: Anthropic | null = null;
function getClient() {
  // maxRetries 0: run.ts owns the one retry. Throws if no key is configured.
  client ??= new Anthropic({ maxRetries: 0 });
  return client;
}

// Haiku: no thinking for fast, short turns. Sonnet 5.5 rejects "disabled", so use between_tools.
function thinking(): Anthropic.ThinkingConfigParam | undefined {
  if (MODEL.includes("haiku")) return { type: "disabled" };
  if (MODEL.includes("sonnet-5-5")) return { type: "between_tools" };
  return undefined;
}

async function callTool(system: string, user: string, tool: Anthropic.Tool): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await getClient().messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        // Forced tool_choice is rejected by Sonnet 5.5, so use auto + an explicit instruction;
        // a reply without the tool call counts as a failed attempt.
        tools: [tool],
        tool_choice: { type: "auto" },
        thinking: thinking(),
        output_config: { effort: "low" },
        messages: [{ role: "user", content: user }],
      },
      { signal: ctrl.signal, timeout: TIMEOUT_MS },
    );
    const use = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === tool.name);
    if (!use) throw new Error("no tool call");
    return use.input;
  } finally {
    clearTimeout(timer);
  }
}

// One attempt plus one retry. Returns null on failure so the caller falls back to a scripted move.
async function withRetry<T>(fn: () => Promise<T>): Promise<T | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fn();
    } catch (err) {
      // Log the error type only: never the request, which contains the private limit.
      console.warn(`[negotiate] AI call failed (attempt ${attempt + 1}): ${err instanceof Error ? err.name : "unknown"}`);
    }
  }
  return null;
}

function transcript(history: HistoryEntry[]) {
  if (history.length === 0) return "No moves yet. You open.";
  return history
    .map((h) => {
      const who = h.side === "buyer" ? "Bao" : "Mr. Pickle";
      const act = h.action === "offer" ? `offers $${h.price}` : h.action === "accept" ? "accepts" : "walks away";
      return `${who} ${act}: "${h.say}"`;
    })
    .join("\n");
}

export async function liveMove(
  ctx: TurnContext,
  product: PublicProduct,
  history: HistoryEntry[],
  instruction?: string,
): Promise<Move | null> {
  const limitRule =
    ctx.side === "buyer"
      ? `Your PRIVATE maximum is $${ctx.limit}. Never offer or accept above it.`
      : `Your PRIVATE floor is $${ctx.limit}. Never offer or accept below it.`;
  const system = [
    PERSONAS[ctx.side],
    `Item: ${product.name} (${product.blurb}). List price $${ctx.listPrice}.`,
    limitRule,
    "Never reveal or hint at your private limit number. Offers are whole dollars from 1 to the list price.",
    "You may accept only the other side's latest offer. Haggle for a few rounds before settling; walk away only if hopeless.",
    `There are at most ${MAX_ROUNDS} rounds. Keep it PG, short and funny.`,
    "Always respond by calling the make_move tool. Do not include internal or system XML tags in your response.",
  ].join("\n");
  const user = [
    `Round ${ctx.round} of ${MAX_ROUNDS}.`,
    transcript(history),
    instruction ? `Private instruction for this turn only: ${instruction}` : "",
    "Your move. Call make_move.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return withRetry(async () => {
    const parsed = MoveSchema.safeParse(await callTool(system, user, MOVE_TOOL));
    if (!parsed.success) throw new Error("bad move shape");
    return parsed.data;
  });
}

// The seller agent closes the deal by calling create_paypal_order. Returns true if it did.
export async function sellerCallsOrderTool(dealId: string, price: number, product: PublicProduct): Promise<boolean> {
  const system =
    PERSONAS.seller +
    "\nThe deal is agreed. Close it now by calling the create_paypal_order tool with the deal id. Always call the tool.";
  const user = `Deal ${dealId} for the ${product.name} at $${price} is agreed. Call create_paypal_order with dealId "${dealId}".`;
  const ok = await withRetry(async () => {
    const input = (await callTool(system, user, ORDER_TOOL)) as { dealId?: unknown };
    if (typeof input?.dealId !== "string") throw new Error("bad tool input");
    return true;
  });
  return ok === true;
}
