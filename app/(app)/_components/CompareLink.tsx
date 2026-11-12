"use client";

import { useState } from "react";
import { ArrowLeftRightIcon, LinkIcon, PlusIcon, XIcon } from "lucide-react";
import type { ProductCard } from "@/lib/types";
import { Said } from "@/components/pixel/Speech";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "../_lib/api";
import { money, store } from "../_lib/format";
import { sounds } from "../_lib/sounds";

// "Compare with a link": paste a product page (Amazon, a brand's store, anywhere). The server looks it
// up through Channel3 and the advisors weigh it against your pick.
export function CompareLink({ onAdd, pickedId }: { onAdd: (c: ProductCard) => void; pickedId: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [note, setNote] = useState(""); // shown after a link is matched by name

  async function add() {
    const link = url.trim();
    if (!/^https?:\/\/\S+$/i.test(link)) {
      setState("error");
      setError("Paste a full link that starts with https://");
      sounds.error();
      return;
    }
    setState("loading");
    sounds.search();
    try {
      const res = await api.search(link);
      const body = (await res.json().catch(() => ({}))) as { products?: ProductCard[]; error?: string; matchedBy?: "page" | "name" };
      const card = body.products?.[0];
      if (!res.ok || !card) throw new Error(body.error || "Couldn't read a price from that page. Try another link?");
      if (card.id === pickedId) throw new Error("That's the product you already picked.");
      onAdd(card);
      setNote(body.matchedBy === "name" ? `Matched by the name in the link: ${card.title}` : "");
      sounds.pick();
      setOpen(false);
      setUrl("");
      setState("idle");
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "Couldn't read that link.");
      sounds.error();
    }
  }

  if (!open) {
    return (
      <>
      {note && <p className="text-[12px] text-muted-foreground">{note}</p>}
      <Button
        variant="ghost"
        onClick={() => {
          sounds.open();
          setOpen(true);
        }}
        className="h-11 justify-start gap-1.5 self-start px-2 text-[12px] text-muted-foreground sm:h-7"
      >
        <PlusIcon aria-hidden className="size-3.5" />
        Compare with a product link
      </Button>
      </>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        add();
      }}
      className="flex flex-col gap-1.5"
    >
      <div className="flex gap-2">
        <label htmlFor="compare-url" className="sr-only">
          Product link to compare
        </label>
        <Input
          id="compare-url"
          autoFocus
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (state === "error") setState("idle");
          }}
          placeholder="Paste a product link (Amazon, Best Buy, any store)"
          inputMode="url"
          autoComplete="off"
          maxLength={500}
          disabled={state === "loading"}
          className="h-11 min-w-0 flex-1 bg-surface text-[16px] sm:h-8 sm:text-[13px]"
        />
        <Button type="submit" variant="outline" disabled={!url.trim() || state === "loading"} className="h-11 sm:h-8">
          Add
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Cancel"
          onClick={() => {
            sounds.close();
            setOpen(false);
            setState("idle");
          }}
          className="size-11 text-muted-foreground sm:size-8"
        >
          <XIcon aria-hidden />
        </Button>
      </div>
      {state === "loading" && (
        <Said who="penny" state="lookup" scale={1} live>
          Pulling up that page. One sec.
        </Said>
      )}
      {state === "error" && (
        <p role="alert" className="text-[12px] text-muted-foreground">
          {error}
        </p>
      )}
    </form>
  );
}

// A product the user is comparing against their pick, with a remove button.
export function CompareChip({ card, onRemove }: { card: ProductCard; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px]">
      <ArrowLeftRightIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-text-2">
        vs <span className="text-foreground">{card.title}</span> · <span className="num text-foreground">{money(card.bestOffer.price)}</span> at{" "}
        {store(card.bestOffer.merchant)}
      </span>
      <Button variant="ghost" size="icon" aria-label={`Stop comparing ${card.title}`} onClick={onRemove} className="size-11 shrink-0 text-muted-foreground sm:size-6">
        <XIcon aria-hidden />
      </Button>
    </div>
  );
}
