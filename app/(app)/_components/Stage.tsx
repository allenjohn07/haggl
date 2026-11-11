"use client";

import { useEffect, useState } from "react";
import type { Advisor, Ask } from "@/lib/types";
import { Pixel } from "@/components/pixel/Pixel";
import type { PixelState } from "@/components/pixel/sprites";
import { Button } from "@/components/ui/button";
import type { DebateState, Line } from "../_lib/useDebate";
import { Dot, EvidenceCard, NAME, ROLE } from "./ChatParts";

// The face-off stage: Spark (left) and Penny (right) face each other. Each has one speech bubble above
// their head; a new line crossfades over the old one, so it reads as a back-and-forth, not a log.
// Evidence slides in under them; an open question puts its options under the stage.

const WHO = ["spark", "penny"] as const;
const ACTIVE: PixelState[] = ["think", "lookup", "talk", "ask", "cheer", "pay"];

// Keeps the previous value around for a moment, so it can fade out while the new one fades in.
function useLeaving<T extends { key: number }>(current: T | null): T | null {
  const [seen, setSeen] = useState<T | null>(current);
  const [leaving, setLeaving] = useState<T | null>(null);
  if (current !== seen) {
    setLeaving(seen && seen.key !== current?.key ? seen : null);
    setSeen(current);
  }
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setLeaving(null), 170);
    return () => clearTimeout(t);
  }, [leaving]);
  return leaving;
}

// One speech bubble. say and ask are the advisor's real words; work and react are small and muted.
function Bubble({ who, line, newest, wide, leaving = false }: { who: Advisor; line: Line; newest: boolean; wide: boolean; leaving?: boolean }) {
  const big = line.kind === "say" || line.kind === "ask";
  const tail = wide ? "left-[calc(50%-5px)]" : who === "spark" ? "left-[88px]" : "right-[88px]";
  const place = wide ? "" : who === "spark" ? "self-start" : "self-end";
  return (
    <div
      aria-hidden={leaving || undefined}
      className={`${leaving ? `anim-bubble-out pointer-events-none absolute ${wide ? "bottom-4" : "bottom-0"}` : "anim-bubble-in relative"} ${
        wide ? "" : who === "spark" ? "left-0" : "right-0"
      } ${place} ${big ? "w-fit max-w-[36ch] min-w-[8.5rem]" : "w-fit max-w-[30ch] min-w-[7.5rem]"} rounded-lg border border-border ${
        big ? "bg-surface-2 px-3.5 py-2.5" : "bg-surface px-3 py-1.5"
      } ${newest || !big ? "" : "opacity-80"}`}
    >
      {big && (
        <p className="mb-1 flex items-center gap-1.5 text-[12px] font-medium">
          <Dot who={who} />
          <span className={who === "spark" ? "text-spark" : "text-penny"}>{NAME[who]}</span>
          {line.kind === "ask" && <span className="font-normal text-muted-foreground">asks you</span>}
        </p>
      )}
      <p
        className={
          big
            ? `text-[15px] leading-[1.5] ${newest ? "text-foreground" : "text-text-2"} ${!wide && !newest ? "line-clamp-3" : ""} ${
                line.kind === "ask" ? "font-medium" : ""
              }`
            : "text-[13px] leading-snug text-muted-foreground"
        }
      >
        {line.text}
      </p>
      <span
        aria-hidden
        className={`absolute -bottom-[5px] ${tail} size-2.5 rotate-45 border-r border-b border-border ${big ? "bg-surface-2" : "bg-surface"}`}
      />
    </div>
  );
}

function BubbleSlot({ who, line, newest, wide }: { who: Advisor; line: Line | null; newest: boolean; wide: boolean }) {
  const leaving = useLeaving(line);
  return (
    <>
      {leaving && <Bubble key={leaving.key} who={who} line={leaving} newest={false} wide={wide} leaving />}
      {line && <Bubble key={line.key} who={who} line={line} newest={newest} wide={wide} />}
    </>
  );
}

// A sprite on the floor: a soft spotlight in their colour, stepping toward the other when talking.
function Actor({ who, mood, scale }: { who: Advisor; mood: PixelState; scale: number }) {
  const active = ACTIVE.includes(mood);
  const dir = who === "spark" ? 1 : -1;
  const step = mood === "talk" ? `translateX(${dir * scale * 3}px)` : mood === "ask" ? `translateY(-${scale * 2}px)` : "none";
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex flex-col items-center">
        <span
          aria-hidden
          className={`absolute -bottom-1 h-3 rounded-[50%] transition-opacity duration-300 ${who === "spark" ? "bg-spark" : "bg-penny"} ${
            active ? "opacity-25" : "opacity-[0.12]"
          }`}
          style={{ width: scale * 26, filter: `blur(${scale * 2}px)` }}
        />
        <div className="stage-step relative" style={{ transform: step }}>
          <Pixel who={who} state={mood} scale={scale} active={active} />
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[12px] whitespace-nowrap">
        <span className="font-medium text-foreground">{NAME[who]}</span>
        <span className="text-muted-foreground">· {ROLE[who]}</span>
      </p>
    </div>
  );
}

// Small centred chips: the user's answer, the verdict huddle, connecting.
function Chip({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "you" }) {
  return (
    <p
      className={`anim-bubble-in max-w-full rounded-full border px-3 py-1 text-center text-[12px] ${
        tone === "you" ? "border-primary/40 bg-primary/10 text-foreground" : "border-border bg-surface text-muted-foreground"
      }`}
    >
      {children}
    </p>
  );
}

function Options({ ask, onAnswer }: { ask: Ask; onAnswer: (ask: Ask, answer: string) => void }) {
  return (
    <div data-ask className="anim-slide-up flex w-full flex-col items-center gap-2">
      <p className="hidden text-[12px] text-muted-foreground sm:block">Tap an answer. They&apos;ll carry on once you do.</p>
      <div className="flex flex-wrap justify-center gap-2">
        {ask.options.map((opt) => (
          <Button
            key={opt}
            type="button"
            variant="outline"
            onClick={() => onAnswer(ask, opt)}
            className="h-11 min-w-24 px-4 text-[14px] font-normal text-foreground sm:h-9 sm:text-[13px]"
          >
            {opt}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function Stage({ state, wide, onAnswer }: { state: DebateState; wide: boolean; onAnswer: (ask: Ask, answer: string) => void }) {
  const scale = wide ? 4 : 3;
  const keyOf = (a: Advisor) => state.lines[a]?.key ?? 0;
  const newest: Advisor = keyOf("spark") >= keyOf("penny") ? "spark" : "penny";
  const center =
    state.status === "connecting" ? (
      <Chip>Sending your pick to Spark and Penny</Chip>
    ) : state.you ? (
      <Chip key={state.you.key} tone="you">
        <span className="text-muted-foreground">You: </span>
        {state.you.text}
      </Chip>
    ) : state.huddle ? (
      <Chip>{state.huddle}</Chip>
    ) : null;

  // The latest real words, for screen readers.
  const said = WHO.map((a) => ({ a, l: state.lines[a] }))
    .filter((x) => x.l && (x.l.kind === "say" || x.l.kind === "ask"))
    .sort((x, y) => (y.l?.key ?? 0) - (x.l?.key ?? 0))[0];

  const evidence = state.evidence && (
    <EvidenceCard key={state.evidence.id} evidence={state.evidence} className={`anim-slide-up ${wide ? "" : "max-w-md"}`} />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="sr-only" aria-live="polite">
        {said ? `${NAME[said.a]}: ${said.l?.text}` : ""}
      </p>
      <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto">
        {wide ? (
          // Desktop: bubbles above each head; the evidence sits on the floor between them.
          <div className={`stage-cols mx-auto flex min-h-full w-full flex-col justify-center px-8 py-6 ${state.evidence ? "max-w-[1080px]" : "max-w-[880px]"}`}>
            {/* The middle opens up (and the two step apart) when there's evidence to put between them. */}
            <div
              className="stage-cols grid grid-rows-[auto_auto] gap-x-8 border-b border-border-soft"
              style={{ gridTemplateColumns: `minmax(0,1fr) ${state.evidence ? "min(400px,38%)" : "min(200px,20%)"} minmax(0,1fr)` }}
            >
              {WHO.map((a, i) => (
                <div key={a} className={`relative row-start-1 flex min-h-[200px] flex-col items-center justify-end pb-4 ${i ? "col-start-3" : "col-start-1"}`}>
                  <BubbleSlot who={a} line={state.lines[a]} newest={newest === a} wide />
                </div>
              ))}
              {WHO.map((a, i) => (
                <div key={a} className={`row-start-2 pb-4 ${i ? "col-start-3" : "col-start-1"}`}>
                  <Actor who={a} mood={state.moods[a]} scale={scale} />
                </div>
              ))}
              <div className="col-start-2 row-span-2 row-start-1 flex flex-col items-center justify-end gap-3 pb-4">
                {center}
                {evidence}
              </div>
            </div>
          </div>
        ) : (
          // Phone: the bubbles stack above both characters (newest nearest them), evidence under the floor.
          <div className="flex min-h-full w-full flex-col justify-center px-4 py-3">
            <div className="flex min-h-[110px] flex-col justify-end gap-3 pb-4">
              {WHO.map((a) => (
                <div key={a} className="relative flex flex-col" style={{ order: keyOf(a) }}>
                  <BubbleSlot who={a} line={state.lines[a]} newest={newest === a} wide={false} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 border-b border-border-soft px-2 pb-3">
              {WHO.map((a) => (
                <Actor key={a} who={a} mood={state.moods[a]} scale={scale} />
              ))}
            </div>
            {(center || evidence) && (
              <div className="flex flex-col items-center gap-3 pt-4">
                {center}
                {evidence}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Answer options stay pinned under the stage so they're always in reach. */}
      {state.ask && (
        <div className="shrink-0 px-4 pt-1 pb-4">
          <Options key={state.ask.askId} ask={state.ask} onAnswer={onAnswer} />
        </div>
      )}
    </div>
  );
}
