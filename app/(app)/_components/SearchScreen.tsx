"use client";

import { useState } from "react";
import type { ProductCard } from "@/lib/types";
import { Pixel } from "@/components/pixel/Pixel";
import { Speech } from "@/components/pixel/Speech";
import { LINES, pickLine } from "@/data/lines";
import { api } from "../_lib/api";
import { money, store } from "../_lib/format";
import { ProductImage } from "./ProductImage";

// Same six as data/fixtures/suggestions.ts (search lane); each one has fixture results.
const SUGGESTIONS = ["noise cancelling headphones", "espresso machine", "running shoes", "mechanical keyboard", "air fryer", "standing desk"];

type Status = "idle" | "searching" | "done" | "empty" | "failed" | "busy";

function Stars({ score, count }: { score: number; count: number }) {
  return (
    <span className="text-xs text-muted">
      <span className="text-spark-2" aria-hidden>
        ★
      </span>{" "}
      {score.toFixed(1)} <span className="text-faint">({count.toLocaleString("en-US")})</span>
      <span className="sr-only"> stars</span>
    </span>
  );
}

function ResultCard({ card, selected, onPick }: { card: ProductCard; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={`anim-land group flex flex-col overflow-hidden rounded-[var(--radius)] border text-left transition-all ${
        selected ? "border-text bg-surface-2 ring-2 ring-text/80" : "border-line-soft bg-surface hover:-translate-y-0.5 hover:border-line"
      }`}
    >
      <ProductImage src={card.image} alt={card.title} brand={card.brand} className="aspect-[4/3] w-full" />
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        {card.brand && <p className="text-xs font-medium uppercase tracking-wider text-faint">{card.brand}</p>}
        <p className="line-clamp-2 text-[15px] font-medium leading-snug text-text">{card.title}</p>
        {card.rating && <Stars score={card.rating.score} count={card.rating.count} />}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
          <div>
            <p className="font-mono text-base font-semibold text-text sm:text-lg">{money(card.bestOffer.price)}</p>
            <p className="text-xs text-muted">at {store(card.bestOffer.merchant)}</p>
          </div>
          <span className="rounded-full bg-surface-3 px-2.5 py-1 text-xs text-muted">
            {card.offerCount} {card.offerCount === 1 ? "store" : "stores"}
          </span>
        </div>
      </div>
    </button>
  );
}

export function SearchScreen({ onAsk }: { onAsk: (card: ProductCard) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<ProductCard[]>([]);
  const [selected, setSelected] = useState<ProductCard | null>(null);
  const [line, setLine] = useState("");
  const [lastQuery, setLastQuery] = useState("");

  async function search(q: string) {
    const text = q.trim().slice(0, 80);
    if (!text) return;
    setQuery(text);
    setLastQuery(text);
    setStatus("searching");
    setSelected(null);
    setLine(pickLine(LINES.spark.lookup, line));
    try {
      const res = await api.search(text);
      if (res.status === 429) {
        setStatus("busy");
        setLine(pickLine(LINES.errors.busy));
        return;
      }
      const body = (await res.json()) as { products?: ProductCard[] };
      if (!res.ok || !body.products) throw new Error();
      setResults(body.products);
      setStatus(body.products.length ? "done" : "empty");
    } catch {
      setStatus("failed");
      setLine(pickLine(LINES.errors.failed));
    }
  }

  const compact = results.length > 0 || status === "searching";
  const spark = status === "searching" ? "lookup" : status === "failed" || status === "busy" ? "sulk" : "idle";
  const penny = status === "empty" ? "think" : selected ? "think" : "idle";
  const say =
    status === "searching" || status === "failed" || status === "busy"
      ? { who: "spark" as const, text: line }
      : status === "empty"
        ? { who: "penny" as const, text: "Nothing on the shelves for that. Try another?" }
        : selected
          ? { who: "penny" as const, text: "Good pick. Shall we argue about it?" }
          : null;

  return (
    <main className={`flex flex-1 flex-col ${selected ? "pb-40 sm:pb-28" : "pb-10"}`}>
      <header className="flex items-center justify-between px-4 pt-4 sm:px-8">
        <span className="flex items-center gap-2 text-lg font-semibold tracking-tight text-text">
          <span aria-hidden className="flex gap-1">
            <span className="size-2 rounded-full bg-spark" />
            <span className="size-2 rounded-full bg-penny" />
          </span>
          haggl
        </span>
        <span className="text-xs text-faint">Two advisors. One honest answer.</span>
      </header>

      <section className={`flex flex-col items-center px-4 text-center transition-all sm:px-8 ${compact ? "pt-6" : "pt-[8vh] sm:pt-[10vh]"}`}>
        {!compact && (
          <div className="mb-2 flex items-end gap-10 sm:hidden">
            <Pixel who="spark" state={spark} scale={3} />
            <Pixel who="penny" state={penny} scale={3} />
          </div>
        )}
        <div className="flex w-full max-w-4xl items-end justify-center gap-3 sm:gap-8">
          <Pixel who="spark" state={spark} scale={compact ? 2 : 3} className={`mb-1 ${compact ? "" : "hidden sm:block"}`} />
          <h1
            className={`font-hand font-bold leading-[1.05] text-text ${compact ? "text-[1.7rem] sm:text-4xl" : "text-[2.6rem] sm:text-6xl lg:text-7xl"}`}
          >
            What are you thinking of buying?
          </h1>
          <Pixel who="penny" state={penny} scale={compact ? 2 : 3} className={`mb-1 ${compact ? "" : "hidden sm:block"}`} />
        </div>
        {!compact && (
          <p className="mt-4 max-w-xl text-[15px] text-muted">
            Spark says treat yourself. Penny says check the price. They&apos;ll check other stores, ask you two quick questions, and give you a straight answer.
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            search(query);
          }}
          className="mt-6 flex w-full max-w-2xl items-center gap-2 rounded-full border border-line bg-surface p-1.5 pl-5 shadow-[var(--shadow-raised)] focus-within:border-muted"
        >
          <label htmlFor="q" className="sr-only">
            What are you thinking of buying?
          </label>
          <input
            id="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={80}
            placeholder="Headphones, a desk, an espresso machine"
            autoComplete="off"
            enterKeyHint="search"
            className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-text placeholder:text-faint focus:outline-none"
          />
          <button
            type="submit"
            disabled={!query.trim() || status === "searching"}
            className="min-h-11 shrink-0 rounded-full bg-text px-5 font-semibold text-ink transition-opacity disabled:opacity-40"
          >
            Search
          </button>
        </form>

        <div
          className={`scroll-quiet mt-4 flex max-w-3xl gap-2 ${
            compact ? "-mx-4 w-[calc(100%+2rem)] flex-nowrap overflow-x-auto px-4 sm:mx-0 sm:w-auto sm:flex-wrap sm:justify-center sm:px-0" : "flex-wrap justify-center"
          }`}
        >
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => search(s)}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm transition-colors ${
                lastQuery === s ? "border-muted bg-surface-2 text-text" : "border-line-soft bg-surface text-muted hover:border-line hover:text-text"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-5 flex min-h-12 items-center justify-center">
          {say && (
            <div key={say.text} className="anim-pop-in">
              <Speech who={say.who} tail="down" live>
                {say.text}
              </Speech>
            </div>
          )}
        </div>
        {(status === "failed" || status === "busy") && (
          <button type="button" onClick={() => search(lastQuery)} className="mt-2 min-h-11 rounded-full border border-line px-5 text-sm font-medium text-text">
            Try again
          </button>
        )}
      </section>

      {results.length > 0 && (
        <section aria-label="Results" className={`mt-4 px-4 sm:px-8 ${status === "searching" ? "opacity-50" : ""}`}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] sm:gap-4">
            {results.map((c) => (
              <ResultCard key={c.id} card={c} selected={selected?.id === c.id} onPick={() => setSelected(c)} />
            ))}
          </div>
        </section>
      )}

      {selected && (
        <div className="anim-sheet fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/85 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <ProductImage src={selected.image} alt="" brand={selected.brand} small className="size-12 shrink-0 rounded-xl" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">{selected.title}</p>
                <p className="text-sm text-muted">
                  Your pick: <span className="font-mono font-semibold text-text">{money(selected.bestOffer.price)}</span> at{" "}
                  {store(selected.bestOffer.merchant)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onAsk(selected)}
              className="min-h-12 shrink-0 rounded-full bg-gradient-to-r from-spark to-penny px-7 text-base font-semibold text-ink shadow-[0_8px_30px_-8px_var(--spark-glow)] transition-transform active:scale-[0.98]"
            >
              Ask my advisors
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
