"use client";
// The market stall with Bao, Mr. Pickle and Beanie. Pixels on a low-res canvas scaled by an
// integer; speech bubbles, name tags and the item are crisp HTML overlays.
import { useEffect, useRef, useState } from "react";
import { useDusk, useReducedMotion } from "./hooks";
import { CONFETTI, GLOW } from "./palette";
import { SpeechBubble, type Bubble } from "./SpeechBubble";
import { BOT, G, NAMES, frameAt, sprite, type CharacterId, type CharState } from "./sprites";
import { SCENE_H, bakeStall, ditherGlow, stallLayout } from "./stall";

export type Cast = Record<CharacterId, CharState>;
export type Bubbles = Partial<Record<CharacterId, Bubble>>;

type Props = {
  cast: Cast;
  bubbles?: Bubbles;
  item?: { emoji: string; name: string };
  confetti?: boolean;
};

type Bit = { x: number; y: number; vx: number; vy: number; c: string; life: number };

const ORDER: CharacterId[] = ["pickle", "bao", "beanie"]; // pickle is behind the counter

export function StallScene({ cast, bubbles = {}, item, confetti = false }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(390);
  const reduce = useReducedMotion();
  const dusk = useDusk();
  const live = useRef({ cast, reduce, bits: [] as Bit[] });
  useEffect(() => {
    live.current.cast = cast;
    live.current.reduce = reduce;
  }, [cast, reduce]);

  useEffect(() => {
    const el = wrap.current!;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const S = Math.max(2, Math.round(width / 130));
  const W = Math.ceil(width / S);
  const H = SCENE_H;
  const L = stallLayout(W, H);

  // drawing loop: re-baked when the size or palette changes
  useEffect(() => {
    const cv = canvas.current!;
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d")!;
    const { back, front, layout } = bakeStall(W, H, dusk);
    let raf = 0, last = performance.now();
    const draw = (now: number) => {
      const { cast, reduce, bits } = live.current;
      const dt = Math.min(50, now - last); last = now;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(back, 0, 0);
      if (dusk) {
        const fl = reduce ? 0.9 : 0.85 + Math.sin(now / 90) * 0.1 + Math.sin(now / 37) * 0.05;
        for (const lx of layout.lanterns) ditherGlow(ctx, lx, 24, 14, 10, GLOW, 0.5 * fl);
      }
      ORDER.forEach((id, i) => {
        const at = layout[id];
        if (id !== "pickle") ditherGlow(ctx, at.x, at.y, 9, 2, "#2a2033", 0.45);
        ctx.drawImage(sprite(id, cast[id], frameAt(cast[id], now, i * 1.7, reduce)), at.x - G / 2, at.y - BOT - 1);
        if (id === "pickle") ctx.drawImage(front, 0, 0);
      });
      // pixel confetti
      live.current.bits = bits.filter((b) => (b.life -= dt) > 0 && b.y < H);
      for (const b of live.current.bits) {
        b.vy += dt * 0.00004; b.x += b.vx * dt; b.y += b.vy * dt;
        ctx.fillStyle = b.c;
        ctx.fillRect(Math.round(b.x), Math.round(b.y), Math.floor(now / 120 + b.vx * 99) % 2 ? 2 : 1, 1);
      }
      raf = requestAnimationFrame(draw);
    };
    draw(performance.now());
    return () => cancelAnimationFrame(raf);
  }, [W, H, dusk]);

  // confetti burst when it turns on (never under reduced motion)
  useEffect(() => {
    if (!confetti || reduce) return;
    live.current.bits = Array.from({ length: 70 }, () => ({
      x: Math.random() * W, y: -Math.random() * 30, vx: (Math.random() - 0.5) * 0.02, vy: 0.012 + Math.random() * 0.02,
      c: CONFETTI[Math.floor(Math.random() * CONFETTI.length)], life: 3500,
    }));
  }, [confetti, reduce, W]);

  const sceneH = H * S;
  const head = (id: CharacterId) => sceneH - (L[id].y - (id === "beanie" ? 18 : id === "bao" ? 19 : 21)) * S;
  const align: Record<CharacterId, "left" | "center" | "right"> = { bao: "left", pickle: "center", beanie: "right" };
  const tag = (id: CharacterId, top: number) => (
    <span
      key={id}
      className="chip absolute -translate-x-1/2 rounded-full px-2 py-0.5 text-[11px] font-extrabold whitespace-nowrap"
      style={{ left: L[id].x * S, top }}
    >
      {NAMES[id]}
    </span>
  );

  return (
    <div ref={wrap} className={`relative w-full overflow-hidden ${dusk ? "bg-[#1f1828]" : "bg-[#c9925a]"}`} style={{ height: sceneH }}>
      <canvas
        ref={canvas}
        className="pixelated absolute top-0 left-0"
        style={{ width: W * S, height: sceneH }}
        role="img"
        aria-label={`A pixel market stall. Bao the bun is ${cast.bao}, Mr. Pickle is ${cast.pickle}, Beanie the clerk is ${cast.beanie}.`}
      />
      {item && (
        <span
          className="absolute -translate-x-1/2 -translate-y-full text-[28px] leading-none drop-shadow-[0_2px_0_rgba(42,32,51,0.35)]"
          style={{ left: L.item.x * S, top: (L.item.y + 1) * S }}
          title={item.name}
        >
          {item.emoji}
        </span>
      )}
      {tag("bao", (L.bao.y + 1) * S)}
      {tag("pickle", (L.counterTop + 4) * S)}
      {tag("beanie", (L.beanie.y + 1) * S)}
      {(Object.keys(bubbles) as CharacterId[]).map((id) => {
        const b = bubbles[id];
        if (!b) return null;
        return (
          <SpeechBubble
            key={`${id}:${b.text}`}
            bubble={b}
            x={L[id].x * S}
            bottom={head(id)}
            align={align[id]}
            maxWidth={Math.round(width * (id === "pickle" ? 0.52 : 0.46))}
          />
        );
      })}
    </div>
  );
}
