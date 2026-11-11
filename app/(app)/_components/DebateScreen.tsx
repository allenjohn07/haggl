"use client";

import { useEffect, useState } from "react";
import { ChevronLeftIcon, ListIcon } from "lucide-react";
import type { Offer, ProductCard } from "@/lib/types";
import { Pixel } from "@/components/pixel/Pixel";
import { Speech } from "@/components/pixel/Speech";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useDebate, type DebateState } from "../_lib/useDebate";
import { useWide } from "../_lib/useWide";
import { money, store } from "../_lib/format";
import { ProductImage } from "./ProductImage";
import { Stage } from "./Stage";
import { Status, TopBar } from "./TopBar";
import { Transcript } from "./Transcript";
import { callLabel, VerdictSheet } from "./VerdictSheet";

const MAX_TURNS = 8;

function ProductBar({ product, picked }: { product: ProductCard; picked: Offer }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-5">
      <ProductImage src={product.image} alt="" brand={product.brand} className="size-8 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-3">
        <p className="truncate text-[13px] text-foreground">{product.title}</p>
        <p className="shrink-0 text-[12px] text-muted-foreground">
          Your pick <span className="num text-foreground">{money(picked.price)}</span> at {store(picked.merchant)}
        </p>
      </div>
      <p className="hidden shrink-0 text-[12px] text-muted-foreground md:block">
        {product.offerCount} {product.offerCount === 1 ? "store" : "stores"}
      </p>
    </div>
  );
}

// Under the stage: turn progress (a dot per message, in the speaker's colour) and the transcript button.
function Footer({ state, onTranscript }: { state: DebateState; onTranscript: () => void }) {
  const said = state.items.flatMap((it) => (it.kind === "message" ? [it.from] : []));
  const label =
    state.status === "verdict"
      ? "Verdict ready"
      : `Turn ${Math.min(MAX_TURNS, Math.max(1, said.length))} of ${MAX_TURNS}`;
  const dot = (i: number) =>
    said[i] === "spark" ? "bg-spark" : said[i] === "penny" ? "bg-penny" : i === said.length && state.status === "live" ? "bg-muted-foreground" : "bg-surface-3";
  return (
    <footer className="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-border px-4 sm:h-12 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <ol aria-hidden className="flex items-center gap-1">
          {Array.from({ length: MAX_TURNS }, (_, i) => (
            <li key={i} className={`size-1.5 rounded-full ${dot(i)}`} />
          ))}
        </ol>
        <p className="truncate text-[12px] text-muted-foreground tabular-nums">{label}</p>
      </div>
      <Button variant="ghost" onClick={onTranscript} className="h-11 gap-2 px-3 text-[13px] text-muted-foreground sm:h-8 sm:px-2.5">
        <ListIcon aria-hidden />
        Transcript
        {state.items.length > 0 && <span className="num text-[12px] text-faint">{state.items.length}</span>}
      </Button>
    </footer>
  );
}

function Trouble({ state, onRetry, onBack }: { state: DebateState; onRetry: () => void; onBack: () => void }) {
  const busy = state.status === "busy";
  return (
    <div className="anim-fade flex flex-1 items-start justify-center px-4 pt-[14vh]">
      <div className="flex w-full max-w-md flex-col gap-5">
        <div className="flex items-end gap-2">
          <Pixel who="spark" state="sulk" scale={3} />
          <Pixel who="penny" state={busy ? "think" : "sulk"} scale={3} />
        </div>
        <div className="flex">
          <Speech who="penny" live>
            {state.errorLine}
          </Speech>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onRetry} className="h-11 px-4 sm:h-9">
            Try again
          </Button>
          <Button variant="outline" onClick={onBack} className="h-11 px-4 sm:h-9">
            Pick something else
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DebateScreen({
  product,
  picked,
  onBack,
  onSkip,
}: {
  product: ProductCard;
  picked: Offer;
  onBack: () => void;
  onSkip: (kept: number) => void;
}) {
  const { state, answer, retry } = useDebate(product.id, picked.offerId, { product, picked });
  const wide = useWide();
  const [transcript, setTranscript] = useState(false);
  const trouble = state.status === "error" || state.status === "busy";
  const shownProduct = state.product ?? product;

  // Esc goes back to the search on desktop, unless a sheet is open (Esc closes that first).
  useEffect(() => {
    if (!wide) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape" || e.defaultPrevented || document.querySelector("[role=dialog]")) return;
      onBack();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [wide, onBack]);

  const status =
    state.status === "verdict" && state.verdict ? (
      <Status on={state.verdict.call === "buy" || state.verdict.call === "buy_elsewhere"}>{callLabel(state.verdict)}</Status>
    ) : state.status === "live" ? (
      <Status on>Live</Status>
    ) : state.status === "connecting" ? (
      <Status on={false}>Connecting</Status>
    ) : null;

  return (
    <div className="flex h-dvh flex-col">
      <TopBar
        left={
          <Button variant="ghost" onClick={onBack} aria-label="Back to search" className="h-11 gap-1.5 px-2 text-muted-foreground sm:h-8">
            <ChevronLeftIcon aria-hidden />
            {wide && <Kbd className="border border-border bg-surface-2">Esc</Kbd>}
          </Button>
        }
        crumbs={wide ? [] : ["Spark vs Penny"]}
        right={status}
      />
      <ProductBar product={shownProduct} picked={state.picked ?? picked} />
      {trouble ? (
        <Trouble state={state} onRetry={retry} onBack={onBack} />
      ) : (
        <section aria-label="Spark and Penny" className="flex min-h-0 flex-1 flex-col">
          <Stage state={state} wide={wide} onAnswer={answer} />
          <Footer state={state} onTranscript={() => setTranscript(true)} />
          {/* Room for the verdict's reopen bar on phones, so the footer stays reachable. */}
          {state.status === "verdict" && <div aria-hidden className="h-[68px] shrink-0 sm:hidden" />}
        </section>
      )}
      <Transcript items={state.items} open={transcript} onOpenChange={setTranscript} wide={wide} />
      {state.status === "verdict" && state.verdict && (
        <VerdictSheet state={state} wide={wide} onSkip={() => onSkip(state.picked?.price ?? picked.price)} />
      )}
    </div>
  );
}
