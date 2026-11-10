"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Advisor, Ask, Evidence, Offer, ProductCard, Stage, Verdict } from "@/lib/types";
import type { PixelState } from "@/components/pixel/sprites";
import { LINES, pickLine } from "@/data/lines";
import { api } from "./api";
import { readSSE } from "./sse";

// The debate stream turned into chat state, following the CONTRACTS.md character table.
// Events are applied strictly in order; each one is held on screen for a short, natural beat
// (so it reads like messaging) while later events keep buffering. Nothing is faked.

export type ChatItem =
  | { kind: "message"; id: string; from: Advisor; text: string }
  | { kind: "evidence"; id: string; evidence: Evidence }
  | { kind: "ask"; id: string; ask: Ask; answer?: string | null }
  | { kind: "you"; id: string; text: string };

// The character that pops into the chat instead of a typing indicator.
export type Pop = { advisor: Advisor; state: PixelState; line: string; key: number };

export type DebateStatus = "connecting" | "live" | "verdict" | "error" | "busy";

export type DebateState = {
  status: DebateStatus;
  debateId?: string;
  product?: ProductCard;
  picked?: Offer;
  items: ChatItem[];
  pop: Pop | null;
  huddle: string | null; // stage: verdict, both advisors thinking together
  moods: Record<Advisor, PixelState>;
  verdict?: Verdict;
  errorLine?: string;
};

const IDLE = { spark: "idle", penny: "idle" } as const;
const other = (a: Advisor): Advisor => (a === "spark" ? "penny" : "spark");

// Beats (ms) each event stays on screen before the next one is applied.
const BEAT = {
  start: 500,
  think: 1500,
  lookup: 1700,
  reaction: 1300,
  noReaction: 700,
  evidence: 1600,
  verdictStage: 1800,
};
const readTime = (text: string) => Math.min(1800, 500 + text.length * 10);

type Start = { debateId: string; product: ProductCard; picked: Offer };
type StageEv = { stage: Stage; advisor?: Advisor; label: string };
type MessageEv = { id: string; from: Advisor; text: string; reaction?: string; turn: number };

function verdictMoods(v: Verdict): Record<Advisor, PixelState> {
  return v.call === "buy" || v.call === "buy_elsewhere" ? { spark: "cheer", penny: "cheer" } : { spark: "sulk", penny: "cheer" };
}

export function useDebate(productId: string, offerId: string, initial: { product: ProductCard; picked: Offer }) {
  const [state, setState] = useState<DebateState>({ status: "connecting", items: [], pop: null, huddle: null, moods: IDLE, ...initial });
  const [run, setRun] = useState(0);
  const last = useRef<Record<string, string>>({});
  const popKey = useRef(0);

  const line = (advisor: Advisor, kind: PixelState) => {
    const k = `${advisor}.${kind}`;
    const l = pickLine(LINES[advisor][kind], last.current[k]);
    last.current[k] = l;
    return l;
  };

  useEffect(() => {
    const ctrl = new AbortController();
    const signal = ctrl.signal;
    const hold = (ms: number) => new Promise((r) => setTimeout(r, ms));
    // Items are appended only if their id isn't already shown.
    const set = (fn: (s: DebateState) => DebateState) => {
      if (!signal.aborted)
        setState((s) => {
          const next = fn(s);
          const seen = new Set<string>();
          const items = next.items.filter((it) => !seen.has(it.id) && seen.add(it.id));
          return items.length === next.items.length ? next : { ...next, items };
        });
    };
    const pop = (advisor: Advisor, st: PixelState, text: string): Pop => ({ advisor, state: st, line: text, key: ++popKey.current });
    const fail = (kind: "failed" | "busy") => {
      const errorLine = pickLine(LINES.errors[kind]);
      set((s) => ({ ...s, status: kind === "busy" ? "busy" : "error", pop: null, huddle: null, moods: { spark: "sulk", penny: "sulk" }, errorLine }));
    };

    (async () => {
      let res: Response;
      try {
        res = await api.debate(productId, offerId, signal);
      } catch {
        if (!signal.aborted) fail("failed");
        return;
      }
      if (res.status === 429) return fail("busy");
      if (!res.ok) return fail("failed");

      let finished = false;
      try {
        for await (const { event, data } of readSSE(res)) {
          if (signal.aborted) return;
          if (event === "start") {
            const d = data as Start;
            // A new stream is a new debate: start from an empty chat. React keeps state when this effect
            // re-runs (Fast Refresh, Strict Mode), so old items would otherwise show twice.
            set((s) => ({ ...s, items: [], pop: null, huddle: null, verdict: undefined, moods: IDLE, status: "live", debateId: d.debateId, product: d.product, picked: d.picked }));
            await hold(BEAT.start);
          } else if (event === "stage") {
            const d = data as StageEv;
            if (d.stage === "think" && d.advisor) {
              const a = d.advisor;
              const p = pop(a, "think", line(a, "think"));
              set((s) => ({ ...s, pop: p, moods: { [a]: "think", [other(a)]: "idle" } as DebateState["moods"] }));
              await hold(BEAT.think);
            } else if (d.stage === "lookup" && d.advisor) {
              const a = d.advisor;
              const p = pop(a, "lookup", d.label || line(a, "lookup"));
              set((s) => ({ ...s, pop: p, moods: { [a]: "lookup", [other(a)]: "idle" } as DebateState["moods"] }));
              await hold(BEAT.lookup);
            } else if (d.stage === "verdict") {
              set((s) => ({ ...s, pop: null, huddle: d.label || "Putting our heads together.", moods: { spark: "think", penny: "think" } }));
              await hold(BEAT.verdictStage);
            }
          } else if (event === "message") {
            const d = data as MessageEv;
            const a = d.from;
            const p = pop(a, "talk", d.reaction || line(a, "talk"));
            set((s) => ({ ...s, pop: p, moods: { [a]: "talk", [other(a)]: "idle" } as DebateState["moods"] }));
            await hold(d.reaction ? BEAT.reaction : BEAT.noReaction);
            set((s) => ({ ...s, pop: null, moods: IDLE, items: [...s.items, { kind: "message", id: d.id, from: a, text: d.text }] }));
            await hold(readTime(d.text));
          } else if (event === "evidence") {
            const d = data as Evidence & { id: string };
            set((s) => ({ ...s, items: [...s.items, { kind: "evidence", id: d.id, evidence: d }] }));
            await hold(BEAT.evidence);
          } else if (event === "ask") {
            const d = data as Ask;
            const p = pop(d.from, "ask", line(d.from, "ask"));
            set((s) => ({
              ...s,
              pop: p,
              moods: { [d.from]: "ask", [other(d.from)]: "idle" } as DebateState["moods"],
              items: [...s.items, { kind: "ask", id: d.askId, ask: d }],
            }));
          } else if (event === "answer") {
            const d = data as { askId: string; answer: string | null };
            // Already shown if the user tapped here; this covers the 90 s timeout.
            set((s) => ({
              ...s,
              pop: s.pop?.state === "ask" ? null : s.pop,
              items: s.items.map((it) => (it.kind === "ask" && it.id === d.askId && it.answer === undefined ? { ...it, answer: d.answer } : it)),
            }));
          } else if (event === "verdict") {
            const v = data as Verdict;
            finished = true;
            set((s) => ({ ...s, status: "verdict", verdict: v, pop: null, huddle: null, moods: verdictMoods(v) }));
          } else if (event === "error") {
            finished = true;
            fail("failed");
          }
        }
      } catch {
        if (signal.aborted) return;
      }
      if (!finished && !signal.aborted) fail("failed");
    })();

    return () => ctrl.abort();
    // `run` restarts the debate on retry.
  }, [productId, offerId, run]);

  const answer = useCallback(
    (ask: Ask, choice: string) => {
      setState((s) => {
        if (!s.debateId) return s;
        const item = s.items.find((it) => it.kind === "ask" && it.id === ask.askId);
        if (!item || (item.kind === "ask" && item.answer !== undefined)) return s;
        return {
          ...s,
          pop: null,
          moods: IDLE,
          items: [
            ...s.items.map((it) => (it.kind === "ask" && it.id === ask.askId ? { ...it, answer: choice } : it)),
            { kind: "you" as const, id: `you-${ask.askId}`, text: choice },
          ],
        };
      });
      if (state.debateId) api.answer(state.debateId, ask.askId, choice).catch(() => {});
    },
    [state.debateId],
  );

  const retry = useCallback(() => {
    setState({ status: "connecting", items: [], pop: null, huddle: null, moods: IDLE, ...initial });
    setRun((r) => r + 1);
  }, [initial]);

  return { state, answer, retry };
}
