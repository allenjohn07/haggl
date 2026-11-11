import { toCard } from "@/lib/products";
import type { Advisor, Ask, Evidence, Offer, Product, ProductCard, Stage, Verdict } from "@/lib/types";
import { liveAsk, liveSay, liveStep, liveVerdict, type Say } from "./agents";
import { between, scriptedAsk, scriptedLookup, scriptedReaction, scriptedSay, sleep } from "./mock";
import {
  ASK_AFTER, MAX_MESSAGES, NAMES, OPTION_MAX, QUESTION_MAX, REACTION_MAX, TEXT_MAX, TEXT_SOFT, cleanAsk, dropSentencesWith, dropUnbacked, knownPrices,
  mentionsAlternative, opener, overusedAmounts, ruleVerdict, trimSentences, unbackedAmounts, validateVerdict,
  type Answer, type Message, type State,
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

  // Penny's lookups are forced: the price check on her first turn, alternatives on her second.
  // Spark may take a closer look once, if the AI wants to.
  function allowedLookups(advisor: Advisor): LookupTool[] {
    if (advisor === "penny") {
      if (!s.used.check_prices) return ["check_prices"];
      if (!s.used.find_alternatives) return ["find_alternatives"];
      return [];
    }
    return s.used.look_closer ? [] : ["look_closer"];
  }

  // What is wrong with a draft message, as instructions for one rewrite.
  // `needsAlt`: Penny just found alternatives, or Spark is answering them, so the message must name one.
  function problems(n: number, say: Say, known: number[], needsAlt: boolean): string[] {
    const out: string[] = [];
    const bad = unbackedAmounts(say.text, known);
    if (bad.length) out.push(`It mentions ${bad.map((b) => `$${b}`).join(", ")}, which is not in the facts. Use only prices from the facts.`);
    if (say.text.trim().length > TEXT_MAX) out.push(`It is ${say.text.trim().length} characters. Keep it under ${TEXT_SOFT}, never over ${TEXT_MAX}.`);
    const worn = overusedAmounts(say.text, s);
    if (worn.length) out.push(`It repeats ${worn.map((b) => `$${b}`).join(", ")}, already said twice. Make a new point instead.`);
    if (needsAlt && !mentionsAlternative(say.text, s)) out.push("It doesn't name the cheaper alternative Penny found. Mention it by name or price.");
    if (n > 1 && reactionIssue(say.reaction)) out.push(`The reaction must be max ${REACTION_MAX} characters and start with a word no earlier reaction started with (and not "Fair").`);
    return out;
  }

  function reactionIssue(reaction: string): boolean {
    const r = reaction.trim();
    if (!r || r.length > REACTION_MAX) return true;
    const first = opener(r);
    return first === "fair" || s.messages.some((m) => m.reaction && opener(m.reaction) === first);
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
    const forced = advisor === "penny" && allowed.length > 0;
    let altsFresh = false;
    if (allowed.length) {
      let tool: LookupTool | null = null;
      if (ai) {
        const step = await liveStep(advisor, s, allowed, forced, fresh, signal);
        if (!step) ai = false;
        else if ("lookup" in step) tool = step.lookup;
        else say = step.say;
      }
      if (!ai) tool = scriptedLookup(advisor, s, allowed);
      if (forced) tool = allowed[0]; // the server runs it even if the AI didn't
      if (tool) {
        yield* lookup(advisor, tool);
        altsFresh = tool === "find_alternatives" && s.alternatives.length > 0;
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

    // 3. The rules: no invented prices, max 200 characters, no price said a third time, Penny's
    // alternative named, fresh reactions. Re-prompt once with every problem, then fix in code.
    const known = knownPrices(s);
    const needsAlt = altsFresh || (advisor === "spark" && n === 5 && s.alternatives.length > 0);
    const issues = problems(n, say, known, needsAlt);
    if (issues.length && ai) {
      const fix = `Your draft was: "${say.text}" (reaction: "${say.reaction}"). Rewrite it. Problems:\n- ${issues.join("\n- ")}`;
      const retry = await liveSay(advisor, s, fresh, signal, fix);
      if (!retry) ai = false;
      else if (problems(n, retry, known, needsAlt).length <= issues.length && !unbackedAmounts(retry.text, known).length) say = retry;
    }
    let text = say.text.replace(/\s+/g, " ").trim();
    if (unbackedAmounts(text, known).length) text = dropUnbacked(text, known);
    if (overusedAmounts(text, s).length) text = dropSentencesWith(text, (x) => overusedAmounts(x, s).length > 0) || text;
    text = trimSentences(text, TEXT_MAX);
    // Over the 160 target: drop trailing sentences if a full thought of 100+ characters is left.
    const tight = trimSentences(text, TEXT_SOFT);
    const keepsAlt = !needsAlt || mentionsAlternative(tight, s);
    if (text.length > TEXT_SOFT && tight.length >= 100 && !tight.endsWith("…") && keepsAlt) text = tight;
    if (!text) text = dropUnbacked(trimSentences(scriptedSay(advisor, s, fresh).text, TEXT_MAX), known) || "Hmm. Let me think about that one.";

    let reaction: string | undefined;
    if (n > 1) {
      reaction = say.reaction.trim();
      if (reactionIssue(reaction) || unbackedAmounts(reaction, known).length) reaction = scriptedReaction(advisor, s);
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
    // Short question, short chips, no invented prices: one rewrite, then a scripted ask.
    const known = knownPrices(s);
    const ok = (raw: unknown) => {
      const c = cleanAsk(raw);
      return c && ![c.question, ...c.options].some((x) => unbackedAmounts(x, known).length) ? c : null;
    };
    if (ai) {
      const raw = await liveAsk(advisor, s, topic, signal);
      if (!raw) ai = false;
      else if (!(q = ok(raw))) {
        const fix = `Your draft was ${JSON.stringify(raw)}. Rewrite it: question max ${QUESTION_MAX} characters, 2 to 4 options of max ${OPTION_MAX} characters each, only prices from the facts.`;
        q = ok(await liveAsk(advisor, s, topic, signal, fix));
      }
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
