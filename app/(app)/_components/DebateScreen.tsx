"use client";

import { useEffect } from "react";
import { ChevronLeftIcon } from "lucide-react";
import type { Advisor, Offer, ProductCard } from "@/lib/types";
import { Pixel } from "@/components/pixel/Pixel";
import { Said } from "@/components/pixel/Speech";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useDebate, type DebateState } from "../_lib/useDebate";
import { useWide } from "../_lib/useWide";
import { money, store } from "../_lib/format";
import { ProductImage } from "./ProductImage";
import { Dot, NAME, ROLE } from "./ChatParts";
import { Thread } from "./Thread";
import { Status, TopBar } from "./TopBar";
import { callLabel, VerdictSheet } from "./VerdictSheet";

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

// Messages on the board so far, counted per advisor for the pane headers.
function count(state: DebateState, who: Advisor) {
  return state.items.filter((it) => it.kind === "message" && it.from === who).length;
}

function PaneHeader({ who, state }: { who: Advisor; state: DebateState }) {
  const n = count(state, who);
  return (
    <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-border px-4">
      <Pixel who={who} state={state.moods[who]} scale={1} />
      <p className="min-w-0 flex-1 truncate text-[13px]">
        <span className="font-medium text-foreground">{NAME[who]}</span>
        <span className="text-muted-foreground"> · {ROLE[who]}</span>
      </p>
      <span className="text-[12px] text-muted-foreground tabular-nums">
        {n} {n === 1 ? "message" : "messages"}
      </span>
    </div>
  );
}

function PhoneHeader({ state }: { state: DebateState }) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
      {(["spark", "penny"] as const).map((who) => (
        <div key={who} className={`flex items-center gap-2 ${who === "penny" ? "flex-row-reverse text-right" : ""}`}>
          <Pixel who={who} state={state.moods[who]} scale={1} />
          <div className="leading-tight">
            <p className={`flex items-center gap-1.5 text-[13px] font-medium text-foreground ${who === "penny" ? "flex-row-reverse" : ""}`}>
              <Dot who={who} />
              {NAME[who]}
            </p>
            <p className="text-[11px] text-muted-foreground">{ROLE[who]}</p>
          </div>
        </div>
      ))}
    </div>
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
        <Said who="penny" state={busy ? "think" : "sulk"} scale={1} live>
          {state.errorLine}
        </Said>
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
  const trouble = state.status === "error" || state.status === "busy";
  const shownProduct = state.product ?? product;

  // Esc goes back to the search on desktop, unless the verdict panel is open (Esc closes that first).
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
        crumbs={wide ? ["Search", shownProduct.title] : ["Spark vs Penny"]}
        right={status}
      />
      <ProductBar product={shownProduct} picked={state.picked ?? picked} />
      {trouble ? (
        <Trouble state={state} onRetry={retry} onBack={onBack} />
      ) : wide ? (
        <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-border">
          {(["spark", "penny"] as const).map((who) => (
            <section key={who} aria-label={`${NAME[who]}'s chat`} className="flex min-h-0 flex-col">
              <PaneHeader who={who} state={state} />
              <Thread state={state} owner={who} live={who === "spark"} onAnswer={answer} />
            </section>
          ))}
        </div>
      ) : (
        <section aria-label="Spark and Penny" className="flex min-h-0 flex-1 flex-col">
          <PhoneHeader state={state} />
          <Thread state={state} owner={null} live onAnswer={answer} />
        </section>
      )}
      {state.status === "verdict" && state.verdict && (
        <VerdictSheet state={state} wide={wide} onSkip={() => onSkip(state.picked?.price ?? picked.price)} />
      )}
    </div>
  );
}
