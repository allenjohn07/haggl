"use client";

import { useState } from "react";
import { Pixel } from "@/components/pixel/Pixel";
import { Speech } from "@/components/pixel/Speech";
import { LINES, pickLine } from "@/data/lines";
import { money } from "../_lib/format";

// User tapped Skip: Penny cheers, Spark sulks, and the money that stayed put.
export function SkipScreen({ kept, onAgain }: { kept: number; onAgain: () => void }) {
  const [lines] = useState(() => ({ spark: pickLine(LINES.spark.sulk), penny: pickLine(LINES.penny.cheer) }));
  return (
    <main className="anim-fade flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12 text-center">
      <div className="flex items-end gap-6 sm:gap-16">
        <div className="flex flex-col items-center gap-3">
          <Speech who="spark" tail="down" size="sm">
            {lines.spark}
          </Speech>
          <Pixel who="spark" state="sulk" scale={4} />
        </div>
        <div className="flex flex-col items-center gap-3">
          <Speech who="penny" tail="down" size="sm" live>
            {lines.penny}
          </Speech>
          <Pixel who="penny" state="cheer" scale={4} />
        </div>
      </div>
      <div>
        <h1 className="font-hand text-4xl font-bold leading-tight text-text sm:text-5xl">
          Kept <span className="font-mono text-penny-2">{money(kept)}</span> in your pocket
        </h1>
        <p className="mt-3 text-muted">Nothing bought, nothing charged.</p>
      </div>
      <button type="button" onClick={onAgain} className="min-h-12 rounded-full bg-text px-7 font-semibold text-ink">
        Check something else
      </button>
    </main>
  );
}
