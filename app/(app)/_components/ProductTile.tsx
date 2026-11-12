import { CheckIcon, StarIcon } from "lucide-react";
import type { ProductCard } from "@/lib/types";
import { money, store } from "../_lib/format";

// A product as shopping sites show it: big photo, title, rating, price. Tapping it picks it.
export function ProductTile({ card, selected, onPick }: { card: ProductCard; selected: boolean; onPick: () => void }) {
  const stores = `${card.offerCount} ${card.offerCount === 1 ? "store" : "stores"}`;
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        aria-pressed={selected}
        className={`group relative flex h-full w-full flex-col overflow-hidden rounded-lg border text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          selected ? "border-primary bg-primary/[0.07]" : "border-border bg-surface hover:border-white/15 hover:bg-surface-2"
        }`}
      >
        <Photo card={card} />
        {selected && (
          <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-white shadow">
            <CheckIcon aria-hidden className="size-3.5" />
            <span className="sr-only">Selected</span>
          </span>
        )}
        <span className="flex flex-1 flex-col gap-1 p-3">
          {card.brand && <span className="truncate text-[11px] tracking-wide text-muted-foreground uppercase">{card.brand}</span>}
          <span className="line-clamp-2 text-[13px] leading-snug text-foreground">{card.title}</span>
          {card.rating && (
            <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
              <StarIcon aria-hidden className="size-3 fill-current text-[#e9b949]" />
              <span className="text-text-2 tabular-nums">{card.rating.score.toFixed(1)}</span>
              <span className="tabular-nums">({card.rating.count.toLocaleString("en-US")})</span>
              <span className="sr-only"> stars</span>
            </span>
          )}
          <span className="mt-auto pt-1.5">
            <span className="num block text-[16px] text-foreground">{money(card.bestOffer.price)}</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              at {store(card.bestOffer.merchant)} · {stores}
            </span>
          </span>
        </span>
      </button>
    </li>
  );
}

// Square photo on a light tile (most store photos have white backgrounds); a quiet initial if there's none.
function Photo({ card }: { card: ProductCard }) {
  if (card.image) {
    return (
      <span className="block aspect-square w-full overflow-hidden bg-[#ecebe8]">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote store images, no next/image config */}
        <img
          src={card.image}
          alt={card.title}
          loading="lazy"
          className="h-full w-full object-contain p-[12%] mix-blend-multiply transition-transform duration-200 group-hover:scale-[1.03]"
        />
      </span>
    );
  }
  const name = (card.brand || card.title).trim();
  return (
    <span aria-hidden className="flex aspect-square w-full items-center justify-center border-b border-border bg-surface-2">
      <span className="text-[28px] font-semibold text-muted-foreground">{name.charAt(0).toUpperCase()}</span>
    </span>
  );
}
