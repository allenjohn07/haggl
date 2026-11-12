"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Advisor, Ask, Evidence, Offer, ProductCard, Stage, Verdict } from "@/lib/types";
import type { PixelState } from "@/components/pixel/sprites";
import { ACKS, LINES, pickLine } from "@/data/lines";
import { api } from "./api";
import { sounds } from "./sounds";
import { readSSE } from "./sse";

// The debate stream turned into stage state, following the CONTRACTS.md character table.
// Events are applied strictly in order; each one is held on screen for a beat long enough to read
// (only one line per advisor is visible at a time) while later events keep buffering. Nothing is faked.

// The full history, for the transcript (and the verdict's store lookup).
export type ChatItem =
  | { kind: "message"; id: string; from: Advisor; text: string; reaction?: string }
  | { kind: "evidence"; id: string; evidence: Evidence }
  | { kind: "ask"; id: string; ask: Ask; answer?: string | null }; // answer null: no answer in time

// What an advisor's speech bubble shows right now.
// say: a message. ask: a question for the user. work: the think/lookup pop-in line. react: a quick reaction.
export type Line = { key: number; kind: "say" | "ask" | "work" | "react"; text: string };

export type DebateStatus = "connecting" | "live" | "verdict" | "error" | "busy";

export type DebateState = {
  status: DebateStatus;
  debateId?: string;
  product?: ProductCard;
  picked?: Offer;
  items: ChatItem[];
  lines: Record<Advisor, Line | null>;
  moods: Record<Advisor, PixelState>;
  evidence: (Evidence & { id: string }) | null; // stays until the next evidence or the verdict
  ask: Ask | null; // the open question, while it waits for an answer
  you: { key: number; text: string } | null; // the user's answer, shown briefly as a chip
  huddle: string | null; // stage: verdict, both advisors thinking together
  verdict?: Verdict;
  errorLine?: string;
};

const IDLE = { spark: "idle", penny: "idle" } as const;
const NO_LINES = { spark: null, penny: null };
const other = (a: Advisor): Advisor => (a === "spark" ? "penny" : "spark");
const fresh = (initial: { product: ProductCard; picked: Offer }): DebateState => ({
  status: "connecting",
  items: [],
  lines: NO_LINES,
  moods: IDLE,
  evidence: null,
  ask: null,
  you: null,
  huddle: null,
  ...initial,
});

// Beats (ms) each event stays on screen before the next one is applied.
const BEAT = {
  start: 500,
  think: 1500,
  lookup: 1800,
  evidence: 2000,
  answered: 1400,
  verdictStage: 1800,
};
// One line visible at a time, so it has to stay long enough to read: about 30 ms a character.
const readTime = (text: string) => Math.min(6500, 900 + text.length * 30);
const reactTime = (text: string) => Math.min(2400, 900 + text.length * 25);

type Start = { debateId: string; product: ProductCard; picked: Offer };
type StageEv = { stage: Stage; advisor?: Advisor; label: string };
type MessageEv = { id: string; from: Advisor; text: string; reaction?: string; turn: number };

function verdictMoods(v: Verdict): Record<Advisor, PixelState> {
  return v.call === "buy" || v.call === "buy_elsewhere" ? { spark: "cheer", penny: "cheer" } : { spark: "sulk", penny: "cheer" };
}

export function useDebate(productId: string, offerId: string, initial: { product: ProductCard; picked: Offer }, compareId?: string) {
  const [state, setState] = useState<DebateState>(() => fresh(initial));
  const [run, setRun] = useState(0);
  const last = useRef<Record<string, string>>({});
  const lineKey = useRef(0);
  const answeredHere = useRef(new Set<string>());

  const pick = (k: string, pool: string[]) => {
    const l = pickLine(pool, last.current[k]);
    last.current[k] = l;
    return l;
  };
  const line = (kind: Line["kind"], text: string): Line => ({ key: ++lineKey.current, kind, text });

  useEffect(() => {
    const ctrl = new AbortController();
    const signal = ctrl.signal;
    const hold = (ms: number) => new Promise((r) => setTimeout(r, ms));
    // Items are appended only if their id isn't already in the history.
    const set = (fn: (s: DebateState) => DebateState) => {
      if (!signal.aborted)
        setState((s) => {
          const next = fn(s);
          const seen = new Set<string>();
          const items = next.items.filter((it) => !seen.has(it.id) && seen.add(it.id));
          return items.length === next.items.length ? next : { ...next, items };
        });
    };
    const moods = (a: Advisor, st: PixelState, o: PixelState = "idle") => ({ [a]: st, [other(a)]: o }) as DebateState["moods"];
    // When an advisor starts working, the other keeps their last message (the point being answered), not a passing reaction.
    const keepSaid = (l: Line | null) => (l?.kind === "say" ? l : null);
    const fail = (kind: "failed" | "busy") => {
      sounds.error();
      const errorLine = pickLine(LINES.errors[kind]);
      set((s) => ({ ...s, status: kind === "busy" ? "busy" : "error", lines: NO_LINES, ask: null, huddle: null, moods: { spark: "sulk", penny: "sulk" }, errorLine }));
    };

    (async () => {
      let res: Response;
      try {
        res = await api.debate(productId, offerId, signal, compareId);
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
            // A new stream is a new debate: start from an empty history. React keeps state when this effect
            // re-runs (Fast Refresh, Strict Mode), so old items would otherwise show twice.
            set((s) => ({ ...fresh({ product: d.product, picked: d.picked }), status: "live", debateId: d.debateId, errorLine: s.errorLine }));
            await hold(BEAT.start);
          } else if (event === "stage") {
            const d = data as StageEv;
            if ((d.stage === "think" || d.stage === "lookup") && d.advisor) {
              const a = d.advisor;
              const kind = d.stage;
              const text = kind === "think" ? pick(`${a}.think`, LINES[a].think) : d.label || pick(`${a}.lookup`, LINES[a].lookup);
              const l = line("work", text);
              set((s) => ({ ...s, you: null, lines: { [a]: l, [other(a)]: keepSaid(s.lines[other(a)]) } as DebateState["lines"], moods: moods(a, kind) }));
              await hold(kind === "think" ? BEAT.think : BEAT.lookup);
            } else if (d.stage === "verdict") {
              set((s) => ({ ...s, you: null, lines: NO_LINES, huddle: d.label || "Putting our heads together.", moods: { spark: "think", penny: "think" } }));
              await hold(BEAT.verdictStage);
            }
          } else if (event === "message") {
            const d = data as MessageEv;
            const a = d.from;
            // Their reaction to the other's last point lands first, while that point is still on screen.
            if (d.reaction) {
              const r = line("react", d.reaction);
              set((s) => ({ ...s, lines: { ...s.lines, [a]: r }, moods: moods(a, "talk") }));
              await hold(reactTime(d.reaction));
            }
            sounds.say(a);
            const l = line("say", d.text);
            set((s) => ({
              ...s,
              you: null,
              lines: { ...s.lines, [a]: l },
              moods: moods(a, "talk"),
              items: [...s.items, { kind: "message", id: d.id, from: a, text: d.text, reaction: d.reaction || undefined }],
            }));
            await hold(readTime(d.text));
            // Done talking: step back, but the line stays up until they speak again.
            set((s) => (s.lines[a]?.key === l.key && s.moods[a] === "talk" ? { ...s, moods: { ...s.moods, [a]: "idle" } } : s));
          } else if (event === "evidence") {
            const d = data as Evidence & { id: string };
            set((s) => ({ ...s, evidence: d, items: [...s.items, { kind: "evidence", id: d.id, evidence: d }] }));
            await hold(BEAT.evidence);
          } else if (event === "ask") {
            const d = data as Ask;
            sounds.ask();
            const l = line("ask", d.question);
            set((s) => ({
              ...s,
              ask: d,
              you: null,
              lines: { [d.from]: l, [other(d.from)]: null } as DebateState["lines"],
              moods: moods(d.from, "ask"),
              items: [...s.items, { kind: "ask", id: d.askId, ask: d }],
            }));
          } else if (event === "answer") {
            const d = data as { askId: string; answer: string | null };
            if (answeredHere.current.has(d.askId)) {
              // The user tapped: give their answer and the reactions a moment before the debate carries on.
              await hold(BEAT.answered);
            } else {
              // The 90 s timeout: the question closes with no answer.
              set((s) => ({
                ...s,
                ask: s.ask?.askId === d.askId ? null : s.ask,
                you: { key: ++lineKey.current, text: d.answer ?? "No answer" },
                lines: NO_LINES,
                moods: IDLE,
                items: s.items.map((it) => (it.kind === "ask" && it.id === d.askId && it.answer === undefined ? { ...it, answer: d.answer } : it)),
              }));
              await hold(BEAT.answered);
            }
          } else if (event === "verdict") {
            const v = data as Verdict;
            finished = true;
            sounds.verdict();
            const vm = verdictMoods(v);
            const said = (a: Advisor) => line("react", pick(`${a}.${vm[a]}`, LINES[a][vm[a]]));
            set((s) => ({ ...s, status: "verdict", verdict: v, evidence: null, huddle: null, you: null, lines: { spark: said("spark"), penny: said("penny") }, moods: vm }));
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
  }, [productId, offerId, compareId, run]);

  const answer = useCallback(
    (ask: Ask, choice: string) => {
      if (!state.debateId || state.ask?.askId !== ask.askId) return;
      answeredHere.current.add(ask.askId);
      sounds.answer();
      const ack = (a: Advisor) => line("react", pick(`${a}.ack`, ACKS[a]));
      const spark = ack("spark");
      const penny = ack("penny");
      const you = { key: ++lineKey.current, text: choice };
      setState((s) => {
        if (s.ask?.askId !== ask.askId) return s;
        return {
          ...s,
          ask: null,
          you,
          lines: { spark, penny },
          moods: IDLE,
          items: s.items.map((it) => (it.kind === "ask" && it.id === ask.askId ? { ...it, answer: choice } : it)),
        };
      });
      api.answer(state.debateId, ask.askId, choice).catch(() => {});
    },
    [state.debateId, state.ask],
  );

  const retry = useCallback(() => {
    setState(fresh(initial));
    setRun((r) => r + 1);
  }, [initial]);

  return { state, answer, retry };
}
