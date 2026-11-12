import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Pixel } from "@/components/pixel/Pixel";
import { cn } from "@/lib/utils";
import { TopBar } from "@/app/(app)/_components/TopBar";
import { GlyphEmber } from "./_landing/GlyphEmber";
import "./_landing/landing.css";

export const metadata = {
  title: "Haggl · Two AI advisors argue so you don't overspend",
  description: "Spark says treat yourself. Penny checks every store. They ask you what matters, give a straight verdict, and pay with PayPal only when you say yes.",
};

const HEADLINE = ["Two", "advisors.", "One", "honest", "answer."];

// The landing page: one screen, one message, one button. Glyph embers rise behind it.
export default function Landing() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[44vh] sm:h-[58vh]">
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_80%_100%_at_50%_100%,rgb(150_100_255/0.35),transparent_70%)]" />
        <GlyphEmber className="relative" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent" />
      </div>

      <TopBar
        crumbs={[]}
        right={
          <Link href="/app" className={cn(buttonVariants({ variant: "ghost" }), "h-11 px-3 text-[13px] font-normal text-muted-foreground sm:h-8")}>
            Open app
          </Link>
        }
      />

      <main className="relative flex flex-1 flex-col items-center px-5 pt-[16vh] text-center sm:pt-[20vh]">
        <div className="anim-fade flex items-end gap-3" aria-hidden>
          <Pixel who="spark" state="idle" scale={2} active />
          <Pixel who="penny" state="idle" scale={2} active />
        </div>
        <h1 className="mt-6 max-w-3xl text-[40px] leading-[1.04] font-semibold tracking-[-0.04em] text-foreground sm:text-[68px]">
          {HEADLINE.map((w, i) => (
            <span key={i} className="landing-word mr-[0.24em] last:mr-0" style={{ animationDelay: `${150 + i * 90}ms` }}>
              {w}
            </span>
          ))}
        </h1>
        <p className="anim-rise mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground sm:text-[16px]" style={{ animationDelay: "650ms" }}>
          Two AI advisors argue about what you&apos;re buying, check every store, and pay with PayPal only when you say yes.
        </p>
        <Link
          href="/app"
          className={cn(buttonVariants(), "anim-rise group mt-8 h-11 gap-2 rounded-full px-6 text-[14px]")}
          style={{ animationDelay: "800ms" }}
        >
          Start shopping
          <ArrowRightIcon aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </main>

      <footer className="relative flex justify-center px-5 pb-5">
        <span className="rounded-full bg-background/80 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-sm">PayPal sandbox · no real money moves</span>
      </footer>
    </div>
  );
}
