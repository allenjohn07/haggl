import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { LINES, pickLine } from "@/data/lines";
import { getProduct } from "@/data/products";
import { getDeal } from "@/lib/deals";
import { appUrl } from "@/lib/paypal/client";
import { RetryButton } from "./RetryButton";
import { ShareButton } from "./ShareButton";
import { Speaker } from "./Speaker";

// SOLD / retry / not-found for one deal. Always read fresh from the in-memory store.
export default function DealPage(props: PageProps<"/deal/[dealId]">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col gap-6 px-5 py-8">
      <Suspense fallback={<Speaker name="Beanie" line={LINES.beanie.idle[1]} />}>
        <DealView {...props} />
      </Suspense>
      <Link
        href="/"
        className="mt-auto flex min-h-11 items-center justify-center rounded-xl px-4 py-3 font-semibold underline underline-offset-4"
      >
        Haggle again
      </Link>
    </main>
  );
}

async function DealView({ params, searchParams }: PageProps<"/deal/[dealId]">) {
  const { dealId } = await params;
  const { status } = await searchParams;
  await connection();

  const deal = getDeal(dealId);
  const product = deal && getProduct(deal.productId);
  if (!deal || !product) {
    return (
      <>
        <h1 className="text-3xl font-bold">Never heard of that deal.</h1>
        <Speaker name="Mr. Pickle" line={pickLine(LINES.pickle.idle)} />
        <p className="text-sm opacity-70">
          This receipt isn&apos;t in Mr. Pickle&apos;s ledger. Pick something new and start a fresh haggle.
        </p>
      </>
    );
  }

  const item = (
    <div className="flex items-center gap-4 rounded-2xl border p-4">
      <span className="text-5xl" aria-hidden>
        {product.emoji}
      </span>
      <div>
        <div className="font-semibold">{product.name}</div>
        <div className="font-mono text-2xl font-bold">${deal.price}</div>
        {deal.price < deal.listPrice && (
          <div className="font-mono text-sm line-through opacity-60">${deal.listPrice}</div>
        )}
      </div>
    </div>
  );

  if (deal.status === "captured") {
    const off = Math.round(((deal.listPrice - deal.price) / deal.listPrice) * 100);
    const headline = off > 0 ? `Got it for ${off}% off` : `Got it for $${deal.price}`;
    const shareText = `I sent an AI bun to haggle with a grumpy pickle and got the ${product.name} for $${deal.price}${off > 0 ? ` (${off}% off)` : ""}.`;
    return (
      <>
        <div className="text-center">
          <p className="inline-block -rotate-6 rounded-lg border-4 border-current px-4 py-1 font-mono text-4xl font-black tracking-widest">
            SOLD
          </p>
          <h1 className="mt-4 text-3xl font-bold">{headline}</h1>
        </div>
        {item}
        <p className="text-sm opacity-70">{shareText}</p>
        <ShareButton text={shareText} url={appUrl("/")} />
        <div className="flex flex-col gap-3">
          <Speaker name="Bao" line={pickLine(LINES.bao.cheer)} />
          <Speaker name="Mr. Pickle" line={pickLine(LINES.pickle.sulk)} />
          <Speaker name="Beanie" line={pickLine(LINES.beanie.cheer)} />
        </div>
      </>
    );
  }

  // agreed, order_created, failed, or back from PayPal's cancel link.
  const failed = status === "failed" || deal.status === "failed";
  const cancelled = status === "cancelled";
  return (
    <>
      <h1 className="text-3xl font-bold">
        {failed ? "Payment hiccup." : cancelled ? "Cold feet?" : "Your deal is waiting."}
      </h1>
      {item}
      {failed ? (
        <Speaker name="Beanie" line={pickLine(LINES.errors.failed)} />
      ) : cancelled ? (
        <Speaker name="Mr. Pickle" line={pickLine(LINES.pickle.sulk)} />
      ) : (
        <Speaker name="Mr. Pickle" line={pickLine(LINES.pickle.pay)} />
      )}
      <p className="text-sm opacity-70">Same price as agreed. Mr. Pickle shook on it.</p>
      <RetryButton dealId={deal.dealId} />
    </>
  );
}
