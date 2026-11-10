"use client";

import { useEffect, useRef } from "react";
import type { Advisor } from "@/lib/types";
import { frameImage, getAnim, SIZE, type PixelState } from "./sprites";
import { useReducedMotion } from "./useReducedMotion";

const NAMES: Record<Advisor, string> = { spark: "Spark", penny: "Penny" };

// One advisor, drawn on a 32x32 canvas and scaled by an integer with image-rendering: pixelated.
// With reduced motion it shows the first frame of each state (no bobbing), so the state still reads.
export function Pixel({
  who,
  state,
  scale = 3,
  className = "",
  flip = false,
}: {
  who: Advisor;
  state: PixelState;
  scale?: number;
  className?: string;
  flip?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const anim = getAnim(who, state);
    let i = 0;
    const draw = () => ctx.putImageData(frameImage(who, state, i % anim.frames.length), 0, 0);
    draw();
    if (reduced || anim.frames.length < 2) return;
    const timer = setInterval(() => {
      i++;
      draw();
    }, 1000 / anim.fps);
    return () => clearInterval(timer);
  }, [who, state, reduced]);

  const px = SIZE * Math.max(1, Math.round(scale));
  return (
    <canvas
      ref={ref}
      width={SIZE}
      height={SIZE}
      role="img"
      aria-label={`${NAMES[who]}, ${state}`}
      className={`pixel shrink-0 ${who === "spark" ? "glow-spark" : "glow-penny"} ${className}`}
      style={{ width: px, height: px, transform: flip ? "scaleX(-1)" : undefined }}
    />
  );
}
