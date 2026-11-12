"use client";

import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "lucide-react";
import type { ProductCard } from "@/lib/types";
import { Pixel } from "@/components/pixel/Pixel";
import type { PixelState } from "@/components/pixel/sprites";
import { Said } from "@/components/pixel/Speech";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { LINES, pickLine } from "@/data/lines";
import { SUGGESTIONS } from "@/data/fixtures/suggestions";
import { suggest } from "@/data/typeahead";
import { sounds } from "../_lib/sounds";
import { api } from "../_lib/api";
import { money, store } from "../_lib/format";
import { ProductImage } from "./ProductImage";
import { ProductTile, TileSkeleton } from "./ProductTile";
import { HistoryLink, RecentDebates } from "./HistoryNav";
import { TopBar } from "./TopBar";
import { StoreLink } from "./StoreLink";

type Status = "idle" | "searching" | "done" | "empty" | "failed" | "busy";

const isLink = (q: string) => /^https?:\/\/\S+$/i.test(q.trim());

// A suggestion with the typed part in full colour and the rest muted.
function Match({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  const at = q ? text.indexOf(q) : -1;
  if (at < 0) return <span className="truncate text-text-2">{text}</span>;
  return (
    <span className="truncate">
      <span className="text-muted-foreground">{text.slice(0, at)}</span>
      <span className="text-foreground">{text.slice(at, at + q.length)}</span>
      <span className="text-muted-foreground">{text.slice(at + q.length)}</span>
    </span>
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
  const [matchNote, setMatchNote] = useState(""); // a pasted link matched by its name, not its page
  const resultsRef = useRef<HTMLElement>(null);
  const [typeOpen, setTypeOpen] = useState(false);
  const [hi, setHi] = useState(-1); // highlighted suggestion, -1 = none
  const hints = typeOpen ? suggest(query) : [];

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
    const raw = q.trim();
    const text = isLink(raw) ? raw.slice(0, 500) : raw.slice(0, 80); // a pasted product link is looked up, not searched
    if (!text) return;
    setTypeOpen(false);
    setHi(-1);
    setQuery(text);
    setLastQuery(text);
    setStatus("searching");
    sounds.search();
    setSelected(null);
    setMatchNote("");
    setLine(pickLine(LINES.spark.lookup, line));
    try {
      const res = await api.search(text);
      if (res.status === 429) {
        setStatus("busy");
        sounds.error();
        setLine(pickLine(LINES.errors.busy));
        return;
      }
      const body = (await res.json()) as { products?: ProductCard[]; error?: string; matchedBy?: "page" | "name" };
      if (res.status === 404 && isLink(text)) {
        setResults([]);
        setLine(body.error || "I couldn't read a price from that link. Try another?");
        setStatus("empty");
        sounds.error();
        return;
      }
      if (!res.ok || !body.products) throw new Error();
      setResults(body.products);
      setStatus(body.products.length ? "done" : "empty");
      setMatchNote(body.matchedBy === "name" ? "I couldn't open that page, so I matched the product by the name in the link." : "");
      // Results appear under the search; bring them into view without leaving this page.
      if (body.products.length) requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch {
      setStatus("failed");
      sounds.error();
      setLine(pickLine(LINES.errors.failed));
    }
  }

  const hasResults = results.length > 0 || status === "searching";
  const spark: PixelState = status === "searching" ? "lookup" : status === "failed" || status === "busy" ? "sulk" : "idle";
  const penny: PixelState = status === "empty" || selected ? "think" : "idle";
  const say =
    status === "searching" || status === "failed" || status === "busy"
      ? { who: "spark" as const, state: spark, text: line }
      : status === "empty"
        ? {
            who: "penny" as const,
            state: penny,
            text: isLink(lastQuery) ? line : "Nothing on the shelves for that. Try another?",
          }
        : selected
          ? { who: "penny" as const, state: penny, text: "Good pick. Shall we argue about it?" }
          : matchNote
            ? { who: "penny" as const, state: penny, text: matchNote }
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
          onChange={(e) => {
            setQuery(e.target.value);
            setTypeOpen(true);
            setHi(-1);
          }}
          onFocus={() => setTypeOpen(true)}
          onBlur={() => setTypeOpen(false)}
          onKeyDown={(e) => {
            if (!hints.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHi((i) => (i + 1) % hints.length);
              sounds.tick();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHi((i) => (i <= 0 ? hints.length - 1 : i - 1));
              sounds.tick();
            } else if (e.key === "Enter" && hi >= 0 && hi < hints.length) {
              e.preventDefault();
              search(hints[hi]);
            } else if (e.key === "Escape") {
              e.preventDefault();
              setTypeOpen(false);
              setHi(-1);
            }
          }}
          role="combobox"
          aria-expanded={hints.length > 0}
          aria-controls="q-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={hi >= 0 && hi < hints.length ? `q-s-${hi}` : undefined}
          maxLength={500}
          placeholder="Headphones, a desk… or paste a product link"
          autoComplete="off"
          enterKeyHint="search"
          className="h-11 bg-surface pl-9 text-[16px] sm:h-10 sm:pr-12 sm:text-[14px]"
        />
        <Kbd className="absolute top-1/2 right-2.5 hidden -translate-y-1/2 border border-border bg-surface-2 sm:inline-flex">⌘K</Kbd>
        {hints.length > 0 && (
          <ul
            id="q-suggestions"
            role="listbox"
            aria-label="Suggestions"
            className="anim-rise absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-md border border-border bg-surface-2 py-1 shadow-[0_8px_24px_rgb(0_0_0/0.35)]"
          >
            {hints.map((h, i) => (
              <li
                key={h}
                id={`q-s-${i}`}
                role="option"
                aria-selected={i === hi}
                // mousedown, not click: runs before the input's blur closes the list
                onMouseDown={(e) => {
                  e.preventDefault();
                  search(h);
                }}
                onMouseEnter={() => setHi(i)}
                className={`flex h-11 cursor-pointer items-center gap-2.5 px-3 text-[14px] sm:h-8 sm:text-[13px] ${i === hi ? "bg-accent" : ""}`}
              >
                <SearchIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                <Match text={h} query={query} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button type="submit" disabled={!query.trim() || status === "searching"} className="h-11 px-4 sm:h-10">
        Search
      </Button>
    </form>
  );

  const chips = (
    <div
      className="flex flex-wrap gap-1.5"
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
      <TopBar crumbs={[]} right={<HistoryLink />} />
      <main className={`flex flex-1 flex-col ${selected ? "pb-44 sm:pb-24" : "pb-10"}`}>
        <section className={`mx-auto flex w-full max-w-xl flex-col gap-5 px-4 ${hasResults ? "pt-10 sm:pt-14" : "pt-[10vh] sm:pt-[16vh]"}`}>
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
          {!hasResults && <RecentDebates />}
          {voice}
        </section>

        {status === "searching" && (
          <section aria-label="Loading results" aria-busy className="mx-auto w-full max-w-6xl px-4 pt-10 pb-4 sm:px-6">
            <div className="mb-3 h-3 w-40 animate-pulse rounded bg-surface-2 motion-reduce:animate-none" />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }, (_, i) => (
                <TileSkeleton key={i} />
              ))}
            </ul>
          </section>
        )}

        {results.length > 0 && status !== "searching" && (
          <section ref={resultsRef} aria-label="Results" className="mx-auto w-full max-w-6xl scroll-mt-4 pt-10">
            <p className="px-4 pb-3 text-[12px] text-muted-foreground sm:px-6">
              {results.length} {results.length === 1 ? "result" : "results"} · best price across stores
              {selected ? "" : " · tap one to pick it"}
            </p>
            <ul className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-4">
              {results.map((c) => (
                <ProductTile
                  key={c.id}
                  card={c}
                  selected={selected?.id === c.id}
                  onPick={() => {
                    setSelected(c);
                    sounds.pick();
                  }}
                />
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
            <div className="flex gap-2">
              {/* Phones: a short "View" so the main button keeps its room. */}
              <StoreLink url={selected.bestOffer.url} merchant={selected.bestOffer.merchant} compact className="shrink-0 px-3 sm:hidden" />
              <StoreLink url={selected.bestOffer.url} merchant={selected.bestOffer.merchant} className="hidden sm:inline-flex" />
              <Button onClick={() => onAsk(selected)} className="h-11 min-w-0 flex-1 gap-2 px-4 sm:h-8 sm:flex-none sm:px-3">
                Ask Spark and Penny
                <Kbd className="hidden bg-white/15 text-white/80 sm:inline-flex">↵</Kbd>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
