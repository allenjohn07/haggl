"use client";

import { useEffect, useState } from "react";
import { Pixel } from "@/components/pixel/Pixel";
import type { PixelState } from "@/components/pixel/sprites";
import { useReducedMotion } from "@/components/pixel/useReducedMotion";
import type { Advisor } from "@/lib/types";

// A short, looping mini-debate for the hero: the real characters, scripted lines.
type Step = {
  who: Advisor;
  line: string;
  moods: Record<Advisor, PixelState>;
  card?: "prices" | "ask" | "verdict";
};

const STEPS: Step[] = [
  { who: "spark", line: "Penny. 4.7 stars from 3,837 people. Treat yourself.", moods: { spark: "talk", penny: "idle" } },
  { who: "penny", line: "Pulling prices from 5 stores…", moods: { spark: "idle", penny: "lookup" }, card: "prices" },
  { who: "penny", line: "Same headphones, $106 cheaper at bose.com.", moods: { spark: "think", penny: "talk" }, card: "prices" },
  { who: "penny", line: "How often would you actually use them?", moods: { spark: "idle", penny: "ask" }, card: "ask" },
  { who: "spark", line: "Every day? Then that's joy per dollar.", moods: { spark: "talk", penny: "think" }, card: "ask" },
  { who: "penny", line: "Fine. Buy it, but at the cheaper store.", moods: { spark: "cheer", penny: "cheer" }, card: "verdict" },
];

const STEP_MS = 2600;

export function HeroDemo() {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setI((n) => (n + 1) % STEPS.length), STEP_MS);
    return () => clearInterval(t);
  }, [reduced]);

  const step = STEPS[reduced ? 2 : i];
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface/80 shadow-[0_24px_80px_rgb(0_0_0/0.55)] backdrop-blur-[2px]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
        <div className="landing-edge h-px w-1/3" />
      </div>

      {/* Window bar */}
      <div className="flex h-9 items-center gap-1.5 border-b border-border px-3">
        <span className="size-2.5 rounded-full bg-surface-3" />
        <span className="size-2.5 rounded-full bg-surface-3" />
        <span className="size-2.5 rounded-full bg-surface-3" />
        <span className="ml-3 min-w-0 truncate text-[11px] text-muted-foreground">Bose QuietComfort Headphones · your pick $235.99 at bestbuy.com</span>
      </div>

      <div className="grid grid-cols-2 items-end gap-x-3 gap-y-4 px-4 pt-5 pb-5 sm:grid-cols-[1fr_auto_1fr] sm:gap-6 sm:px-10 sm:pt-8">
        <Side who="spark" step={step} />
        <div className="order-last col-span-2 flex min-h-[132px] w-full items-end justify-center sm:order-none sm:col-span-1 sm:w-[15rem] sm:pb-6" aria-hidden>
          <Card kind={step.card} key={step.card ?? "none"} />
        </div>
        <Side who="penny" step={step} />
      </div>

      <p className="sr-only" aria-live="polite">
        {step.who === "spark" ? "Spark" : "Penny"}: {step.line}
      </p>
    </div>
  );
}

function Side({ who, step }: { who: Advisor; step: Step }) {
  const speaking = step.who === who;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex min-h-[96px] w-full items-end justify-center sm:min-h-[72px]" aria-hidden>
        {speaking && (
          <div
            key={step.line}
            className="anim-bubble-in relative max-w-[15rem] rounded-lg border border-border bg-surface-2 px-3 py-2 text-[12px] leading-snug text-foreground sm:text-[13px]"
          >
            <span className={`mr-1.5 inline-block size-1.5 rounded-full align-middle ${who === "spark" ? "bg-spark" : "bg-penny"}`} />
            {step.line}
          </div>
        )}
      </div>
      <div className={who === "spark" ? "landing-float" : "landing-float-late"}>
        <Pixel who={who} state={step.moods[who]} scale={3} active={speaking} />
      </div>
      <span className="text-[11px] text-muted-foreground">
        <span className="text-foreground">{who === "spark" ? "Spark" : "Penny"}</span>
        <span className="hidden sm:inline"> · {who === "spark" ? "Treat yourself" : "Frugal skeptic"}</span>
      </span>
    </div>
  );
}

function Card({ kind }: { kind?: Step["card"] }) {
  if (!kind) return null;
  if (kind === "prices") {
    return (
      <div className="anim-slide-up w-full overflow-hidden rounded-md border border-border bg-background/80 text-[11px]">
        <div className="border-b border-border px-2.5 py-1.5 text-muted-foreground">Price check · 5 stores</div>
        {[
          ["bose.com", "$129.00", true],
          ["bestbuy.com", "$235.99", false],
          ["target.com", "$249.99", false],
        ].map(([s, p, best]) => (
          <div key={s as string} className="flex items-center justify-between px-2.5 py-1.5">
            <span className="text-text-2">{s}</span>
            <span className="num flex items-center gap-1.5 text-foreground">
              {best && <span className="rounded-sm border border-positive/40 px-1 text-[10px] text-positive">Best</span>}
              {p}
            </span>
          </div>
        ))}
      </div>
    );
  }
  if (kind === "ask") {
    return (
      <div className="anim-slide-up flex w-full flex-col gap-1.5">
        {["Every day", "A few times a week", "Rarely"].map((o, i) => (
          <span
            key={o}
            className={`rounded-md border px-2.5 py-1.5 text-center text-[11px] ${i === 0 ? "border-primary/60 bg-primary/15 text-foreground" : "border-border text-muted-foreground"}`}
          >
            {o}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="anim-slide-up w-full rounded-md border border-primary/40 bg-primary/[0.08] px-3 py-2.5 text-[11px]">
      <div className="flex items-center gap-1.5 text-foreground">
        <span className="size-1.5 rounded-full bg-positive" /> Buy it at bose.com
      </div>
      <div className="mt-1 flex items-baseline justify-between">
        <span className="num text-[15px] text-foreground">$129.00</span>
        <span className="num text-positive">saves $106.99</span>
      </div>
      <div className="mt-2 rounded bg-[#ffc439] py-1 text-center text-[11px] font-medium text-[#111]">
        Buy with <span className="font-bold text-[#003087] italic">Pay</span>
        <span className="font-bold text-[#009cde] italic">Pal</span>
      </div>
    </div>
  );
}
