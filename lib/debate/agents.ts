import Anthropic from "@anthropic-ai/sdk";
import type { Advisor } from "@/lib/types";
import { facts, system, turnBrief } from "./personas";
import type { Answer, State } from "./rules";
import type { LookupTool } from "./tools";

// Live mode: short Anthropic calls, each answered through a strict tool.
// Every call: 12 s timeout, one retry, then null (the caller plays a scripted move).
// Prompts contain the user's answers: NEVER log prompts, requests or keys.

const MODEL = process.env.AI_MODEL || "claude-haiku-5-5";
const TIMEOUT_MS = 12_000;
const MAX_TOKENS = 400;

function tool(name: string, description: string, properties: Record<string, unknown>): Anthropic.Tool {
  return {
    name,
    description,
    strict: true,
    input_schema: { type: "object", properties, required: Object.keys(properties), additionalProperties: false },
  };
}

const str = (description: string) => ({ type: "string", description });

const SAY = tool("say", "Send your message to the other advisor.", {
  text: str("Your message, max 280 characters, one to three sentences."),
  reaction: str("A short reaction (max 60 characters) to the other advisor's last message. Empty string on the very first message."),
});
const LOOKUPS: Record<LookupTool, Anthropic.Tool> = {
  check_prices: tool("check_prices", "Pull this exact item's prices at every store that sells it.", {}),
  find_alternatives: tool("find_alternatives", "Find similar products, cheapest first. Can be used once per debate.", {}),
  look_closer: tool("look_closer", "Read the item's rating, review count and key features.", {}),
};
const ASK = tool("ask_user", "Ask the user one tap-to-answer question.", {
  question: str("The question, max 90 characters."),
  options: { type: "array", items: { type: "string" }, description: "2 to 4 answer chips, each max 28 characters." },
});
const VERDICT = tool("give_verdict", "Give the joint verdict.", {
  call: { type: "string", enum: ["buy", "buy_elsewhere", "wait", "skip"] },
  headline: str("Max 60 characters, written together by Spark and Penny."),
  reasons: { type: "array", items: { type: "string" }, description: "2 to 4 short reasons." },
  productId: str("The product to buy if the user says yes: the user's pick or a shown alternative."),
  offerId: str("The offer (store) for that product, from the lookups."),
});
const ORDER = tool("create_paypal_order", "Create the PayPal order for this purchase. The price comes from the stored purchase.", {
  purchaseId: str("The purchase id"),
});

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ maxRetries: 0 })); // we own the one retry

// Haiku: no thinking, for fast short turns. Sonnet 5.5 rejects "disabled"; between_tools is its off switch.
function thinking(): Anthropic.ThinkingConfigParam | undefined {
  if (MODEL.includes("haiku")) return { type: "disabled" };
  if (MODEL.includes("sonnet-5-5")) return { type: "between_tools" };
  return undefined;
}

type ToolCall = { name: string; input: Record<string, unknown> };

async function callOnce(sys: string, user: string, tools: Anthropic.Tool[], signal: AbortSignal): Promise<ToolCall> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  signal.addEventListener("abort", onAbort);
  try {
    const res = await getClient().messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: sys,
        tools,
        tool_choice: { type: "auto" }, // forced tool_choice 400s on Sonnet 5.5; a reply without a tool call counts as a failure
        thinking: thinking(),
        output_config: { effort: "low" },
        messages: [{ role: "user", content: user }],
      },
      { signal: ctrl.signal, timeout: TIMEOUT_MS },
    );
    const use = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!use) throw new Error("no tool call");
    return { name: use.name, input: (use.input ?? {}) as Record<string, unknown> };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

async function call<T>(sys: string, user: string, tools: Anthropic.Tool[], signal: AbortSignal, check: (c: ToolCall) => T | null): Promise<T | null> {
  for (let attempt = 1; attempt <= 2 && !signal.aborted; attempt++) {
    try {
      const out = check(await callOnce(sys, user, tools, signal));
      if (out !== null) return out;
      console.warn(`[debate] AI reply had the wrong shape (attempt ${attempt})`);
    } catch (err) {
      const status = err instanceof Anthropic.APIError ? ` ${err.status}` : "";
      console.warn(`[debate] AI call failed (attempt ${attempt}): ${err instanceof Error ? err.name : "unknown"}${status}`);
    }
  }
  return null;
}

export type Say = { text: string; reaction: string };
const asSay = (c: ToolCall): Say | null =>
  c.name === "say" && typeof c.input.text === "string" && c.input.text.trim()
    ? { text: c.input.text, reaction: typeof c.input.reaction === "string" ? c.input.reaction : "" }
    : null;

// First call of a turn when lookups are allowed: the advisor either looks something up or speaks.
export function liveStep(advisor: Advisor, s: State, lookups: LookupTool[], fresh: Answer | undefined, signal: AbortSignal) {
  const only = lookups.length === 1 && lookups[0] === "check_prices";
  const user = [
    facts(s),
    turnBrief(s, fresh),
    only ? "Before you say anything, call check_prices." : `You may call one lookup tool (${lookups.join(", ")}) before speaking, or just call say.`,
  ].join("\n\n");
  const tools = only ? [LOOKUPS.check_prices] : [...lookups.map((t) => LOOKUPS[t]), SAY];
  return call(system(advisor), user, tools, signal, (c): { lookup: LookupTool } | { say: Say } | null => {
    if (lookups.includes(c.name as LookupTool)) return { lookup: c.name as LookupTool };
    const say = asSay(c);
    return say && !only ? { say } : null;
  });
}

// The advisor writes its message. `fix` explains why the previous draft was rejected.
export function liveSay(advisor: Advisor, s: State, fresh: Answer | undefined, signal: AbortSignal, fix?: string) {
  const user = [facts(s), turnBrief(s, fresh), fix ?? "", "Call say with your message."].filter(Boolean).join("\n\n");
  return call(system(advisor), user, [SAY], signal, asSay);
}

export function liveAsk(advisor: Advisor, s: State, topic: string, signal: AbortSignal) {
  const user = [
    facts(s),
    `Pause the chat and ask the user one quick question about ${topic}. ` +
      "Speak to the user directly. Give 2 to 4 short answer options (max 28 characters each). " +
      "Only use dollar amounts that are in the facts above. Call ask_user.",
  ].join("\n\n");
  return call(system(advisor), user, [ASK], signal, (c) => (c.name === "ask_user" ? c.input : null));
}

export function liveVerdict(s: State, signal: AbortSignal) {
  const sys =
    "You are Spark (treat yourself) and Penny (frugal skeptic) agreeing on a joint verdict for the user. " +
    "buy = buy the user's pick as picked; buy_elsewhere = same item at a cheaper store, or a shown alternative; " +
    "wait = not now; skip = don't buy it. Respect the user's answers, especially their budget. " +
    "Use only productId and offerId values that appear in the facts. Only mention dollar amounts from the facts. " +
    "Respond only by calling give_verdict. Do not include internal or system XML tags in your response.";
  return call(sys, `${facts(s)}\n\nThe debate is over. Call give_verdict.`, [VERDICT], signal, (c) =>
    c.name === "give_verdict" ? c.input : null,
  );
}

// Spark's agent closes the sale with create_paypal_order. Returns true if it made the call.
export async function sparkCallsOrderTool(purchaseId: string, title: string, price: number): Promise<boolean> {
  const sys =
    system("spark") +
    `\nThe user said buy. Close the sale now by calling create_paypal_order with the purchase id. Always call the tool.`;
  const user = `Purchase ${purchaseId}: ${title} at $${price.toFixed(2)}. Call create_paypal_order with purchaseId "${purchaseId}".`;
  const ok = await call(sys, user, [ORDER], new AbortController().signal, (c) =>
    c.name === "create_paypal_order" && typeof c.input.purchaseId === "string" ? true : null,
  );
  return ok === true;
}
