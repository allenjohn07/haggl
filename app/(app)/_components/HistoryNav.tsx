"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { HistoryIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { historyServerSnapshot, readHistory, subscribeHistory } from "../_lib/history";
import { money } from "../_lib/format";
import { sounds } from "../_lib/sounds";
import { callLabel } from "./VerdictSheet";
import { ProductImage } from "./ProductImage";

// Top-bar link to the history page.
export function HistoryLink() {
  const list = useSyncExternalStore(subscribeHistory, readHistory, historyServerSnapshot);
  return (
    <Link
      href="/history"
      onClick={() => sounds.tap()}
      className={cn(buttonVariants({ variant: "ghost" }), "h-11 gap-1.5 px-2.5 text-[13px] font-normal text-muted-foreground sm:h-8")}
    >
      <HistoryIcon aria-hidden className="size-4" />
      History
      {list.length > 0 && <span className="rounded-sm bg-surface-2 px-1.5 text-[11px] text-text-2 tabular-nums">{list.length}</span>}
    </Link>
  );
}

// "Recent" on the landing page: the last three debates, each linking to the history page.
export function RecentDebates() {
  const list = useSyncExternalStore(subscribeHistory, readHistory, historyServerSnapshot);
  if (!list.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-muted-foreground">Recent</p>
        <Link href="/history" onClick={() => sounds.tap()} className="text-[12px] text-muted-foreground hover:text-foreground">
          See all
        </Link>
      </div>
      <ul className="divide-y divide-border-soft overflow-hidden rounded-lg border border-border bg-surface">
        {list.slice(0, 3).map((e) => (
          <li key={e.debateId}>
            <Link
              href="/history"
              onClick={() => sounds.tap()}
              className="flex items-center gap-3 px-3 py-2 transition-colors duration-150 hover:bg-surface-2"
            >
              <ProductImage src={e.product.image} alt="" brand={e.product.brand} className="size-9 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-foreground">{e.product.title}</span>
                <span className="block truncate text-[12px] text-muted-foreground">
                  {callLabel(e.verdict)}
                  {e.outcome?.kind === "bought" ? ` · bought for ${money(e.outcome.price)}` : e.outcome?.kind === "skipped" ? " · skipped" : ""}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
