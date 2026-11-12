"use client";

import { useEffect, useState } from "react";
import { ChevronLeftIcon, ListIcon, StarIcon } from "lucide-react";
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
import { SoundToggle } from "./SoundToggle";
import { saveDebate, setOutcome } from "../_lib/history";
import { sounds } from "../_lib/sounds";
import { StoreLink } from "./StoreLink";
import { Transcript } from "./Transcript";
import { callLabel, VerdictSheet } from "./VerdictSheet";

const MAX_TURNS = 8;

function ProductBar({ product, picked }: { product: ProductCard; picked: Offer }) {
  const stores = `${product.offerCount} ${product.offerCount === 1 ? "store" : "stores"}`;
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5 sm:gap-4 sm:px-5">
      <ProductImage src={product.image} alt={product.title} brand={product.brand} className="size-12 shrink-0 sm:size-14" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-[14px] font-medium text-foreground">{product.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
          {product.brand && <span>{product.brand}</span>}
          {product.rating && (
            <span className="inline-flex items-center gap-1">
              <StarIcon aria-hidden className="size-3 fill-current" />
              <span className="text-text-2 tabular-nums">{product.rating.score.toFixed(1)}</span>
              <span className="tabular-nums">({product.rating.count.toLocaleString("en-US")})</span>
            </span>
          )}
          <span className="hidden sm:inline">{stores}</span>
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Your pick <span className="num text-foreground">{money(picked.price)}</span> at {store(picked.merchant)}
        </p>
      </div>
      <StoreLink url={picked.url} merchant={picked.merchant} compact className="shrink-0 sm:hidden" />
      <StoreLink url={picked.url} merchant={picked.merchant} className="hidden shrink-0 sm:inline-flex" />
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
          <Button
            onClick={() => {
              sounds.tap();
              onRetry();
            }}
            className="h-11 px-4 sm:h-9"
          >
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
  compare,
  onBack,
  onSkip,
}: {
  product: ProductCard;
  picked: Offer;
  compare?: ProductCard[]; // up to 2 products the user added to compare
  onBack: () => void;
  onSkip: (kept: number) => void;
}) {
  const { state, answer, retry } = useDebate(product.id, picked.offerId, { product, picked }, (compare ?? []).map((c) => c.id).join(","));
  const wide = useWide();
  const [transcript, setTranscript] = useState(false);
  const trouble = state.status === "error" || state.status === "busy";
  const shownProduct = state.product ?? product;

  // Save the finished debate (verdict and transcript) to this browser's history.
  const { status: phase, verdict, debateId, items } = state;
  const shownPicked = state.picked ?? picked;
  useEffect(() => {
    if (phase !== "verdict" || !verdict || !debateId) return;
    saveDebate({ debateId, at: Date.now(), product: shownProduct, picked: shownPicked, compare, verdict, items });
  }, [phase, verdict, debateId, items, shownProduct, shownPicked, compare]);

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
          <Button
            variant="ghost"
            onClick={() => {
              sounds.tap();
              onBack();
            }}
            aria-label="Back to search" className="h-11 gap-1.5 px-2 text-muted-foreground sm:h-8">
            <ChevronLeftIcon aria-hidden />
            {wide && <Kbd className="border border-border bg-surface-2">Esc</Kbd>}
          </Button>
        }
        crumbs={wide ? [] : ["Spark vs Penny"]}
        right={
          <>
            {status}
            <SoundToggle />
          </>
        }
      />
      <ProductBar product={shownProduct} picked={state.picked ?? picked} />
      {trouble ? (
        <Trouble state={state} onRetry={retry} onBack={onBack} />
      ) : (
        <section aria-label="Spark and Penny" className="flex min-h-0 flex-1 flex-col">
          <Stage state={state} wide={wide} onAnswer={answer} />
          <Footer state={state} onTranscript={() => {
              sounds.open();
              setTranscript(true);
            }} />
          {/* Room for the verdict's reopen bar on phones, so the footer stays reachable. */}
          {state.status === "verdict" && <div aria-hidden className="h-[68px] shrink-0 sm:hidden" />}
        </section>
      )}
      <Transcript items={state.items} open={transcript} onOpenChange={(o) => {
          if (!o) sounds.close();
          setTranscript(o);
        }} wide={wide} />
      {state.status === "verdict" && state.verdict && (
        <VerdictSheet
          state={state}
          wide={wide}
          onSkip={() => {
            if (state.debateId) setOutcome(state.debateId, { kind: "skipped" });
            onSkip(state.picked?.price ?? picked.price);
          }}
        />
      )}
    </div>
  );
}
