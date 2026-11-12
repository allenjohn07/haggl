"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Offer, ProductCard, Verdict } from "@/lib/types";
import { Pixel } from "@/components/pixel/Pixel";
import { Said } from "@/components/pixel/Speech";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { LINES, pickLine } from "@/data/lines";
import type { ChatItem, DebateState } from "../_lib/useDebate";
import { api } from "../_lib/api";
import { money, store } from "../_lib/format";
import { PayPalButton } from "./PayPalButton";
import { VerdictCompare } from "./VerdictCompare";
import { sounds } from "../_lib/sounds";

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

export function callLabel(v: Verdict, merchant?: string) {
  if (v.call === "buy") return "Buy it";
  if (v.call === "buy_elsewhere") return merchant ? `Buy it at ${merchant}` : "Buy it elsewhere";
  if (v.call === "wait") return "Wait";
  return "Skip it";
}

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-foreground">{children}</dd>
    </>
  );
}

export function VerdictSheet({ state, wide, onSkip }: { state: DebateState; wide: boolean; onSkip: () => void }) {
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
  const compare = v.options?.length ? v.options : null;
  const sheetWide = (compare?.length ?? 0) > 1;

  async function buy(target: Target) {
    sounds.buy();
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

  const sparkState = buying === "paying" ? "pay" : buying === "idle" ? state.moods.spark : "sulk";
  const pennyState = buying === "paying" ? "idle" : buying === "idle" ? state.moods.penny : "think";

  return (
    <>
      {!open && (
        <div className="anim-rise fixed inset-x-0 bottom-0 z-30 flex justify-center border-t border-border bg-surface-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-5 sm:bottom-5 sm:rounded-lg sm:border sm:p-2">
          <Button variant="outline" onClick={() => {
              sounds.open();
              setOpen(true);
            }} className="h-11 w-full gap-2 sm:h-8 sm:w-auto">
            <span aria-hidden className={`size-1.5 rounded-full ${positive ? "bg-positive" : "bg-faint"}`} />
            Verdict: {callLabel(v, merchant)}
            <span className="text-muted-foreground">Open</span>
          </Button>
        </div>
      )}
      <Sheet
        open={open}
        onOpenChange={(o) => {
          if (!o) sounds.close();
          setOpen(o);
        }}
      >
        <SheetContent
          side={wide ? "right" : "bottom"}
          showCloseButton={false}
          className={`gap-0 border-border bg-surface-2 p-0 shadow-[0_0_0_1px_rgb(0_0_0/0.2),0_16px_48px_rgb(0_0_0/0.45)] ${
            wide ? (sheetWide ? "data-[side=right]:w-[600px] data-[side=right]:sm:max-w-[600px]" : "data-[side=right]:w-[440px] data-[side=right]:sm:max-w-[440px]") : "max-h-[90dvh] rounded-t-lg"
          }`}
        >
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border pr-2 pl-5">
            <span className="text-[13px] font-medium text-foreground">Verdict</span>
            <Button variant="ghost" onClick={() => {
                sounds.close();
                setOpen(false);
              }} className="h-11 gap-2 px-2.5 text-[13px] text-muted-foreground sm:h-8">
              Back to the stage
              {wide && <Kbd className="border border-border bg-surface">Esc</Kbd>}
            </Button>
          </div>

          <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="flex items-end gap-2">
              <Pixel who="spark" state={sparkState} scale={2} />
              <Pixel who="penny" state={pennyState} scale={2} />
            </div>
            <SheetTitle className="mt-4 text-[18px] leading-snug font-semibold tracking-[-0.02em] text-foreground">{v.headline}</SheetTitle>
            <SheetDescription className="sr-only">Spark and Penny&apos;s joint verdict, with the best price they found.</SheetDescription>

            <dl className="mt-5 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-y-3 text-[13px]">
              <Prop label="Call">
                <Badge variant="outline" className="h-5 gap-1.5 rounded-sm border-border px-1.5 text-[12px] font-normal text-foreground">
                  <span aria-hidden className={`size-1.5 rounded-full ${positive ? "bg-positive" : "bg-faint"}`} />
                  {callLabel(v, merchant)}
                </Badge>
              </Prop>
              {!compare && (
                <>
                  <Prop label="Item">
                    <span className="line-clamp-2">{title}</span>
                  </Prop>
                  <Prop label="Store">{merchant ?? "Best price found"}</Prop>
                  <Prop label="Best price">
                    <span className="num">{money(v.price)}</span>
                  </Prop>
                </>
              )}
              {v.savings ? (
                <Prop label="Saves">
                  <span className="num text-positive">{money(v.savings)}</span>
                  <span className="text-muted-foreground"> vs your pick</span>
                </Prop>
              ) : null}
              {differs && !compare && (
                <Prop label="Your pick">
                  <span className="num text-muted-foreground">{money(picked.price)}</span>
                  <span className="text-muted-foreground"> at {store(picked.merchant)}</span>
                </Prop>
              )}
            </dl>
            {compare && (
              <div className="mt-5">
                <h3 className="mb-2 text-[12px] font-medium text-muted-foreground">{compare.length > 1 ? "Compare" : "The product"}</h3>
                <VerdictCompare options={compare} />
              </div>
            )}

            <Separator className="my-5" />
            <h3 className="text-[12px] font-medium tracking-normal text-muted-foreground">Why</h3>
            <ul className="mt-2 space-y-2 text-[13px] leading-relaxed text-text-2">
              {v.reasons.map((r, i) => (
                <li key={i} className="flex gap-2.5">
                  <span aria-hidden className="mt-[0.6em] size-1 shrink-0 rounded-full bg-muted-foreground" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-border px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {buying === "paying" ? (
              <div className="flex min-h-11 items-center">
                <Said who="spark" state="pay" scale={1} live>
                  {payLine}
                </Said>
              </div>
            ) : (
              <>
                {buying !== "idle" && (
                  <div className="pb-1">
                    <Said who="spark" state="sulk" scale={1} live>
                      {payLine}
                    </Said>
                  </div>
                )}
                <PayPalButton onClick={() => buy(buying !== "idle" && lastTarget ? lastTarget : { productId: v.productId, offerId: v.offerId })}>
                  {buying === "idle" ? undefined : "Try again"}
                </PayPalButton>
                {differs && buying === "idle" && (
                  <Button variant="outline" onClick={() => buy({ productId: product.id, offerId: picked.offerId })} className="h-11 sm:h-9">
                    Buy my original pick <span className="num text-muted-foreground">{money(picked.price)}</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    sounds.skip();
                    onSkip();
                  }}
                  className="h-11 text-muted-foreground sm:h-9">
                  Skip
                </Button>
                <p className="pt-1 text-center text-[12px] leading-relaxed text-muted-foreground">
                  PayPal sandbox, no real money. In this demo our sandbox account stands in for the store; in production
                  the store is paid directly through PayPal&apos;s agent checkout.
                </p>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
