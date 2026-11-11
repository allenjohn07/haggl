"use client";

import { useEffect, useRef } from "react";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { ChatItem } from "../_lib/useDebate";
import { Dot, EvidenceCard, NAME } from "./ChatParts";

// The full history of the debate (the stage only shows the current lines): a compact list.
function Entry({ item, turn }: { item: ChatItem; turn: number }) {
  if (item.kind === "message")
    return (
      <li className="px-5 py-3">
        <p className="flex items-center gap-1.5 text-[12px]">
          <Dot who={item.from} />
          <span className="font-medium text-foreground">{NAME[item.from]}</span>
          <span className="ml-auto text-muted-foreground tabular-nums">Turn {turn}</span>
        </p>
        {item.reaction && <p className="mt-1 text-[12px] text-muted-foreground">{item.reaction}</p>}
        <p className="mt-1 text-[13px] leading-relaxed text-text-2">{item.text}</p>
      </li>
    );
  if (item.kind === "evidence")
    return (
      <li className="px-5 py-3">
        <EvidenceCard evidence={item.evidence} />
      </li>
    );
  const { ask, answer } = item;
  return (
    <li className="px-5 py-3">
      <p className="flex items-center gap-1.5 text-[12px]">
        <Dot who={ask.from} />
        <span className="font-medium text-foreground">{NAME[ask.from]}</span>
        <span className="text-muted-foreground">asked you</span>
      </p>
      <p className="mt-1 text-[13px] leading-snug font-medium text-foreground">{ask.question}</p>
      <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
        {answer ? (
          <>
            <CheckIcon aria-hidden className="size-3.5 text-primary" />
            You: <span className="text-foreground">{answer}</span>
          </>
        ) : answer === null ? (
          "No answer, so they carried on without it."
        ) : (
          "Waiting for your answer on the stage."
        )}
      </p>
    </li>
  );
}

export function Transcript({ items, open, onOpenChange, wide }: { items: ChatItem[]; open: boolean; onOpenChange: (o: boolean) => void; wide: boolean }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) requestAnimationFrame(() => end.current?.scrollIntoView({ block: "end" }));
  }, [open, items.length]);

  let turn = 0;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        className={`gap-0 border-border bg-surface-2 p-0 shadow-[0_0_0_1px_rgb(0_0_0/0.2),0_16px_48px_rgb(0_0_0/0.45)] ${
          wide ? "w-[420px] sm:max-w-[420px]" : "max-h-[85dvh] rounded-t-lg"
        }`}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border pr-2 pl-5">
          <SheetTitle className="text-[13px] font-medium text-foreground">Transcript</SheetTitle>
          <SheetDescription className="sr-only">Everything Spark and Penny said, the prices they pulled, and your answers.</SheetDescription>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-11 gap-2 px-2.5 text-[13px] text-muted-foreground sm:h-8">
            Close
            {wide && <Kbd className="border border-border bg-surface">Esc</Kbd>}
          </Button>
        </div>
        <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {items.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-muted-foreground">Spark and Penny haven&apos;t said anything yet.</p>
          ) : (
            <ol className="divide-y divide-border-soft">
              {items.map((it) => (
                <Entry key={it.id} item={it} turn={it.kind === "message" ? ++turn : turn} />
              ))}
            </ol>
          )}
          <div ref={end} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
