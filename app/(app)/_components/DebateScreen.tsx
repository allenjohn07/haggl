"use client";

import type { Advisor, Offer, ProductCard } from "@/lib/types";
import { Pixel } from "@/components/pixel/Pixel";
import { Speech } from "@/components/pixel/Speech";
import { useDebate, type DebateState } from "../_lib/useDebate";
import { useWide } from "../_lib/useWide";
import { money, store } from "../_lib/format";
import { ProductImage } from "./ProductImage";
import { NAME } from "./ChatParts";
import { Thread } from "./Thread";
import { VerdictSheet } from "./VerdictSheet";

const TAGLINE: Record<Advisor, string> = { spark: "Treat yourself", penny: "Frugal skeptic" };

function Strip({ product, picked, onBack }: { product: ProductCard; picked: Offer; onBack: () => void }) {
  return (
    <header className="flex items-center gap-3 border-b border-line-soft bg-bg/80 px-3 py-2 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onBack}
        aria-label="New search"
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-xl text-muted hover:bg-surface-2 hover:text-text"
      >
        ←
      </button>
      <ProductImage src={product.image} alt="" brand={product.brand} small className="size-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{product.title}</p>
        <p className="truncate text-xs text-muted">
          Your pick · <span className="font-mono text-text">{money(picked.price)}</span> at {store(picked.merchant)}
        </p>
      </div>
      <span className="hidden shrink-0 font-hand text-lg text-muted md:block">Spark vs Penny</span>
    </header>
  );
}

function ChatHeader({ who, state, title }: { who: Advisor; state: DebateState; title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-line-soft px-4 py-3">
      <div className={`flex size-11 items-center justify-center overflow-hidden rounded-full ${who === "spark" ? "bg-spark-soft" : "bg-penny-soft"}`}>
        <Pixel who={who} state={state.moods[who]} scale={1} />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-text">{title}</p>
        <p className={`text-xs ${who === "spark" ? "text-spark" : "text-penny"}`}>
          {TAGLINE[who]} · texting {NAME[who === "spark" ? "penny" : "spark"]}
        </p>
      </div>
    </div>
  );
}

function PhoneHeader({ state }: { state: DebateState }) {
  return (
    <div className="flex items-center justify-between border-b border-line-soft px-4 py-2">
      {(["spark", "penny"] as const).map((who) => (
        <div key={who} className={`flex items-center gap-2 ${who === "penny" ? "flex-row-reverse text-right" : ""}`}>
          <div className={`flex size-10 items-center justify-center overflow-hidden rounded-full ${who === "spark" ? "bg-spark-soft" : "bg-penny-soft"}`}>
            <Pixel who={who} state={state.moods[who]} scale={1} />
          </div>
          <div>
            <p className={`text-sm font-semibold ${who === "spark" ? "text-spark" : "text-penny"}`}>{NAME[who]}</p>
            <p className="text-xs text-muted">{TAGLINE[who]}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Trouble({ state, onRetry, onBack }: { state: DebateState; onRetry: () => void; onBack: () => void }) {
  const busy = state.status === "busy";
  return (
    <div className="anim-fade flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <div className="flex items-end gap-4">
        <Pixel who="spark" state="sulk" scale={4} />
        <Pixel who="penny" state={busy ? "think" : "sulk"} scale={4} />
      </div>
      <Speech who="penny" tail="down" size="lg" live>
        {state.errorLine}
      </Speech>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={onRetry} className="min-h-12 rounded-full bg-text px-7 font-semibold text-ink">
          Try again
        </button>
        <button type="button" onClick={onBack} className="min-h-12 rounded-full border border-line px-7 font-medium text-text">
          Pick something else
        </button>
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

  return (
    <div className="flex h-dvh flex-col">
      <Strip product={state.product ?? product} picked={state.picked ?? picked} onBack={onBack} />
      {trouble ? (
        <Trouble state={state} onRetry={retry} onBack={onBack} />
      ) : wide ? (
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-4 p-4">
          {(["spark", "penny"] as const).map((who) => (
            <section key={who} aria-label={`${NAME[who]}'s chat`} className="raised flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-lg)]">
              <ChatHeader who={who} state={state} title={`${NAME[who]}'s chat`} />
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
        <VerdictSheet state={state} onSkip={() => onSkip(state.picked?.price ?? picked.price)} />
      )}
    </div>
  );
}
