import { StarIcon } from "lucide-react";
import type { VerdictOption } from "@/lib/types";
import { money, store } from "../_lib/format";
import { ProductImage } from "./ProductImage";
import { StoreLink } from "./StoreLink";

// The verdict's side-by-side: their pick vs. your original pick (or just the one, if they agree).
// All values come from the server's stored offers (Verdict.options).
export function VerdictCompare({ options }: { options: VerdictOption[] }) {
  const cheapest = Math.min(...options.map((o) => o.price));
  return (
    <div className={`grid gap-3 ${options.length > 2 ? "sm:grid-cols-3" : options.length > 1 ? "sm:grid-cols-2" : ""}`}>
      {options.map((o) => (
        <Option key={`${o.productId}:${o.offerId}`} o={o} single={options.length === 1} cheapest={options.length > 1 && o.price === cheapest} />
      ))}
    </div>
  );
}

function Option({ o, single, cheapest }: { o: VerdictOption; single: boolean; cheapest: boolean }) {
  const label = single
    ? o.picked
      ? "Your pick, and theirs"
      : "Their pick"
    : o.recommended
      ? "Their pick"
      : "Your pick";
  return (
    <article
      className={`flex flex-col gap-3 rounded-lg border p-3 ${o.recommended ? "border-primary/40 bg-primary/[0.06]" : "border-border bg-surface"}`}
    >
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className={o.recommended ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</span>
        {cheapest && <span className="rounded-sm border border-positive/40 px-1.5 text-positive">Cheapest</span>}
      </div>
      <div className="flex gap-3">
        <ProductImage src={o.image} alt={o.title} brand={o.brand} className="size-14 shrink-0" />
        <div className="min-w-0">
          <p className="line-clamp-2 text-[13px] leading-snug text-foreground">{o.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
            {o.brand && <span>{o.brand}</span>}
            {o.rating && (
              <span className="inline-flex items-center gap-1">
                <StarIcon aria-hidden className="size-3 fill-current" />
                <span className="text-text-2 tabular-nums">{o.rating.score.toFixed(1)}</span>
                <span className="tabular-nums">({o.rating.count.toLocaleString("en-US")})</span>
              </span>
            )}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-y-1.5 text-[12px]">
        <dt className="text-muted-foreground">Price</dt>
        <dd className="text-foreground">
          <span className="num text-[14px]">{money(o.price)}</span>
          {o.compareAtPrice && <span className="num ml-1.5 text-muted-foreground line-through">{money(o.compareAtPrice)}</span>}
        </dd>
        <dt className="text-muted-foreground">Store</dt>
        <dd className="truncate text-foreground">{store(o.merchant)}</dd>
        <dt className="text-muted-foreground">Stock</dt>
        <dd className={o.inStock ? "text-foreground" : "text-muted-foreground"}>{o.inStock ? "In stock" : "Out of stock"}</dd>
      </dl>
      <StoreLink url={o.url} merchant={o.merchant} className="w-full" />
    </article>
  );
}
