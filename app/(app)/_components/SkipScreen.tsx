"use client";

import { useState } from "react";
import { Pixel } from "@/components/pixel/Pixel";
import { Speech } from "@/components/pixel/Speech";
import { Button } from "@/components/ui/button";
import { LINES, pickLine } from "@/data/lines";
import { money } from "../_lib/format";
import { TopBar } from "./TopBar";

// User tapped Skip: Penny cheers, Spark sulks, and the money that stayed put.
export function SkipScreen({ kept, onAgain }: { kept: number; onAgain: () => void }) {
  const [lines] = useState(() => ({ spark: pickLine(LINES.spark.sulk), penny: pickLine(LINES.penny.cheer) }));
  return (
    <>
      <TopBar crumbs={["Skipped"]} />
      <main className="anim-fade flex flex-1 items-start justify-center px-4 pt-[12vh]">
        <div className="flex w-full max-w-md flex-col gap-5">
          <div className="flex items-end gap-2">
            <Pixel who="spark" state="sulk" scale={3} />
            <Pixel who="penny" state="cheer" scale={3} />
          </div>
          <div>
            <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.022em] text-foreground">
              Kept <span className="text-positive tabular-nums">{money(kept)}</span> in your pocket
            </h1>
            <p className="mt-1.5 text-[14px] text-muted-foreground">Nothing bought, nothing charged.</p>
          </div>
          <div className="flex flex-col items-start gap-2">
            <Speech who="penny" live>
              {lines.penny}
            </Speech>
            <Speech who="spark">{lines.spark}</Speech>
          </div>
          <div>
            <Button onClick={onAgain} className="h-11 px-4 sm:h-9">
              Check something else
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
