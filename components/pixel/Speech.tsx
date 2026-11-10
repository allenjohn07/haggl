import type { Advisor } from "@/lib/types";
import { Pixel } from "./Pixel";
import type { PixelState } from "./sprites";

const NAMES: Record<Advisor, string> = { spark: "Spark", penny: "Penny" };

// A pixel advisor's line: a small muted chip in the UI font. Real text, so it stays crisp and readable.
export function Speech({
  who,
  children,
  live = false,
  named = true,
}: {
  who: Advisor;
  children: React.ReactNode;
  live?: boolean;
  named?: boolean;
}) {
  return (
    <p
      aria-live={live ? "polite" : undefined}
      className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] leading-snug text-muted-foreground"
    >
      {named && <span className={`mr-1.5 font-medium ${who === "spark" ? "text-spark" : "text-penny"}`}>{NAMES[who]}</span>}
      {children}
    </p>
  );
}

// The sprite with its line next to it: what shows up wherever a typing indicator or spinner would be.
export function Said({
  who,
  state,
  children,
  live = false,
  scale = 2,
  reverse = false,
  flip = false,
}: {
  who: Advisor;
  state: PixelState;
  children: React.ReactNode;
  live?: boolean;
  scale?: number;
  reverse?: boolean;
  flip?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${reverse ? "flex-row-reverse" : ""}`}>
      <Pixel who={who} state={state} scale={scale} flip={flip} />
      <div className="min-w-0 max-w-[17rem] sm:max-w-xs">
        <Speech who={who} live={live}>
          {children}
        </Speech>
      </div>
    </div>
  );
}
