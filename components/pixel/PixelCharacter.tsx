"use client";
// One character on its own little canvas, e.g. for the SOLD page.
import { useEffect, useRef } from "react";
import { useReducedMotion } from "./hooks";
import { G, NAMES, frameAt, sprite, type CharacterId, type CharState } from "./sprites";

export function PixelCharacter({ id, state, scale = 4 }: { id: CharacterId; state: CharState; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const ctx = ref.current!.getContext("2d")!;
    let raf = 0;
    const draw = (now: number) => {
      ctx.clearRect(0, 0, G, G);
      ctx.drawImage(sprite(id, state, frameAt(state, now, 0, reduce)), 0, 0);
      raf = requestAnimationFrame(draw);
    };
    draw(performance.now());
    return () => cancelAnimationFrame(raf);
  }, [id, state, reduce]);
  const size = G * Math.max(1, Math.round(scale));
  return <canvas ref={ref} width={G} height={G} className="pixelated" style={{ width: size, height: size }} role="img" aria-label={`${NAMES[id]} (${state})`} />;
}
