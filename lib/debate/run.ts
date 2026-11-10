import { toCard } from "@/lib/products";
import type { Advisor, Ask, Evidence, Offer, Product, ProductCard, Stage, Verdict } from "@/lib/types";
import { liveAsk, liveSay, liveStep, liveVerdict, type Say } from "./agents";
import { between, scriptedAsk, scriptedLookup, scriptedReaction, scriptedSay, sleep } from "./mock";
import {
  ASK_AFTER, MAX_MESSAGES, NAMES, REACTION_MAX, TEXT_MAX, clip, cleanAsk, dropUnbacked, knownPrices, ruleVerdict,
  unbackedAmounts, validateVerdict, type Answer, type Message, type State,
} from "./rules";
import { deleteDebate, expireAsk, openAsk, type Debate } from "./store";
import { lookupLabel, runLookup, type LookupTool } from "./tools";

// The debate as an async generator of SSE events (docs/CONTRACTS.md). The route streams it;
// scripts/debate.ts runs it in-process.

export type DebateEvent =
  | { event: "start"; data: { debateId: string; product: ProductCard; picked: Offer } }
  | { event: "stage"; data: { stage: Stage; advisor?: Advisor; label: string } }
  | { event: "message"; data: Message }
  | { event: "evidence"; data: Evidence & { id: string } }
  | { event: "ask"; data: Ask }
  | { event: "answer"; data: { askId: string; answer: string | null } }
  | { event: "verdict"; data: Verdict }
  | { event: "error"; data: { message: string } }
  | { event: "done"; data: Record<string, never> }
  | { event: "ping" }; // SSE keep-alive comment while waiting on the user

export const ANSWER_TIMEOUT_MS = 90_000;
const PING_MS = 15_000;

type Options = { signal: AbortSignal; pace?: number }; // pace 0 = no artificial delays (scripts)

export async function* runDebate(debate: Debate, product: Product, picked: Offer, opts: Options): AsyncGenerator<DebateEvent> {
  try {
    yield* debateLoop(debate, product, picked, opts);
  } catch (err) {
    console.warn(`[debate] unexpected failure: ${err instanceof Error ? err.name : "unknown"}`);
    yield { event: "error", data: { message: "Spark and Penny lost their train of thought. One more try?" } };
  } finally {
    if (!debate.verdict) deleteDebate(debate.debateId); // disconnected or failed: nothing to buy later
  }
  yield { event: "done", data: {} };
}

async function* debateLoop(debate: Debate, product: Product, picked: Offer, { signal, pace = 1 }: Options): AsyncGenerator<DebateEvent> {
  const s: State = {
    debate, product, picked, evidence: [], messages: [], answers: [], alternatives: [],
    used: { check_prices: false, find_alternatives: false, look_closer: false },
  };
  // Live AI until a call fails twice (attempt + retry); then the rest of this debate is scripted.
  let ai = process.env.AI_MODE === "live";
  const isMock = !ai;

  // Keeps each step on screen long enough for the pixel characters (counts time already spent).
  const padFrom = (t0: number, min: number, max: number) => sleep(Math.max(0, between(min, max) * pace - (Date.now() - t0)), signal);
  const think = (advisor: Advisor, label = `${NAMES[advisor]} is thinking`): DebateEvent => ({ event: "stage", data: { stage: "think", advisor, label } });

  yield { event: "start", data: { debateId: debate.debateId, product: toCard(product), picked } };

  function allowedLookups(advisor: Advisor): LookupTool[] {
    if (advisor === "penny" && !s.used.check_prices) return ["check_prices"]; // Penny's first turn, always
    const out: LookupTool[] = [];
    if (!s.used.find_alternatives) out.push("find_alternatives");
    if (advisor === "spark" && !s.used.look_closer) out.push("look_closer");
    return out;
  }

  async function* lookup(advisor: Advisor, tool: LookupTool): AsyncGenerator<DebateEvent> {
    yield { event: "stage", data: { stage: "lookup", advisor, label: lookupLabel(tool, s) } };
    const t0 = Date.now();
    const ev = await runLookup(tool, s, advisor);
    await padFrom(t0, 1000, 2000);
    if (ev) {
      const withId = { ...ev, id: `ev-${s.evidence.length + 1}` };
      s.evidence.push(withId);
      yield { event: "evidence", data: withId };
    }
  }

  async function* turn(advisor: Advisor, fresh?: Answer): AsyncGenerator<DebateEvent> {
    const n = s.messages.length + 1;
    yield think(advisor);
    let t0 = Date.now();
    let say: Say | null = null;

    // 1. Maybe a real lookup first.
    const allowed = allowedLookups(advisor);
    if (allowed.length) {
      let tool: LookupTool | null = null;
      if (ai) {
        const step = await liveStep(advisor, s, allowed, fresh, signal);
        if (!step) ai = false;
        else if ("lookup" in step) tool = step.lookup;
        else say = step.say;
      }
      if (!ai) tool = scriptedLookup(advisor, s, allowed);
      if (allowed[0] === "check_prices") tool = "check_prices";
      if (tool) {
        yield* lookup(advisor, tool);
        say = null; // speak with the new evidence in hand
        yield think(advisor);
        t0 = Date.now();
      }
    }
    if (signal.aborted) return;

    // 2. The message.
    if (!say && ai) {
      say = await liveSay(advisor, s, fresh, signal);
      if (!say) ai = false;
    }
    say ??= scriptedSay(advisor, s, fresh);

    // 3. No invented prices: re-prompt once, then drop the offending sentences.
    const known = knownPrices(s);
    let text = clip(say.text, TEXT_MAX);
    const bad = unbackedAmounts(text, known);
    if (bad.length && ai) {
      const fix = `Your draft mentioned ${bad.map((b) => `$${b}`).join(", ")}, which is not in the facts. Rewrite it using only prices from the facts.`;
      const retry = await liveSay(advisor, s, fresh, signal, fix);
      if (!retry) ai = false;
      else if (!unbackedAmounts(retry.text, known).length) text = clip(retry.text, TEXT_MAX);
    }
    if (unbackedAmounts(text, known).length) text = dropUnbacked(text, known);
    if (!text) text = dropUnbacked(clip(scriptedSay(advisor, s, fresh).text, TEXT_MAX), known) || "Hmm. Let me think about that one.";

    let reaction: string | undefined;
    if (n > 1) {
      reaction = clip(say.reaction || scriptedReaction(advisor, s), REACTION_MAX);
      if (unbackedAmounts(reaction, known).length) reaction = scriptedReaction(advisor, s);
    }

    await padFrom(t0, isMock ? 1500 : 1000, isMock ? 3000 : 1500);
    if (signal.aborted) return;
    const message: Message = { id: `m-${n}`, from: advisor, text, reaction, turn: n };
    s.messages.push(message);
    yield { event: "message", data: message };
  }

  async function* askUser(advisor: Advisor, topic: string): AsyncGenerator<DebateEvent, Answer | undefined> {
    yield think(advisor, `${NAMES[advisor]} has a question for you`);
    const t0 = Date.now();
    let q = null;
    if (ai) {
      const raw = await liveAsk(advisor, s, topic, signal);
      if (!raw) ai = false;
      q = cleanAsk(raw);
      const known = knownPrices(s);
      if (q && [q.question, ...q.options].some((x) => unbackedAmounts(x, known).length)) q = null;
    }
    q ??= scriptedAsk(advisor, s);
    await padFrom(t0, 800, 1500);

    const ask: Ask = { askId: `ask-${s.answers.length + 1}`, from: advisor, ...q };
    const answered = openAsk(debate, ask);
    yield { event: "ask", data: ask };
    yield { event: "stage", data: { stage: "waiting_user", advisor, label: "Waiting for your answer" } };

    // Wait for POST /api/debate/answer, pinging every 15 s, up to 90 s.
    const deadline = Date.now() + ANSWER_TIMEOUT_MS;
    let answer: string | null | undefined;
    while (answer === undefined) {
      const tick = sleep(Math.min(PING_MS, Math.max(0, deadline - Date.now())), signal).then(() => undefined);
      answer = await Promise.race([answered, tick]);
      if (signal.aborted) return undefined;
      if (answer !== undefined) break;
      if (Date.now() >= deadline) {
        expireAsk(debate, ask.askId);
        answer = await answered; // null, unless an answer won the race at the last moment
      } else yield { event: "ping" };
    }

    const a: Answer = { askId: ask.askId, from: advisor, question: ask.question, answer };
    s.answers.push(a);
    yield { event: "answer", data: { askId: ask.askId, answer } };
    return a;
  }

  const TOPIC: Record<Advisor, string> = {
    penny: "their budget for this, or whether they need it or just want it",
    spark: "how often they would use it, or whether it can wait",
  };

  let fresh: Answer | undefined;
  for (let n = 1; n <= MAX_MESSAGES; n++) {
    yield* turn(n % 2 === 1 ? "spark" : "penny", fresh);
    fresh = undefined;
    const asker = ASK_AFTER[n];
    if (asker) fresh = yield* askUser(asker, TOPIC[asker]);
    if (signal.aborted) return;
  }

  // The joint verdict: price and savings always recomputed from the stored offers.
  yield { event: "stage", data: { stage: "verdict", label: "Spark and Penny are agreeing on a verdict" } };
  const t0 = Date.now();
  const raw = ai ? await liveVerdict(s, signal) : null;
  const verdict = validateVerdict(raw, s) ?? ruleVerdict(s);
  await padFrom(t0, 1500, 2500);
  if (signal.aborted) return;
  debate.verdict = verdict;
  yield { event: "verdict", data: verdict };
}
