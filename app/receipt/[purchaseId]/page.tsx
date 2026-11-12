import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getPurchase } from "@/lib/purchases";
import { Pixel } from "@/components/pixel/Pixel";
import { Speech } from "@/components/pixel/Speech";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LINES, pickLine } from "@/data/lines";
import { money, store } from "@/app/(app)/_lib/format";
import { TopBar } from "@/app/(app)/_components/TopBar";
import { HistoryLink } from "@/app/(app)/_components/HistoryNav";
import { RetryPay, ShareLine } from "./ReceiptActions";

export const metadata = { title: "Receipt · Haggl" };

// Reads the stored Purchase at request time (never cached): paid, retry, or not found.
export default function ReceiptPage({ params, searchParams }: PageProps<"/receipt/[purchaseId]">) {
  return (
    <>
      <TopBar home crumbs={["Receipt"]} right={<HistoryLink />} />
      <main className="flex flex-1 items-start justify-center px-4 pt-[10vh] pb-10">
        <Suspense fallback={<Shell />}>
          <Receipt params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

function Shell() {
  return (
    <div className="flex w-full max-w-md items-end gap-2">
      <Pixel who="spark" state="idle" scale={3} />
      <Pixel who="penny" state="idle" scale={3} />
    </div>
  );
}

function Again({ primary = false }: { primary?: boolean }) {
  return (
    <Button asChild variant={primary ? "default" : "ghost"} className={`h-11 px-4 sm:h-9 ${primary ? "" : "text-muted-foreground"}`}>
      <Link href="/app">Check something else</Link>
    </Button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-baseline gap-3 px-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-foreground">{children}</dd>
    </div>
  );
}

async function Receipt({ params, searchParams }: Pick<PageProps<"/receipt/[purchaseId]">, "params" | "searchParams">) {
  await connection();
  const { purchaseId } = await params;
  const { status } = await searchParams;
  const p = getPurchase(purchaseId);

  if (!p) {
    return (
      <div className="anim-fade flex w-full max-w-md flex-col gap-5">
        <div className="flex items-end gap-2">
          <Pixel who="spark" state="sulk" scale={3} />
          <Pixel who="penny" state="think" scale={3} />
        </div>
        <div>
          <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.022em] text-foreground">Receipt not found</h1>
          <div className="mt-3 flex">
            <Speech who="penny">I can&apos;t find that receipt. It may have expired.</Speech>
          </div>
        </div>
        <div>
          <Again primary />
        </div>
      </div>
    );
  }

  const saved = p.pickedPrice > p.price ? p.pickedPrice - p.price : 0;
  const shop = store(p.merchant);

  if (p.status === "captured") {
    const share = `Penny and Spark said yes. Paid ${money(p.price)}${saved ? `, saved ${money(saved)}` : ""}.`;
    return (
      <div className="anim-fade flex w-full max-w-md flex-col gap-5">
        <div className="flex items-end gap-2">
          <Pixel who="spark" state="cheer" scale={3} />
          <Pixel who="penny" state="cheer" scale={3} />
        </div>
        <div>
          <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.022em] text-foreground">It&apos;s yours.</h1>
          <div className="mt-3 flex flex-col items-start gap-2">
            <Speech who="spark">{pickLine(LINES.spark.cheer)}</Speech>
            <Speech who="penny">{pickLine(LINES.penny.cheer)}</Speech>
          </div>
        </div>
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex h-11 items-center justify-between border-b border-border px-4">
            <span className="text-[13px] font-medium text-foreground">Receipt</span>
            <Badge variant="outline" className="h-5 gap-1.5 rounded-sm border-border px-1.5 text-[12px] font-normal text-foreground">
              <span aria-hidden className="size-1.5 rounded-full bg-positive" />
              Paid with PayPal
            </Badge>
          </div>
          <dl className="divide-y divide-border-soft text-[13px]">
            <Row label="Item">{p.title}</Row>
            <Row label="Store">{shop}</Row>
            <Row label="Paid">
              <span className="num text-[15px]">{money(p.price)}</span>
            </Row>
            {saved > 0 && (
              <Row label="Saved">
                <span className="num text-positive">{money(saved)}</span>
                <span className="text-muted-foreground"> vs your pick</span>
              </Row>
            )}
            {p.paypalOrderId && (
              <Row label="PayPal order">
                <span className="num block truncate text-[12px] text-muted-foreground">{p.paypalOrderId}</span>
              </Row>
            )}
          </dl>
          <p className="border-t border-border-soft px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
            PayPal sandbox payment, no real money. Our sandbox account stood in for {shop}; in production the store is
            paid directly through PayPal&apos;s agent checkout and ships the order.
          </p>
        </section>
        <ShareLine text={share} />
        <div>
          <Again />
        </div>
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
    <div className="anim-fade flex w-full max-w-md flex-col gap-5">
      <div className="flex items-end gap-2">
        <Pixel who="spark" state={status === "cancelled" ? "sulk" : "ask"} scale={3} />
        <Pixel who="penny" state="think" scale={3} />
      </div>
      <div>
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.022em] text-foreground">Not paid yet</h1>
        <div className="mt-3 flex">
          <Speech who="spark">{why}</Speech>
        </div>
      </div>
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <dl className="divide-y divide-border-soft text-[13px]">
          <Row label="Item">{p.title}</Row>
          <Row label="Store">{shop}</Row>
          <Row label="Price">
            <span className="num text-[15px]">{money(p.price)}</span>
          </Row>
        </dl>
      </section>
      <RetryPay purchaseId={p.purchaseId} />
      <div>
        <Again />
      </div>
    </div>
  );
}
