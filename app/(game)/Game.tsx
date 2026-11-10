"use client";
// The one game screen: pick an item, nudge Bao, watch the haggle, pay with PayPal.
import { useEffect, useRef, useState } from "react";
import { StallScene, useDusk } from "@/components/pixel";
import type { PublicProduct } from "@/data/products";
import type { Nudge } from "@/lib/types";
import { HaggleMeter } from "./HaggleMeter";
import { dealPath, useNegotiation, type ChatMsg } from "./useNegotiation";

const NUDGES: { id: Nudge; label: string; hint: string }[] = [
  { id: "nicer", label: "Be nicer", hint: "Bao will be extra charming." },
  { id: "bluff", label: "Bluff", hint: "Bao will pretend not to care." },
  { id: "walk_away", label: "Walk away", hint: "Bao walks out right away." },
];

const primary =
  "flex min-h-14 w-full items-center justify-center rounded-2xl border-2 border-outline px-5 text-lg font-black shadow-[0_4px_0_#2a2033] active:translate-y-1 active:shadow-none";
const secondary =
  "flex min-h-11 w-full items-center justify-center rounded-2xl border-2 border-outline bg-card px-4 font-extrabold text-ink";

export function Game({ products }: { products: PublicProduct[] }) {
  const { view, start, reset } = useNegotiation();
  const [pickedId, setPickedId] = useState(products[0].id);
  const [nudge, setNudge] = useState<Nudge | undefined>();
  const product = products.find((p) => p.id === pickedId) ?? products[0];
  const dusk = useDusk();

  useEffect(() => {
    document.documentElement.classList.toggle("dusk", dusk);
  }, [dusk]);

  const again = () => {
    setNudge(undefined);
    start(product);
  };
  const pickAnother = () => {
    setNudge(undefined);
    reset();
  };

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col">
      <header className="flex items-baseline justify-between gap-3 px-4 pt-3 pb-2">
        <h1 className="text-2xl font-black tracking-tight">Haggle</h1>
        <p className="text-right text-[12px] font-bold text-ink-soft">Two AI agents haggle. You pay with PayPal.</p>
      </header>

      <StallScene
        cast={view.cast}
        bubbles={view.bubbles}
        item={{ emoji: product.emoji, name: product.name }}
        confetti={view.phase === "deal"}
      />
      <p className="sr-only" aria-live="polite">{view.latest}</p>

      {view.phase === "ready" ? (
        <section className="flex flex-1 flex-col px-4">
          <h2 className="mt-4 text-[13px] font-black tracking-wide text-ink-soft uppercase">Today at Mr. Pickle&apos;s stall</h2>
          <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Pick an item">
            {products.map((p) => {
              const on = p.id === pickedId;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPickedId(p.id)}
                  className={`flex min-h-11 flex-col items-start gap-0.5 rounded-2xl border-2 p-3 text-left ${
                    on ? "border-outline bg-gold/30 shadow-[0_3px_0_#2a2033]" : "border-line bg-card"
                  }`}
                >
                  <span className="flex w-full items-start justify-between">
                    <span className="text-2xl leading-none" aria-hidden>{p.emoji}</span>
                    <span className="font-mono text-[13px] font-bold">${p.listPrice}</span>
                  </span>
                  <span className="mt-1 text-[14px] leading-tight font-extrabold">{p.name}</span>
                  <span className="text-[12px] leading-snug text-ink-soft">{p.blurb}</span>
                </button>
              );
            })}
          </div>

          <h2 className="mt-5 text-[13px] font-black tracking-wide text-ink-soft uppercase">Nudge Bao (optional)</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {NUDGES.map((n) => (
              <button
                key={n.id}
                type="button"
                aria-pressed={nudge === n.id}
                onClick={() => setNudge(nudge === n.id ? undefined : n.id)}
                className={`min-h-11 rounded-full border-2 px-2 text-[14px] font-extrabold ${
                  nudge === n.id ? "border-outline bg-bao text-white" : "border-line bg-card text-ink"
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 min-h-5 text-[12px] font-bold text-ink-soft">{NUDGES.find((n) => n.id === nudge)?.hint}</p>

          <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-page from-70% to-transparent pt-4 pb-4">
            <button type="button" onClick={() => start(product, nudge)} className={`${primary} bg-cta text-white`}>
              Start haggling for {product.emoji} ${product.listPrice}
            </button>
          </div>
        </section>
      ) : (
        <section className="flex flex-1 flex-col pb-6">
          <div className="flex items-baseline justify-between px-4 pt-3">
            <span className="font-extrabold">
              <span aria-hidden>{product.emoji}</span> {product.name}
            </span>
            <span className="font-mono text-[13px] text-ink-soft">list ${product.listPrice}</span>
          </div>
          {view.phase !== "error" && <HaggleMeter listPrice={product.listPrice} buyer={view.buyer} seller={view.seller} deal={view.deal?.price} />}

          <div className="px-4">
            {view.phase === "deal" && view.deal && (
              <div className="mb-4 flex flex-col gap-3 rounded-2xl border-2 border-outline bg-card p-4 shadow-[0_3px_0_#2a2033]">
                <p className="text-center">
                  <span className="block text-3xl font-black">Deal! <span className="font-mono">${view.deal.price}</span></span>
                  <span className="text-[14px] font-bold text-ink-soft">
                    {Math.round((1 - view.deal.price / view.deal.listPrice) * 100)}% off the ${view.deal.listPrice} list price
                  </span>
                </p>
                {view.approveUrl && (
                  <>
                    <a href={view.approveUrl} className={`${primary} bg-paypal text-paypal-ink`}>
                      Pay with PayPal
                    </a>
                    <p className="-mt-1 text-center text-[12px] font-bold text-ink-soft">PayPal sandbox: no real money moves.</p>
                  </>
                )}
                {view.orderFailed && !view.approveUrl && (
                  <a href={dealPath(view.deal.dealId)} className={`${primary} bg-cta text-white`}>
                    Finish your deal
                  </a>
                )}
                <button type="button" onClick={pickAnother} className={secondary}>
                  Haggle for something else
                </button>
              </div>
            )}

            {view.phase === "nodeal" && (
              <div className="mb-4 flex flex-col gap-3 rounded-2xl border-2 border-outline bg-card p-4 shadow-[0_3px_0_#2a2033]">
                <p className="text-center">
                  <span className="block text-2xl font-black">No deal.</span>
                  <span className="text-[14px] font-bold text-ink-soft">{view.reason}</span>
                </p>
                <button type="button" onClick={again} className={`${primary} bg-cta text-white`}>Try again</button>
                <button type="button" onClick={pickAnother} className={secondary}>Pick another item</button>
              </div>
            )}

            {view.phase === "error" && (
              <div className="mb-4 flex flex-col gap-3 rounded-2xl border-2 border-outline bg-card p-4 shadow-[0_3px_0_#2a2033]">
                <p className="text-center text-[16px] font-extrabold">{view.errorLine}</p>
                <button type="button" onClick={() => start(product, nudge)} className={`${primary} bg-cta text-white`}>Try again</button>
                <button type="button" onClick={pickAnother} className={secondary}>Pick another item</button>
              </div>
            )}
          </div>

          <ChatLog messages={view.messages} />
        </section>
      )}
    </main>
  );
}

function ChatLog({ messages }: { messages: ChatMsg[] }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);
  if (!messages.length) return null;
  return (
    <ol ref={ref} aria-label="Haggle chat" className="mx-4 flex max-h-[45vh] flex-col gap-2 overflow-y-auto">
      {messages.map((m, i) => {
        const buyer = m.side === "buyer";
        return (
          <li
            key={i}
            className={`max-w-[85%] rounded-2xl border-2 border-outline px-3 py-2 text-[14px] leading-snug text-outline ${
              buyer ? "self-start rounded-bl-sm bg-bao-soft" : "self-end rounded-br-sm bg-pickle-soft"
            }`}
          >
            <span className="mb-0.5 flex items-center gap-2 text-[12px] font-black">
              {buyer ? "Bao" : "Mr. Pickle"}
              {m.action === "offer" && m.price !== undefined && (
                <span className={`rounded-md px-1.5 font-mono text-white ${buyer ? "bg-bao" : "bg-pickle"}`}>${m.price}</span>
              )}
              {m.action === "accept" && <span className="rounded-md bg-outline px-1.5 text-white">accepts{m.price !== undefined && <span className="font-mono"> ${m.price}</span>}</span>}
              {m.action === "walk" && <span className="rounded-md bg-outline px-1.5 text-white">walks away</span>}
            </span>
            {m.say}
          </li>
        );
      })}
    </ol>
  );
}
