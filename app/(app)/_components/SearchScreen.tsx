"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, SearchIcon, StarIcon } from "lucide-react";
import type { ProductCard } from "@/lib/types";
import { Pixel } from "@/components/pixel/Pixel";
import type { PixelState } from "@/components/pixel/sprites";
import { Said } from "@/components/pixel/Speech";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { LINES, pickLine } from "@/data/lines";
import { SUGGESTIONS } from "@/data/fixtures/suggestions";
import { api } from "../_lib/api";
import { money, store } from "../_lib/format";
import { ProductImage } from "./ProductImage";
import { TopBar } from "./TopBar";

type Status = "idle" | "searching" | "done" | "empty" | "failed" | "busy";

// Product · rating · stores · best price. Phones fold rating and stores under the title.
const COLS = "grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_7rem_5rem_6.5rem]";

function Rating({ score, count }: { score: number; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <StarIcon aria-hidden className="size-3 fill-current" />
      <span className="text-[12px] text-text-2 tabular-nums">{score.toFixed(1)}</span>
      <span className="text-[12px] tabular-nums">({count.toLocaleString("en-US")})</span>
      <span className="sr-only"> stars</span>
    </span>
  );
}

function ResultRow({ card, selected, onPick }: { card: ProductCard; selected: boolean; onPick: () => void }) {
  const stores = `${card.offerCount} ${card.offerCount === 1 ? "store" : "stores"}`;
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        aria-pressed={selected}
        className={`${COLS} relative w-full px-4 py-2.5 text-left transition-colors duration-150 sm:px-6 sm:py-2 ${
          selected ? "bg-primary/10" : "hover:bg-accent"
        } focus-visible:bg-accent focus-visible:outline-none`}
      >
        {selected && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-primary" />}
        <ProductImage src={card.image} alt={card.title} brand={card.brand} className="size-12 sm:size-10" />
        <span className="min-w-0">
          <span className="line-clamp-2 text-[14px] leading-snug text-foreground sm:line-clamp-1 sm:text-[13px]">{card.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
            {card.brand && <span>{card.brand}</span>}
            <span className="flex items-center gap-2 sm:hidden">
              {card.rating && <Rating score={card.rating.score} count={card.rating.count} />}
              <span>{stores}</span>
            </span>
          </span>
        </span>
        <span className="hidden sm:block">{card.rating && <Rating score={card.rating.score} count={card.rating.count} />}</span>
        <span className="hidden text-[12px] text-muted-foreground sm:block">{stores}</span>
        <span className="flex items-center justify-end gap-2">
          <span className="text-right">
            <span className="num block text-[13px] text-foreground">{money(card.bestOffer.price)}</span>
            <span className="block text-[11px] text-muted-foreground sm:hidden">{store(card.bestOffer.merchant)}</span>
          </span>
          {selected && <CheckIcon aria-hidden className="size-3.5 text-primary" />}
        </span>
      </button>
    </li>
  );
}

export function SearchScreen({ onAsk }: { onAsk: (card: ProductCard) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<ProductCard[]>([]);
  const [selected, setSelected] = useState<ProductCard | null>(null);
  const [line, setLine] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K focuses the search; Enter asks about the pick when the search box isn't focused.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = input.current;
      if (!el || el.offsetParent === null) return; // this screen is hidden
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        el.focus();
        el.select();
      } else if (e.key === "Enter" && selected && document.activeElement === document.body) {
        onAsk(selected);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, onAsk]);

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
  const spark: PixelState = status === "searching" ? "lookup" : status === "failed" || status === "busy" ? "sulk" : "idle";
  const penny: PixelState = status === "empty" || selected ? "think" : "idle";
  const say =
    status === "searching" || status === "failed" || status === "busy"
      ? { who: "spark" as const, state: spark, text: line }
      : status === "empty"
        ? { who: "penny" as const, state: penny, text: "Nothing on the shelves for that. Try another?" }
        : selected
          ? { who: "penny" as const, state: penny, text: "Good pick. Shall we argue about it?" }
          : null;

  const form = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        search(query);
      }}
      className="flex w-full gap-2"
    >
      <div className="relative min-w-0 flex-1">
        <label htmlFor="q" className="sr-only">
          What are you thinking of buying?
        </label>
        <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={input}
          id="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={80}
          placeholder="Headphones, a desk, an espresso machine"
          autoComplete="off"
          enterKeyHint="search"
          className="h-11 bg-surface pl-9 text-[16px] sm:h-10 sm:pr-12 sm:text-[14px]"
        />
        <Kbd className="absolute top-1/2 right-2.5 hidden -translate-y-1/2 border border-border bg-surface-2 sm:inline-flex">⌘K</Kbd>
      </div>
      <Button type="submit" disabled={!query.trim() || status === "searching"} className="h-11 px-4 sm:h-10">
        Search
      </Button>
    </form>
  );

  const chips = (
    <div
      className={`scroll-quiet flex gap-1.5 ${
        compact ? "-mx-4 flex-nowrap overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" : "flex-wrap"
      }`}
    >
      {SUGGESTIONS.map((s) => (
        <Button
          key={s}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => search(s)}
          aria-pressed={lastQuery === s}
          className={`h-11 shrink-0 bg-transparent px-3 text-[13px] font-normal sm:h-7 sm:px-2.5 sm:text-[12px] ${
            lastQuery === s ? "border-primary/50 bg-primary/10 text-foreground" : "text-muted-foreground"
          }`}
        >
          {s}
        </Button>
      ))}
    </div>
  );

  const voice = say && (
    <div key={say.text} className="anim-rise flex flex-wrap items-center gap-3">
      <Said who={say.who} state={say.state} live>
        {say.text}
      </Said>
      {(status === "failed" || status === "busy") && (
        <Button variant="outline" onClick={() => search(lastQuery)} className="h-11 sm:h-8">
          Try again
        </Button>
      )}
    </div>
  );

  return (
    <>
      <TopBar crumbs={[]} />
      <main className={`flex flex-1 flex-col ${selected ? "pb-44 sm:pb-24" : "pb-10"}`}>
        {compact ? (
          <section className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:px-6">
            <div className="max-w-2xl">{form}</div>
            {chips}
            {voice}
          </section>
        ) : (
          <section className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 pt-[10vh] sm:pt-[16vh]">
            <div className="flex items-end gap-2">
              <Pixel who="spark" state={spark} scale={2} />
              <Pixel who="penny" state={penny} scale={2} />
            </div>
            <div>
              <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.022em] text-foreground sm:text-[24px]">
                What are you thinking of buying?
              </h1>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                Spark says treat yourself. Penny says check the price. They compare stores, ask you two quick questions, and give you a
                straight answer.
              </p>
            </div>
            {form}
            <div className="flex flex-col gap-2">
              <p className="text-[12px] text-muted-foreground">Try one</p>
              {chips}
            </div>
            {voice}
          </section>
        )}

        {results.length > 0 && (
          <section aria-label="Results" className={`transition-opacity duration-150 ${status === "searching" ? "opacity-40" : ""}`}>
            <div className={`${COLS} border-b border-border px-4 py-2 text-[12px] text-muted-foreground sm:px-6`}>
              <span className="col-span-2">
                {results.length} {results.length === 1 ? "result" : "results"}
              </span>
              <span className="hidden sm:block">Rating</span>
              <span className="hidden sm:block">Stores</span>
              <span className="text-right">Best price</span>
            </div>
            <ul className="divide-y divide-border-soft border-b border-border-soft">
              {results.map((c) => (
                <ResultRow key={c.id} card={c} selected={selected?.id === c.id} onPick={() => setSelected(c)} />
              ))}
            </ul>
          </section>
        )}
      </main>

      {selected && (
        <div className="anim-rise fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface-2 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-5 sm:left-1/2 sm:w-[min(40rem,calc(100%-3rem))] sm:-translate-x-1/2 sm:rounded-lg sm:border sm:p-2 sm:pl-3 sm:shadow-[0_8px_24px_rgb(0_0_0/0.35)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <ProductImage src={selected.image} alt="" brand={selected.brand} className="size-9 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-[13px] text-foreground">{selected.title}</p>
                <p className="text-[12px] text-muted-foreground">
                  Your pick <span className="num text-foreground">{money(selected.bestOffer.price)}</span> at {store(selected.bestOffer.merchant)}
                </p>
              </div>
            </div>
            <Button onClick={() => onAsk(selected)} className="h-11 gap-2 px-4 sm:h-8 sm:px-3">
              Ask Spark and Penny
              <Kbd className="hidden bg-white/15 text-white/80 sm:inline-flex">↵</Kbd>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
