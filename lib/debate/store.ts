import type { Ask, Verdict } from "@/lib/types";

// In-memory debates (single Render instance). A debate holds the user's pick, its open asks
// (each with the resolver the paused stream is waiting on) and, at the end, the verdict.

export type PendingAsk = {
  ask: Ask;
  answered: boolean;
  resolve: (answer: string | null) => void;
};

export type Debate = {
  debateId: string;
  productId: string;
  offerId: string;
  asks: Map<string, PendingAsk>;
  verdict?: Verdict;
};

const TTL_MS = 3 * 60 * 60 * 1000; // long enough to buy after the verdict

const g = globalThis as unknown as { __debates?: Map<string, Debate> };
const debates = (g.__debates ??= new Map<string, Debate>());

export function createDebate(productId: string, offerId: string): Debate {
  const debate: Debate = { debateId: crypto.randomUUID(), productId, offerId, asks: new Map() };
  debates.set(debate.debateId, debate);
  setTimeout(() => debates.delete(debate.debateId), TTL_MS).unref?.();
  return debate;
}

export function getDebate(debateId: string): Debate | undefined {
  return debates.get(debateId);
}

export function deleteDebate(debateId: string): void {
  const d = debates.get(debateId);
  if (!d) return;
  for (const p of d.asks.values()) if (!p.answered) p.resolve(null); // release a paused stream
  debates.delete(debateId);
}

// Registers an ask and returns the promise the stream awaits. Resolved by answerAsk or by expireAsk.
export function openAsk(debate: Debate, ask: Ask): Promise<string | null> {
  return new Promise((resolve) => {
    debate.asks.set(ask.askId, { ask, answered: false, resolve });
  });
}

export type AnswerResult = "ok" | "not_found" | "already_answered" | "not_an_option";

export function answerAsk(debateId: string, askId: string, answer: string): AnswerResult {
  const pending = debates.get(debateId)?.asks.get(askId);
  if (!pending) return "not_found";
  if (pending.answered) return "already_answered";
  if (!pending.ask.options.includes(answer)) return "not_an_option";
  pending.answered = true;
  pending.resolve(answer);
  return "ok";
}

// The 90 s timeout: counts as answered (with null) so a late tap gets 409.
export function expireAsk(debate: Debate, askId: string): void {
  const pending = debate.asks.get(askId);
  if (!pending || pending.answered) return;
  pending.answered = true;
  pending.resolve(null);
}
