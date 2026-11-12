import Link from "next/link";
import { ArrowRightIcon, CreditCardIcon, MessagesSquareIcon, SearchIcon, ShieldCheckIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TopBar } from "@/app/(app)/_components/TopBar";
import { HistoryLink } from "@/app/(app)/_components/HistoryNav";
import { HeroDemo } from "./_landing/HeroDemo";
import { Reveal } from "./_landing/Reveal";
import "./_landing/landing.css";

export const metadata = {
  title: "Haggl · Two AI advisors argue so you don't overspend",
  description: "Spark says treat yourself. Penny checks every store. They ask you what matters, give a straight verdict, and pay with PayPal only when you say yes.",
};

const HEADLINE = ["Two", "advisors.", "One", "honest", "answer."];

const STEPS = [
  {
    icon: SearchIcon,
    title: "Pick something",
    body: "Search real products and prices from hundreds of stores, or paste a product link.",
  },
  {
    icon: MessagesSquareIcon,
    title: "Watch them argue",
    body: "Spark pitches it. Penny checks every store and finds cheaper picks. They ask you two quick questions.",
  },
  {
    icon: CreditCardIcon,
    title: "Decide, then pay",
    body: "Get a straight verdict with a side-by-side comparison. Buy with PayPal, or skip and keep your money.",
  },
];

const FACTS = [
  { k: "Real prices", v: "Products and store offers from Channel3, compared live." },
  { k: "Real reasoning", v: "Two Claude agents with tools, a debate you can follow, and no invented prices." },
  { k: "You stay in charge", v: "The agent only creates the PayPal order. You approve it yourself." },
  { k: "Tamper-proof price", v: "The server sets every price from the stored offer. The browser never can." },
];

export default function Landing() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      <div aria-hidden className="landing-glow pointer-events-none absolute inset-x-0 top-0 h-[640px]" />
      <div aria-hidden className="landing-grid pointer-events-none absolute inset-x-0 top-0 h-[640px]" />

      <TopBar
        crumbs={[]}
        right={
          <>
            <HistoryLink />
            <Link href="/app" className={cn(buttonVariants({ size: "sm" }), "h-11 px-3 text-[13px] sm:h-8")}>
              Open app
            </Link>
          </>
        }
      />

      <main className="relative flex-1">
        {/* Hero */}
        <section className="mx-auto flex max-w-5xl flex-col items-center px-4 pt-16 text-center sm:pt-24">
          <span className="anim-fade inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-[12px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-positive" />
            Agentic shopping you can watch
          </span>
          <h1 className="mt-6 max-w-3xl text-[40px] leading-[1.05] font-semibold tracking-[-0.035em] text-foreground sm:text-[64px]">
            {HEADLINE.map((w, i) => (
              <span key={i} className="landing-word mr-[0.25em] last:mr-0" style={{ animationDelay: `${120 + i * 90}ms` }}>
                {w}
              </span>
            ))}
          </h1>
          <p className="anim-rise mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]" style={{ animationDelay: "650ms" }}>
            Spark says treat yourself. Penny checks every store. They ask you what matters, give you a straight verdict, and pay
            with PayPal only when you say yes.
          </p>
          <div className="anim-rise mt-8 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "800ms" }}>
            <Link href="/app" className={cn(buttonVariants(), "group h-11 gap-2 px-5 text-[14px]")}>
              Start shopping
              <ArrowRightIcon aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <a href="#how" className={cn(buttonVariants({ variant: "outline" }), "h-11 bg-transparent px-5 text-[14px] font-normal")}>
              How it works
            </a>
          </div>

          <div className="anim-rise mt-14 w-full max-w-4xl text-left sm:mt-16" style={{ animationDelay: "950ms" }}>
            <HeroDemo />
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-5xl scroll-mt-16 px-4 pt-24 sm:pt-32">
          <Reveal>
            <p className="text-[12px] tracking-wide text-muted-foreground uppercase">How it works</p>
            <h2 className="mt-2 max-w-xl text-[28px] leading-tight font-semibold tracking-[-0.025em] text-foreground sm:text-[34px]">
              A second opinion before every purchase.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 110}>
                <div className="group h-full rounded-lg border border-border bg-surface p-5 transition-colors duration-200 hover:border-white/15 hover:bg-surface-2">
                  <div className="flex items-center justify-between">
                    <s.icon aria-hidden className="size-5 text-muted-foreground transition-colors duration-200 group-hover:text-foreground" />
                    <span className="num text-[11px] text-faint">0{i + 1}</span>
                  </div>
                  <h3 className="mt-6 text-[15px] font-medium text-foreground">{s.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Facts */}
        <section className="mx-auto max-w-5xl px-4 pt-24 sm:pt-32">
          <Reveal>
            <div className="flex items-center gap-2 text-[12px] tracking-wide text-muted-foreground uppercase">
              <ShieldCheckIcon aria-hidden className="size-4" />
              Built to be trusted
            </div>
          </Reveal>
          <div className="mt-6 grid divide-y divide-border-soft overflow-hidden rounded-lg border border-border bg-surface sm:grid-cols-2 sm:divide-y-0">
            {FACTS.map((f, i) => (
              <Reveal key={f.k} delay={i * 80} className={`p-5 ${i % 2 === 0 ? "sm:border-r sm:border-border-soft" : ""} ${i < 2 ? "sm:border-b sm:border-border-soft" : ""}`}>
                <h3 className="text-[14px] font-medium text-foreground">{f.k}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{f.v}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Closing call to action */}
        <section className="mx-auto max-w-5xl px-4 pt-24 pb-24 sm:pt-32">
          <Reveal>
            <div className="relative overflow-hidden rounded-xl border border-border bg-surface px-6 py-12 text-center">
              <div aria-hidden className="landing-glow pointer-events-none absolute inset-0" />
              <h2 className="relative text-[26px] leading-tight font-semibold tracking-[-0.025em] text-foreground sm:text-[32px]">
                Thinking of buying something?
              </h2>
              <p className="relative mt-2 text-[14px] text-muted-foreground">Ask Spark and Penny first. It takes about a minute.</p>
              <Link href="/app" className={cn(buttonVariants(), "relative mt-6 h-11 gap-2 px-5 text-[14px]")}>
                Start shopping
                <ArrowRightIcon aria-hidden className="size-4" />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="relative border-t border-border-soft">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Built for the PayPal AI Hackathon · PayPal sandbox, no real money moves.</span>
          <span className="flex gap-4">
            <a href="https://github.com/allenjohn07/haggl" className="hover:text-foreground" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <span>MIT license</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
