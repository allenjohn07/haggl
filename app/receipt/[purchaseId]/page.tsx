import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getPurchase } from "@/lib/purchases";
import { Pixel } from "@/components/pixel/Pixel";
import { Speech } from "@/components/pixel/Speech";
import { LINES, pickLine } from "@/data/lines";
import { money, store } from "@/app/(app)/_lib/format";
import { RetryPay, ShareLine } from "./ReceiptActions";

export const metadata = { title: "Receipt · Haggl" };

// Reads the stored Purchase at request time (never cached): paid, retry, or not found.
export default function ReceiptPage({ params, searchParams }: PageProps<"/receipt/[purchaseId]">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <Suspense fallback={<Shell />}>
        <Receipt params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function Shell() {
  return (
    <div className="flex items-end gap-4">
      <Pixel who="spark" state="idle" scale={4} />
      <Pixel who="penny" state="idle" scale={4} />
    </div>
  );
}

function Again() {
  return (
    <Link href="/" className="flex min-h-12 items-center justify-center rounded-full px-6 font-medium text-muted hover:text-text">
      Check something else
    </Link>
  );
}

async function Receipt({ params, searchParams }: Pick<PageProps<"/receipt/[purchaseId]">, "params" | "searchParams">) {
  await connection();
  const { purchaseId } = await params;
  const { status } = await searchParams;
  const p = getPurchase(purchaseId);

  if (!p) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="flex items-end gap-4">
          <Pixel who="spark" state="sulk" scale={4} />
          <Pixel who="penny" state="think" scale={4} />
        </div>
        <Speech who="penny" tail="down" size="lg">
          I can&apos;t find that receipt. It may have expired.
        </Speech>
        <Link href="/" className="flex min-h-12 items-center rounded-full bg-text px-7 font-semibold text-ink">
          Check something else
        </Link>
      </div>
    );
  }

  const saved = p.pickedPrice > p.price ? p.pickedPrice - p.price : 0;
  const shop = store(p.merchant);

  if (p.status === "captured") {
    const share = `Penny and Spark said yes. Paid ${money(p.price)}${saved ? `, saved ${money(saved)}` : ""}.`;
    return (
      <div className="anim-fade flex w-full max-w-md flex-col items-center gap-6 text-center">
        <div className="flex items-end gap-6">
          <div className="flex flex-col items-center gap-2">
            <Speech who="spark" tail="down" size="sm">
              {pickLine(LINES.spark.cheer)}
            </Speech>
            <Pixel who="spark" state="cheer" scale={4} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Speech who="penny" tail="down" size="sm">
              {pickLine(LINES.penny.cheer)}
            </Speech>
            <Pixel who="penny" state="cheer" scale={4} />
          </div>
        </div>
        <section className="raised w-full rounded-[var(--radius-lg)] p-6 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-penny">Paid with PayPal</p>
          <h1 className="mt-2 font-hand text-3xl font-bold leading-tight text-text">It&apos;s yours.</h1>
          <dl className="mt-4 divide-y divide-line-soft text-sm">
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted">Item</dt>
              <dd className="text-right text-text">{p.title}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-muted">Store</dt>
              <dd className="text-text">{shop}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="text-muted">Paid</dt>
              <dd className="font-mono text-xl font-semibold text-text">{money(p.price)}</dd>
            </div>
            {saved > 0 && (
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-muted">Saved vs your pick</dt>
                <dd className="font-mono text-penny-2">{money(saved)}</dd>
              </div>
            )}
            {p.paypalOrderId && (
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-muted">PayPal order</dt>
                <dd className="truncate font-mono text-xs text-muted">{p.paypalOrderId}</dd>
              </div>
            )}
          </dl>
        </section>
        <ShareLine text={share} />
        <Again />
      </div>
    );
  }

  // created / order_created / failed, or back from PayPal cancelled or failed.
  const why =
    status === "cancelled"
      ? "You stepped out of PayPal. Still want it?"
      : status === "failed" || p.status === "failed"
        ? pickLine(LINES.errors.failed)
        : "Your order is ready. Finish it in PayPal?";
  return (
    <div className="anim-fade flex w-full max-w-md flex-col items-center gap-6 text-center">
      <div className="flex items-end gap-4">
        <Pixel who="spark" state={status === "cancelled" ? "sulk" : "ask"} scale={4} />
        <Pixel who="penny" state="think" scale={4} />
      </div>
      <Speech who="spark" tail="down" size="lg">
        {why}
      </Speech>
      <section className="raised w-full rounded-[var(--radius-lg)] p-5 text-left">
        <p className="text-sm text-text">{p.title}</p>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-sm text-muted">at {shop}</span>
          <span className="font-mono text-xl font-semibold text-text">{money(p.price)}</span>
        </div>
      </section>
      <div className="w-full">
        <RetryPay purchaseId={p.purchaseId} label={`Pay with PayPal · ${money(p.price)}`} />
      </div>
      <Again />
    </div>
  );
}
