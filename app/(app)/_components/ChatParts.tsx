"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "lucide-react";
import type { Advisor, Ask, Evidence } from "@/lib/types";
import { Pixel } from "@/components/pixel/Pixel";
import { Said, Speech } from "@/components/pixel/Speech";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Pop } from "../_lib/useDebate";
import { money, store } from "../_lib/format";

export type Side = "left" | "right";
export const NAME: Record<Advisor, string> = { spark: "Spark", penny: "Penny" };
export const ROLE: Record<Advisor, string> = { spark: "Treat yourself", penny: "Frugal skeptic" };

function Row({ side, children }: { side: Side; children: React.ReactNode }) {
  return <div className={`flex w-full ${side === "right" ? "justify-end" : "justify-start"}`}>{children}</div>;
}

export function Dot({ who }: { who: Advisor }) {
  return <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${who === "spark" ? "bg-spark" : "bg-penny"}`} />;
}

// Small header for a card: the advisor's dot and name, then what it is.
function Byline({ who, children }: { who: Advisor; children?: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
      <Dot who={who} />
      <span className="font-medium text-foreground">{NAME[who]}</span>
      {children}
    </p>
  );
}

// An advisor's message. `own` = on its owner's screen: a thin accent border on the left marks it.
export function MessageBubble({ from, text, side, own, showName }: { from: Advisor; text: string; side: Side; own: boolean; showName: boolean }) {
  const mark = own ? (from === "spark" ? "border-l-spark" : "border-l-penny") : "";
  return (
    <Row side={side}>
      <div className={`anim-rise flex max-w-[88%] flex-col gap-1 sm:max-w-[80%] ${side === "right" ? "items-end" : "items-start"}`}>
        {showName && (
          <span className="flex items-center gap-1.5 px-0.5 text-[12px] font-medium text-foreground">
            <Dot who={from} />
            {NAME[from]}
          </span>
        )}
        <p
          className={`rounded-md border border-border px-3 py-2 text-[14px] leading-[1.55] text-text-2 ${
            own ? `border-l-2 ${mark} bg-surface-2` : "bg-surface"
          }`}
        >
          {text}
        </p>
      </div>
    </Row>
  );
}

// The user's tap, as an activity line.
export function YouLine({ text }: { text: string }) {
  return (
    <p className="anim-rise flex items-center justify-center gap-2 py-1 text-[12px] text-muted-foreground">
      <span aria-hidden className="flex size-4 items-center justify-center rounded-full bg-surface-3 text-[9px] font-semibold text-foreground">
        Y
      </span>
      <span>
        You answered <span className="font-medium text-foreground">{text}</span>
      </span>
    </p>
  );
}

const KIND: Record<Evidence["kind"], string> = { prices: "Price check", alternatives: "Alternatives", details: "A closer look" };

function subtitle(e: Evidence) {
  const n = e.items.length;
  if (e.kind === "prices") return `${n} ${n === 1 ? "store" : "stores"}`;
  if (e.kind === "alternatives") return `${n} similar ${n === 1 ? "pick" : "picks"}`;
  return `${n} ${n === 1 ? "detail" : "details"}`;
}

// "your pick, out of stock, was $99.00" -> pieces for the table.
function parseNote(note?: string) {
  const parts = (note ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return {
    pick: parts.includes("your pick"),
    out: parts.includes("out of stock"),
    rest: parts.filter((p) => p !== "your pick" && p !== "out of stock").join(", "),
  };
}

// Prices, alternatives or details an advisor pulled with a tool: a compact table.
export function EvidenceCard({ evidence, side }: { evidence: Evidence; side: Side }) {
  const priced = evidence.items.filter((i) => typeof i.price === "number");
  const best = priced.length > 1 ? Math.min(...priced.map((i) => i.price as number)) : undefined;
  const head = "px-3 py-1.5 text-left text-[11px] font-normal text-muted-foreground";
  return (
    <Row side={side}>
      <div className="anim-rise w-full max-w-[94%] overflow-hidden rounded-lg border border-border bg-surface sm:max-w-md">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
          <p className="truncate text-[12px]">
            <span className="font-medium text-foreground">{KIND[evidence.kind]}</span>
            <span className="text-muted-foreground"> · {subtitle(evidence)}</span>
          </p>
          <Byline who={evidence.from} />
        </div>
        {evidence.kind === "details" ? (
          <ul className="divide-y divide-border-soft">
            {evidence.items.map((item, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 px-3 py-2 text-[13px]">
                <span className="text-text-2">{item.label}</span>
                {item.note && <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">{item.note}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <table className="w-full table-fixed text-[13px]">
            <thead className="border-b border-border-soft">
              <tr>
                <th className={head}>{evidence.kind === "prices" ? "Store" : "Product"}</th>
                <th className={`${head} w-[30%]`}>{evidence.kind === "prices" ? "Stock" : "Store"}</th>
                <th className={`${head} w-[34%] text-right`}>Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {evidence.items.map((item, i) => {
                const isBest = best !== undefined && item.price === best;
                const n = parseNote(item.note);
                return (
                  <tr key={i} className={isBest ? "bg-positive/[0.06]" : undefined}>
                    <td className="px-3 py-2">
                      <span className={`block truncate ${isBest ? "text-foreground" : "text-text-2"}`}>
                        {evidence.kind === "prices" ? store(item.label) : item.label}
                      </span>
                      {evidence.kind === "prices" && (n.pick || n.rest) && (
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {[n.pick ? "Your pick" : "", n.rest].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </td>
                    <td className="truncate px-3 py-2 text-[12px] text-muted-foreground">
                      {evidence.kind === "prices" ? (n.out ? "Out of stock" : "In stock") : item.note ? store(item.note) : ""}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="inline-flex items-center justify-end gap-1.5">
                        {isBest && (
                          <Badge variant="outline" className="h-4 rounded-sm border-positive/30 px-1 text-[10px] text-positive">
                            Best
                          </Badge>
                        )}
                        {typeof item.price === "number" && (
                          <span className={`num ${isBest ? "text-foreground" : "text-text-2"}`}>{money(item.price)}</span>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Row>
  );
}

// A tap-to-answer question. Answered (or timed out) options lock in place.
export function AskCard({ ask, answer, side, onAnswer }: { ask: Ask; answer?: string | null; side: Side; onAnswer: (a: string) => void }) {
  const done = answer !== undefined;
  return (
    <Row side={side}>
      <div data-ask className="anim-rise w-full max-w-[94%] rounded-lg border border-border bg-surface p-3 sm:max-w-md">
        <Byline who={ask.from}>
          <span>asks you</span>
        </Byline>
        <p className="mt-1.5 text-[14px] leading-snug font-medium text-foreground">{ask.question}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ask.options.map((opt) => {
            const chosen = answer === opt;
            return (
              <Button
                key={opt}
                type="button"
                variant="outline"
                disabled={done}
                onClick={() => onAnswer(opt)}
                className={`h-11 px-3 text-[13px] font-normal sm:h-8 ${
                  chosen ? "border-primary/60 bg-primary/15 text-foreground disabled:opacity-100" : "bg-transparent text-text-2"
                }`}
              >
                {chosen && <CheckIcon aria-hidden className="size-3.5" />}
                {opt}
              </Button>
            );
          })}
        </div>
        {answer === undefined && <p className="mt-2.5 text-[12px] text-muted-foreground">They&apos;ll carry on once you answer.</p>}
        {answer === null && <p className="mt-2.5 text-[12px] text-muted-foreground">No answer, so they carried on without it.</p>}
      </div>
    </Row>
  );
}

// The character in place of a typing indicator: rises in with its line, fades out when the message lands.
export function PopSlot({ pop, sideOf, live }: { pop: Pop | null; sideOf: (a: Advisor) => Side; live: boolean }) {
  const [shown, setShown] = useState<Pop | null>(pop);
  if (pop && pop !== shown) setShown(pop);
  const leaving = !pop && shown !== null;
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setShown(null), 150);
    return () => clearTimeout(t);
  }, [leaving]);
  if (!shown) return null;
  const side = sideOf(shown.advisor);
  return (
    <div key={shown.advisor} className={`${leaving ? "anim-sink" : "anim-rise"} flex w-full ${side === "right" ? "justify-end" : "justify-start"}`}>
      <Said who={shown.advisor} state={shown.state} live={live} reverse={side === "right"} flip={side === "right" && shown.advisor === "spark"}>
        {shown.line}
      </Said>
    </div>
  );
}

// On the other advisor's screen: a quiet note that the working advisor is busy in their own chat.
export function Elsewhere({ who, side }: { who: Advisor; side: Side }) {
  return (
    <Row side={side}>
      <p className="anim-rise flex items-center gap-2 text-[12px] text-muted-foreground">
        <Pixel who={who} state="idle" scale={1} />
        <span>
          <span className="font-medium text-foreground">{NAME[who]}</span> is replying in {who === "spark" ? "his" : "her"} chat
        </span>
      </p>
    </Row>
  );
}

// stage: verdict. Both advisors huddle.
export function Huddle({ line, live }: { line: string; live: boolean }) {
  return (
    <div className="anim-rise flex flex-col items-center gap-2 py-3">
      <div className="flex items-end gap-1">
        <Pixel who="spark" state="think" scale={2} />
        <Pixel who="penny" state="think" scale={2} />
      </div>
      <Speech who="spark" named={false} live={live}>
        {line}
      </Speech>
    </div>
  );
}
