"use client";

import { useEffect, useState } from "react";
import type { Advisor, Ask, Evidence } from "@/lib/types";
import { Pixel } from "@/components/pixel/Pixel";
import { Speech } from "@/components/pixel/Speech";
import type { Pop } from "../_lib/useDebate";
import { money } from "../_lib/format";

export type Side = "left" | "right";
export const NAME: Record<Advisor, string> = { spark: "Spark", penny: "Penny" };

function Row({ side, children }: { side: Side; children: React.ReactNode }) {
  return <div className={`flex w-full ${side === "right" ? "justify-end" : "justify-start"}`}>{children}</div>;
}

// An advisor's message. `own` = on its owner's screen (accent fill), otherwise a quiet bubble.
export function MessageBubble({ from, text, side, own, showName }: { from: Advisor; text: string; side: Side; own: boolean; showName: boolean }) {
  const fill = own
    ? from === "spark"
      ? "bg-spark text-ink"
      : "bg-penny text-ink"
    : "bg-surface-2 text-text";
  const corner = side === "right" ? "rounded-br-md" : "rounded-bl-md";
  return (
    <Row side={side}>
      <div className={`anim-land flex max-w-[85%] flex-col sm:max-w-[78%] ${side === "right" ? "items-end" : "items-start"}`}>
        {showName && (
          <span className={`mb-1 px-1 text-xs font-medium ${from === "spark" ? "text-spark" : "text-penny"}`}>{NAME[from]}</span>
        )}
        <p className={`rounded-3xl ${corner} px-4 py-2.5 text-[15px] leading-relaxed ${fill}`}>{text}</p>
      </div>
    </Row>
  );
}

export function YouBubble({ text }: { text: string }) {
  return (
    <div className="anim-land flex flex-col items-center gap-1">
      <span className="text-xs font-medium text-muted">You</span>
      <p className="rounded-3xl bg-you px-4 py-2 text-[15px] font-medium text-ink">{text}</p>
    </div>
  );
}

// Prices, alternatives or details an advisor pulled with a tool.
export function EvidenceCard({ evidence, side }: { evidence: Evidence; side: Side }) {
  const priced = evidence.items.filter((i) => typeof i.price === "number");
  const best = priced.length ? Math.min(...priced.map((i) => i.price as number)) : undefined;
  const accent = evidence.from === "spark" ? "text-spark" : "text-penny";
  const icon = evidence.kind === "prices" ? "Price check" : evidence.kind === "alternatives" ? "Alternatives" : "Details";
  return (
    <Row side={side}>
      <div className="anim-land w-full max-w-[88%] rounded-3xl border border-line bg-bg-soft p-4 sm:max-w-sm">
        <p className={`text-xs font-semibold uppercase tracking-wider ${accent}`}>
          {icon} · {NAME[evidence.from]}
        </p>
        <p className="mt-1 font-medium text-text">{evidence.title}</p>
        <ul className="mt-3 divide-y divide-line-soft">
          {evidence.items.map((item, i) => {
            const isBest = best !== undefined && item.price === best;
            return (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className={`truncate text-sm ${isBest ? "text-text" : "text-muted"}`}>
                    {evidence.kind === "details" && <span className={`mr-2 ${accent}`} aria-hidden>•</span>}
                    {item.label}
                  </p>
                  {item.note && <p className="text-xs text-faint">{item.note}</p>}
                </div>
                {typeof item.price === "number" && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-sm ${
                      isBest ? "bg-penny-2 font-semibold text-ink" : "text-muted"
                    }`}
                  >
                    {money(item.price)}
                    {isBest && <span className="sr-only"> (best price)</span>}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Row>
  );
}

// A tap-to-answer question. Answered (or timed out) chips lock in place.
export function AskCard({ ask, answer, side, onAnswer }: { ask: Ask; answer?: string | null; side: Side; onAnswer: (a: string) => void }) {
  const accent = ask.from === "spark" ? "border-spark/40" : "border-penny/40";
  const done = answer !== undefined;
  return (
    <Row side={side}>
      <div className={`anim-land w-full max-w-[92%] rounded-3xl border ${accent} bg-surface p-4 sm:max-w-md`}>
        <p className={`text-xs font-semibold uppercase tracking-wider ${ask.from === "spark" ? "text-spark" : "text-penny"}`}>
          {NAME[ask.from]} asks you
        </p>
        <p className="mt-1 text-lg font-medium leading-snug text-text">{ask.question}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ask.options.map((opt) => {
            const chosen = answer === opt;
            return (
              <button
                key={opt}
                type="button"
                disabled={done}
                onClick={() => onAnswer(opt)}
                className={`min-h-11 rounded-full border px-4 text-[15px] font-medium transition-colors ${
                  chosen
                    ? "border-you bg-you text-ink"
                    : done
                      ? "border-line text-faint"
                      : "border-line bg-surface-2 text-text hover:border-muted active:scale-[0.98]"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {answer === null && <p className="mt-3 text-sm text-muted">No answer, so they carried on without it.</p>}
      </div>
    </Row>
  );
}

// The character in place of a typing indicator: slides up with a handwritten line, slides out when the message lands.
export function PopSlot({ pop, sideOf, live }: { pop: Pop | null; sideOf: (a: Advisor) => Side; live: boolean }) {
  const [shown, setShown] = useState<Pop | null>(pop);
  if (pop && pop !== shown) setShown(pop);
  const leaving = !pop && shown !== null;
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setShown(null), 260);
    return () => clearTimeout(t);
  }, [leaving]);
  if (!shown) return null;
  const side = sideOf(shown.advisor);
  return (
    <div key={shown.advisor} className={`${leaving ? "anim-pop-out" : "anim-pop-in"} flex w-full ${side === "right" ? "justify-end" : "justify-start"}`}>
      <div className={`flex items-end gap-2 ${side === "right" ? "flex-row-reverse" : ""}`}>
        <Pixel who={shown.advisor} state={shown.state} scale={3} flip={side === "right" && shown.advisor === "spark"} />
        <div className="mb-8 max-w-[15rem] sm:max-w-xs">
          <Speech who={shown.advisor} tail={side === "right" ? "right" : "left"} live={live}>
            {shown.line}
          </Speech>
        </div>
      </div>
    </div>
  );
}

// On the other advisor's screen, the working character peeks in from the edge.
export function Peek({ pop }: { pop: Pop | null }) {
  if (!pop) return null;
  return (
    <div key={pop.key} aria-hidden className="anim-peek pointer-events-none absolute bottom-0 left-0">
      <Pixel who={pop.advisor} state={pop.state} scale={2} />
    </div>
  );
}

// stage: verdict. Both advisors huddle.
export function Huddle({ line, live }: { line: string; live: boolean }) {
  return (
    <div className="anim-pop-in flex flex-col items-center gap-2 py-2">
      <div className="flex items-end gap-1">
        <Pixel who="spark" state="think" scale={3} />
        <Pixel who="penny" state="think" scale={3} />
      </div>
      <p aria-live={live ? "polite" : undefined} className="font-hand text-xl text-text">
        {line}
      </p>
    </div>
  );
}
