"use client";
// Drives the game from the real SSE stream of POST /api/negotiate.
// Character states follow the stage/event mapping in docs/CONTRACTS.md exactly;
// the line pools only decide what a character says, never when.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Bubble, Bubbles, Cast, CharacterId } from "@/components/pixel";
import { NAMES } from "@/components/pixel";
import type { PublicProduct } from "@/data/products";
import { LINES, pickLine } from "@/data/lines";
import type { Move, Nudge, Side, Stage } from "@/lib/types";
import { readSSE, type SSEFrame } from "./sse";

export type ChatMsg = { side: Side; say: string; action: Move["action"]; price?: number; round: number };
export type Phase = "ready" | "haggling" | "deal" | "nodeal" | "error";

export type View = {
  phase: Phase;
  cast: Cast;
  bubbles: Bubbles;
  messages: ChatMsg[];
  buyer?: number; // latest buyer offer
  seller?: number; // latest seller ask
  deal?: { dealId: string; price: number; listPrice: number };
  approveUrl?: string;
  orderFailed?: boolean;
  reason?: string;
  error?: "busy" | "failed";
  errorLine?: string;
  latest: string; // newest spoken line, for the aria-live region
};

const IDS: CharacterId[] = ["bao", "pickle", "beanie"];
const IDLE: Cast = { bao: "idle", pickle: "idle", beanie: "idle" };
const STAGE_CAST: Record<Stage, Cast> = {
  search: { ...IDLE, beanie: "search" },
  buyer_think: { ...IDLE, bao: "think" },
  seller_think: { ...IDLE, pickle: "think" },
  checkout: { ...IDLE, pickle: "pay", beanie: "pay" },
  capture: { ...IDLE, beanie: "pay" },
};
const DEAL_CAST: Cast = { bao: "cheer", pickle: "sulk", beanie: "idle" };
const NODEAL_CAST: Cast = { bao: "sulk", pickle: "cheer", beanie: "idle" };

export const dealPath = (dealId: string) => `/deal/${encodeURIComponent(dealId)}`;

const POOLS = LINES as unknown as Record<string, Record<string, readonly string[] | undefined>>;

// The first line of a bubble's `say`, kept short.
function short(say: string) {
  const m = say.match(/^.*?[.!?](\s|$)/);
  const t = (m ? m[0] : say).trim();
  return t.length > 72 ? t.slice(0, 69).trimEnd() + "…" : t;
}

const INITIAL: View = {
  phase: "ready",
  cast: IDLE,
  bubbles: { bao: { text: LINES.bao.idle[0] }, pickle: { text: LINES.pickle.idle[0] } },
  messages: [],
  latest: "",
};

export function useNegotiation() {
  const [view, setView] = useState<View>(INITIAL);
  const ref = useRef(view);
  const last = useRef(new Map<string, string>());
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => () => ctrl.current?.abort(), []);

  const update = useCallback((f: (v: View) => View) => {
    ref.current = f(ref.current);
    setView(ref.current);
  }, []);

  const line = useCallback((group: string, state: string) => {
    const pool = POOLS[group]?.[state];
    if (!pool?.length) return undefined;
    const key = `${group}.${state}`;
    const l = pickLine(pool, last.current.get(key));
    last.current.set(key, l);
    return l;
  }, []);

  // Move the cast to `next`. A character whose state starts gets a fresh bubble.
  const enter = useCallback((v: View, next: Cast, over: Bubbles = {}): View => {
    const bubbles: Bubbles = {};
    const said: string[] = [];
    for (const id of IDS) {
      const st = next[id];
      let b: Bubble | undefined = over[id];
      if (!b && st === v.cast[id] && st !== "talk") b = v.bubbles[id];
      else if (!b && st !== "idle") { const text = line(id, st); if (text) b = { text }; }
      if (b) bubbles[id] = b;
      if (b && b !== v.bubbles[id]) said.push(`${NAMES[id]}: ${b.price !== undefined ? `$${b.price}. ` : ""}${b.text}`);
    }
    return { ...v, cast: next, bubbles, latest: said.length ? said.join(" ") : v.latest };
  }, [line]);

  const fail = useCallback((error: "busy" | "failed") => {
    const errorLine = line("errors", error)!;
    update((v) => enter({ ...v, phase: "error", error, errorLine }, IDLE, { [error === "busy" ? "pickle" : "beanie"]: { text: errorLine } }));
  }, [enter, line, update]);

  // The deal stands but the PayPal order wasn't created: say so in character, then
  // send the user to /deal/<dealId>, whose retry button re-creates the order.
  const orderFailed = useCallback(() => {
    if (ref.current.orderFailed) return;
    update((v) => enter({ ...v, orderFailed: true }, DEAL_CAST, { beanie: { text: line("errors", "failed")! } }));
    const id = ref.current.deal?.dealId;
    if (id) setTimeout(() => { if (ref.current.deal?.dealId === id) window.location.assign(dealPath(id)); }, 2500);
  }, [enter, line, update]);

  const handle = useCallback((f: SSEFrame) => {
    const d = f.data as Record<string, unknown>;
    if (f.event === "stage") {
      const next = STAGE_CAST[d.stage as Stage];
      if (next) update((v) => enter(v, next));
    } else if (f.event === "message") {
      const m = d as unknown as ChatMsg;
      const who: CharacterId = m.side === "buyer" ? "bao" : "pickle";
      // offers carry the offered price; accepts carry the accepted price
      const offer = m.action !== "walk" && typeof m.price === "number" ? m.price : undefined;
      const text = m.say ? short(m.say) : line(who, "talk") ?? "";
      update((v) => enter(
        {
          ...v,
          messages: [...v.messages, m],
          buyer: m.side === "buyer" && offer !== undefined ? offer : v.buyer,
          seller: m.side === "seller" && offer !== undefined ? offer : v.seller,
        },
        { ...IDLE, [who]: "talk" },
        { [who]: { text, price: offer } },
      ));
    } else if (f.event === "deal") {
      const deal = d as unknown as NonNullable<View["deal"]>;
      update((v) => enter({ ...v, phase: "deal", deal, buyer: deal.price, seller: deal.price }, DEAL_CAST));
    } else if (f.event === "order") {
      // The seller's tool call is finished: back to the deal outcome.
      update((v) => enter({ ...v, approveUrl: d.approveUrl as string, orderFailed: false }, DEAL_CAST));
    } else if (f.event === "order_failed") {
      orderFailed();
    } else if (f.event === "nodeal") {
      update((v) => enter({ ...v, phase: "nodeal", reason: d.reason as string }, NODEAL_CAST));
    } else if (f.event === "error") {
      fail("failed");
    }
  }, [enter, fail, line, orderFailed, update]);

  const start = useCallback(async (product: PublicProduct, nudge?: Nudge) => {
    ctrl.current?.abort();
    const ac = new AbortController();
    ctrl.current = ac;
    update(() => ({ ...INITIAL, bubbles: {}, phase: "haggling", seller: product.listPrice, latest: "" }));
    try {
      const res = await fetch("/api/negotiate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(nudge ? { productId: product.id, nudge } : { productId: product.id }),
        signal: ac.signal,
      });
      if (res.status === 429) return fail("busy");
      if (!res.ok || !res.body) return fail("failed");
      for await (const f of readSSE(res)) {
        if (ac.signal.aborted) return;
        handle(f);
      }
    } catch {
      if (!ac.signal.aborted) fail("failed");
      return;
    }
    if (ac.signal.aborted) return;
    const v = ref.current;
    if (v.phase === "haggling") fail("failed");
    else if (v.phase === "deal" && !v.approveUrl) orderFailed();
  }, [fail, handle, orderFailed, update]);

  const reset = useCallback(() => {
    ctrl.current?.abort();
    update(() => enter({ ...INITIAL, bubbles: {} }, IDLE, {
      bao: { text: line("bao", "idle")! },
      pickle: { text: line("pickle", "idle")! },
    }));
  }, [enter, line, update]);

  return { view, start, reset };
}
