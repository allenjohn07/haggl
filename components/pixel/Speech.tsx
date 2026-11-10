import type { Advisor } from "@/lib/types";

// A handwritten speech line next to a pixel advisor. Real text, so it stays crisp and readable.
export function Speech({
  who,
  children,
  tail = "left",
  size = "md",
  live = false,
}: {
  who: Advisor;
  children: React.ReactNode;
  tail?: "left" | "right" | "down";
  size?: "sm" | "md" | "lg";
  live?: boolean;
}) {
  const accent = who === "spark" ? "border-spark/50 text-spark-2" : "border-penny/50 text-penny-2";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg sm:text-xl";
  const radius =
    tail === "left" ? "rounded-2xl rounded-bl-md" : tail === "right" ? "rounded-2xl rounded-br-md" : "rounded-2xl";
  return (
    <p
      aria-live={live ? "polite" : undefined}
      className={`font-hand leading-snug ${text} ${accent} ${radius} border bg-bg-soft/90 px-4 py-2 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.8)]`}
    >
      {children}
    </p>
  );
}
