"use client";

import { useEffect, useRef } from "react";

// A field of purple monospace glyphs that flicker and thicken toward the bottom of the screen,
// with small glowing embers drifting up through them. Drawn on one canvas; paused when hidden.
// Reduced motion: one still frame.

const RAMP = " .,:;~-=+<>?/|()[]{}rczvxiljtfYJLCUQ0OZmwqpdbkhao*#MW&8%B@$";
const CELL = 11; // px per glyph cell
const FPS = 24;

type Ember = { x: number; y: number; vy: number; drift: number; life: number; size: number; phase: number };

export function GlyphEmber({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let seeds: Float32Array = new Float32Array(0);
    const embers: Ember[] = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / CELL);
      rows = Math.ceil(h / CELL);
      seeds = new Float32Array(cols * rows).map(() => Math.random());
    }

    // Smooth pseudo-noise from a few sine waves: cheap, organic, no dependency.
    const field = (x: number, y: number, t: number) =>
      (Math.sin(x * 0.11 + t * 0.6) + Math.sin(y * 0.17 - t * 0.4) + Math.sin((x + y) * 0.07 + t * 0.25) + Math.sin(x * 0.031 - t * 0.15) * 1.5) / 4.5;

    function spawn(): Ember {
      return {
        x: Math.random() * w,
        y: h * (0.55 + Math.random() * 0.45),
        vy: 6 + Math.random() * 14,
        drift: (Math.random() - 0.5) * 6,
        life: 0,
        size: Math.random() < 0.2 ? 2 : 1,
        phase: Math.random() * Math.PI * 2,
      };
    }

    function draw(t: number, dt: number) {
      ctx!.clearRect(0, 0, w, h);
      ctx!.font = `600 ${CELL}px ui-monospace, "Geist Mono", monospace`;
      ctx!.textBaseline = "top";

      for (let r = 0; r < rows; r++) {
        const depth = r / rows; // 0 at the top, 1 at the bottom
        const lift = Math.pow(Math.max(0, depth - 0.12) / 0.88, 1.35); // empty at the top, dense at the bottom
        if (lift <= 0.01) continue;
        for (let c = 0; c < cols; c++) {
          const n = field(c, r, t) * 0.5 + 0.5; // 0..1
          const seed = seeds[r * cols + c];
          const v = n * lift * 1.55 + (seed - 0.5) * 0.2;
          if (v < 0.12) continue;
          const flicker = Math.sin(t * 3 + seed * 40) * 0.08;
          const level = Math.min(1, Math.max(0, v + flicker));
          const ch = RAMP[Math.min(RAMP.length - 1, Math.floor(level * (RAMP.length - 1)))];
          // Deep violet at the top of the field, bright lilac near the bottom edge.
          const glow = Math.pow(depth, 3); // the last rows burn brightest
          const light = 34 + level * 34 + glow * 30;
          const alpha = Math.min(1, 0.25 + level * 0.75 + glow * 0.2);
          ctx!.fillStyle = `hsl(${268 - glow * 12} 92% ${light}% / ${alpha})`;
          ctx!.fillText(ch, c * CELL, r * CELL);
        }
      }

      // Embers: "+" sparks with a soft glow, rising and fading.
      while (embers.length < Math.max(18, Math.floor(w / 40))) embers.push(spawn());
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life += dt;
        e.y -= e.vy * dt;
        e.x += e.drift * dt;
        const fade = Math.min(1, e.life / 1.2) * Math.max(0, Math.min(1, (e.y - h * 0.08) / (h * 0.25)));
        const twinkle = 0.55 + Math.sin(t * 4 + e.phase) * 0.45;
        const a = fade * twinkle;
        if (e.y < h * 0.05 || a <= 0.01 && e.life > 2) {
          embers.splice(i, 1);
          continue;
        }
        const s = e.size;
        ctx!.save();
        ctx!.shadowColor = `rgba(255, 214, 236, ${a})`;
        ctx!.shadowBlur = 8 * s;
        ctx!.fillStyle = `rgba(255, 228, 242, ${a})`;
        ctx!.fillRect(e.x - s * 2, e.y - s / 2, s * 5, s);
        ctx!.fillRect(e.x - s / 2, e.y - s * 2, s, s * 5);
        ctx!.restore();
      }
    }

    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const start = last;

    // Frame loop, capped at FPS: smooth enough, and easy on phones.
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = (now - last) / 1000;
      last = now;
      acc += dt;
      if (acc < 1 / FPS) return;
      draw((now - start) / 1000, acc);
      acc = 0;
    };

    if (reduced) {
      for (let i = 0; i < 40; i++) embers.push(spawn());
      draw(4, 0);
    } else {
      raf = requestAnimationFrame(loop);
    }

    // Pause while the tab is hidden.
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={`block h-full w-full ${className}`} />;
}
