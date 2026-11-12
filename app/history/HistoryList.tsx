"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ListIcon, ReceiptIcon } from "lucide-react";
import { Pixel } from "@/components/pixel/Pixel";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProductImage } from "@/app/(app)/_components/ProductImage";
import { StoreLink } from "@/app/(app)/_components/StoreLink";
import { Transcript } from "@/app/(app)/_components/Transcript";
import { callLabel } from "@/app/(app)/_components/VerdictSheet";
import { money, store } from "@/app/(app)/_lib/format";
import { clearHistory, historyServerSnapshot, readHistory, subscribeHistory, type HistoryEntry } from "@/app/(app)/_lib/history";
import { sounds } from "@/app/(app)/_lib/sounds";
import { useWide } from "@/app/(app)/_lib/useWide";

const when = (at: number) =>
  new Date(at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function HistoryList() {
  const list = useSyncExternalStore(subscribeHistory, readHistory, historyServerSnapshot);
  const wide = useWide();
  const [open, setOpen] = useState<HistoryEntry | null>(null);

  if (!list.length) {
    return (
      <div className="flex flex-col items-start gap-4 pt-[8vh]">
        <div className="flex items-end gap-2">
          <Pixel who="spark" state="idle" scale={2} />
          <Pixel who="penny" state="idle" scale={2} />
        </div>
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-foreground">No debates yet</h1>
        <p className="text-[14px] text-muted-foreground">Your verdicts, purchases and transcripts will show up here. They&apos;re kept in this browser only.</p>
        <Link href="/app" className={cn(buttonVariants(), "h-11 sm:h-9")} onClick={() => sounds.tap()}>
          Ask about something
        </Link>
      </div>
    );
  }

  const bought = list.filter((e) => e.outcome?.kind === "bought").length;
  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-foreground">History</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {list.length} {list.length === 1 ? "debate" : "debates"} · {bought} {bought === 1 ? "purchase" : "purchases"} · kept in this browser
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            if (window.confirm("Clear your Haggl history in this browser?")) {
              sounds.close();
              clearHistory();
            }
          }}
          className="h-11 text-[13px] text-muted-foreground sm:h-8"
        >
          Clear
        </Button>
      </div>

      <ul className="mt-5 divide-y divide-border-soft overflow-hidden rounded-lg border border-border bg-surface">
        {list.map((e) => (
          <Row key={e.debateId} e={e} onTranscript={() => {
            sounds.open();
            setOpen(e);
          }} />
        ))}
      </ul>

      <Transcript
        items={open?.items ?? []}
        open={!!open}
        onOpenChange={(o) => {
          if (!o) {
            sounds.close();
            setOpen(null);
          }
        }}
        wide={wide}
      />
    </>
  );
}

function Row({ e, onTranscript }: { e: HistoryEntry; onTranscript: () => void }) {
  const v = e.verdict;
  const positive = v.call === "buy" || v.call === "buy_elsewhere";
  const recommended = v.options?.find((o) => o.recommended);
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 gap-3">
        <ProductImage src={e.product.image} alt={e.product.title} brand={e.product.brand} className="size-14 shrink-0" />
        <div className="min-w-0">
          <p className="line-clamp-1 text-[14px] text-foreground">{e.product.title}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {when(e.at)} · your pick <span className="num text-text-2">{money(e.picked.price)}</span> at {store(e.picked.merchant)}
            {Array.isArray(e.compare) && e.compare.length > 0 && <> · compared with {e.compare.length}</>}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <span aria-hidden className={`size-1.5 rounded-full ${positive ? "bg-positive" : "bg-faint"}`} />
              {callLabel(v, recommended ? store(recommended.merchant) : undefined)}
            </span>
            <span className="text-muted-foreground">“{v.headline}”</span>
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {e.outcome?.kind === "bought" ? (
              <>
                Bought <span className="text-text-2">{e.outcome.title}</span> for <span className="num text-text-2">{money(e.outcome.price)}</span>
                {e.outcome.merchant && <> at {store(e.outcome.merchant)}</>}
              </>
            ) : e.outcome?.kind === "skipped" ? (
              <>Skipped, kept <span className="num text-positive">{money(e.picked.price)}</span></>
            ) : (
              "No decision yet"
            )}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button variant="outline" onClick={onTranscript} className="h-11 gap-1.5 text-[13px] font-normal sm:h-8">
          <ListIcon aria-hidden className="size-3.5" />
          Transcript
        </Button>
        {e.outcome?.kind === "bought" ? (
          <Link
            href={`/receipt/${encodeURIComponent(e.outcome.purchaseId)}`}
            onClick={() => sounds.tap()}
            className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-1.5 text-[13px] font-normal sm:h-8")}
          >
            <ReceiptIcon aria-hidden className="size-3.5" />
            Receipt
          </Link>
        ) : (
          <StoreLink url={e.picked.url} merchant={e.picked.merchant} />
        )}
      </div>
    </li>
  );
}
