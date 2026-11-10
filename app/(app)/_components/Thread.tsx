"use client";

import { useEffect, useRef } from "react";
import type { Advisor, Ask } from "@/lib/types";
import { useReducedMotion } from "@/components/pixel/useReducedMotion";
import type { DebateState } from "../_lib/useDebate";
import { AskCard, EvidenceCard, Huddle, MessageBubble, Elsewhere, PopSlot, YouLine, type Side } from "./ChatParts";

// One conversation. `owner` set = that advisor's own screen (own messages on the right).
// `owner` null = the phone thread: Spark on the left, Penny on the right.
export function Thread({
  state,
  owner,
  live,
  onAnswer,
}: {
  state: DebateState;
  owner: Advisor | null;
  live: boolean;
  onAnswer: (ask: Ask, answer: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const side = (a: Advisor): Side => (owner ? (a === owner ? "right" : "left") : a === "spark" ? "left" : "right");
  const own = (a: Advisor) => (owner ? a === owner : true);

  const pop = state.pop;
  const popHere = pop && (!owner || pop.advisor === owner) ? pop : null;
  const peekHere = pop && owner && pop.advisor !== owner ? pop : null;

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [state.items.length, pop?.key, state.huddle, reduced]);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div ref={ref} className={`scroll-quiet h-full overflow-y-auto px-4 pt-3 sm:px-5 ${state.status === "verdict" ? "pb-20" : "pb-6"}`}>
        <div className={`mx-auto flex flex-col gap-3 ${owner ? "max-w-[640px]" : "max-w-3xl"}`}>
          <div className="flex items-center gap-3 py-1 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border-soft" />
            {state.status === "connecting" ? "Sending your pick to Spark and Penny" : "Today"}
            <span className="h-px flex-1 bg-border-soft" />
          </div>
          {state.items.map((it, i) => {
            if (it.kind === "message") {
              const prev = state.items[i - 1];
              const showName = !(prev?.kind === "message" && prev.from === it.from);
              return <MessageBubble key={it.id} from={it.from} text={it.text} side={side(it.from)} own={own(it.from)} showName={showName} />;
            }
            if (it.kind === "evidence") return <EvidenceCard key={it.id} evidence={it.evidence} side={side(it.evidence.from)} />;
            if (it.kind === "ask")
              return <AskCard key={it.id} ask={it.ask} answer={it.answer} side={side(it.ask.from)} onAnswer={(a) => onAnswer(it.ask, a)} />;
            return <YouLine key={it.id} text={it.text} />;
          })}
          <PopSlot pop={popHere} sideOf={side} live />
          {peekHere && <Elsewhere key={peekHere.advisor} who={peekHere.advisor} side={side(peekHere.advisor)} />}
          {state.huddle && <Huddle line={state.huddle} live={live} />}
        </div>
      </div>
    </div>
  );
}
