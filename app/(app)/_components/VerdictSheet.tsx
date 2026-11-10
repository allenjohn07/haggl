"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Offer, ProductCard, Verdict } from "@/lib/types";
import { Pixel } from "@/components/pixel/Pixel";
import { Speech } from "@/components/pixel/Speech";
import { LINES, pickLine } from "@/data/lines";
import type { ChatItem, DebateState } from "../_lib/useDebate";
import { api } from "../_lib/api";
import { money, store } from "../_lib/format";

type Target = { productId: string; offerId: string };

// The verdict's store and title. Taken from what the user already saw: the pick or the evidence cards.
function describe(v: Verdict, product: ProductCard, picked: Offer, items: ChatItem[]) {
  let merchant = v.offerId === picked.offerId ? picked.merchant : undefined;
  let title = v.productId === product.id ? product.title : undefined;
  for (const it of items) {
    if (it.kind !== "evidence") continue;
    for (const e of it.evidence.items) {
      if (e.offerId === v.offerId && it.evidence.kind === "prices") merchant ??= e.label;
      if (e.productId === v.productId && it.evidence.kind === "alternatives") title ??= e.label;
    }
  }
  merchant ??= v.offerId.includes(":") ? v.offerId.split(":").pop() : undefined;
  if (v.productId === product.id && v.offerId === product.bestOffer.offerId) merchant ??= product.bestOffer.merchant;
  return { merchant: merchant ? store(merchant) : undefined, title: title ?? product.title };
}

function callLabel(v: Verdict, merchant?: string) {
  if (v.call === "buy") return "Buy it";
  if (v.call === "buy_elsewhere") return merchant ? `Buy it cheaper at ${merchant}` : "Buy it cheaper elsewhere";
  if (v.call === "wait") return "Wait";
  return "Skip it";
}

export function VerdictSheet({ state, onSkip }: { state: DebateState; onSkip: () => void }) {
  const v = state.verdict!;
  const product = state.product!;
  const picked = state.picked!;
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [buying, setBuying] = useState<"idle" | "paying" | "failed" | "busy">("idle");
  const [payLine, setPayLine] = useState("");
  const [lastTarget, setLastTarget] = useState<Target | null>(null);
  const slowTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(slowTimer.current), []);

  const { merchant, title } = describe(v, product, picked, state.items);
  const differs = v.productId !== product.id || v.offerId !== picked.offerId;
  const positive = v.call === "buy" || v.call === "buy_elsewhere";

  async function buy(target: Target) {
    setLastTarget(target);
    setBuying("paying");
    setPayLine(pickLine(LINES.spark.pay, payLine));
    clearTimeout(slowTimer.current);
    slowTimer.current = setTimeout(() => setPayLine(pickLine(LINES.errors.slow)), 7000);
    try {
      const res = await api.buy(state.debateId!, target.productId, target.offerId);
      const body = (await res.json().catch(() => ({}))) as { approveUrl?: string; purchaseId?: string };
      if (res.ok && body.approveUrl) {
        window.location.assign(body.approveUrl);
        return;
      }
      if (res.status === 502 && body.purchaseId) {
        router.push(`/receipt/${encodeURIComponent(body.purchaseId)}`);
        return;
      }
      clearTimeout(slowTimer.current);
      setBuying(res.status === 429 ? "busy" : "failed");
      setPayLine(pickLine(LINES.errors[res.status === 429 ? "busy" : "failed"]));
    } catch {
      clearTimeout(slowTimer.current);
      setBuying("failed");
      setPayLine(pickLine(LINES.errors.failed));
    }
  }

  if (!open) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="raised flex min-h-12 items-center gap-3 rounded-full px-5 font-medium text-text"
        >
          <span className="font-hand text-lg">{v.headline}</span>
          <span className="text-muted">See the verdict</span>
        </button>
      </div>
    );
  }

  const sparkState = buying === "paying" ? "pay" : buying === "idle" ? state.moods.spark : "sulk";
  const pennyState = buying === "paying" ? "idle" : buying === "idle" ? state.moods.penny : "think";

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/55 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="verdict-headline">
      <div className="anim-sheet scroll-quiet max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[var(--radius-lg)] border border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-2xl sm:rounded-[var(--radius-lg)]">
        <div className="flex items-center justify-between px-5 pt-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">The verdict</span>
          <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-full px-3 text-sm text-muted hover:text-text">
            Read the chat
          </button>
        </div>

        <div className="flex items-end justify-center gap-4 px-5 pt-2">
          <Pixel who="spark" state={sparkState} scale={4} />
          <Pixel who="penny" state={pennyState} scale={4} />
        </div>

        <div className="px-6 pb-6 pt-3 text-center">
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
              positive ? "bg-penny-2 text-ink" : "bg-spark-2 text-ink"
            }`}
          >
            {callLabel(v, merchant)}
          </span>
          <h2 id="verdict-headline" className="mt-3 font-hand text-3xl font-bold leading-tight text-text sm:text-4xl">
            {v.headline}
          </h2>
          <ul className="mx-auto mt-4 max-w-md space-y-1.5 text-left font-hand text-lg leading-snug text-muted">
            {v.reasons.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className={i % 2 ? "text-penny" : "text-spark"}>
                  ✦
                </span>
                <span>{r}</span>
              </li>
            ))}
          </ul>

          <div className="mx-auto mt-5 flex max-w-md items-center justify-between gap-4 rounded-2xl bg-bg-soft px-4 py-3 text-left">
            <div className="min-w-0">
              <p className="truncate text-sm text-text">{title}</p>
              <p className="text-xs text-muted">{merchant ? `at ${merchant}` : "Best price found"}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-xl font-semibold text-text">{money(v.price)}</p>
              {v.savings ? <p className="font-mono text-xs text-penny-2">saves {money(v.savings)}</p> : null}
            </div>
          </div>

          <div className="mx-auto mt-5 flex max-w-md flex-col gap-2">
            {buying === "paying" ? (
              <div className="flex justify-center py-2">
                <Speech who="spark" tail="down" live>
                  {payLine}
                </Speech>
              </div>
            ) : (
              <>
                {buying !== "idle" && (
                  <div className="flex justify-center pb-2">
                    <Speech who="spark" tail="down" live>
                      {payLine}
                    </Speech>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => buy(buying !== "idle" && lastTarget ? lastTarget : { productId: v.productId, offerId: v.offerId })}
                  className="min-h-13 rounded-full bg-paypal px-6 text-base font-semibold text-ink transition-transform active:scale-[0.98]"
                >
                  {buying === "idle" ? (
                    <>
                      Buy it with PayPal · <span className="font-mono">{money(v.price)}</span>
                    </>
                  ) : (
                    "Try again"
                  )}
                </button>
                {differs && buying === "idle" && (
                  <button
                    type="button"
                    onClick={() => buy({ productId: product.id, offerId: picked.offerId })}
                    className="min-h-12 rounded-full border border-line px-6 text-[15px] font-medium text-text hover:border-muted"
                  >
                    Buy my original pick · <span className="font-mono">{money(picked.price)}</span>
                  </button>
                )}
                <button type="button" onClick={onSkip} className="min-h-12 rounded-full px-6 text-[15px] font-medium text-muted hover:text-text">
                  Skip
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
