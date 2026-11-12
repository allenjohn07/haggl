"use client";

import { useState } from "react";
import { Said } from "@/components/pixel/Speech";
import { Button } from "@/components/ui/button";
import { LINES, pickLine } from "@/data/lines";
import { PayPalButton } from "@/app/(app)/_components/PayPalButton";
import { sounds } from "@/app/(app)/_lib/sounds";

// Re-creates the PayPal order for this purchase and goes back to PayPal. The price comes from the server.
export function RetryPay({ purchaseId }: { purchaseId: string }) {
  const [state, setState] = useState<"idle" | "paying" | "failed">("idle");
  const [line, setLine] = useState("");

  async function pay() {
    sounds.buy();
    setState("paying");
    setLine(pickLine(LINES.spark.pay));
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ purchaseId }),
      });
      if (res.status === 409 || res.status === 404) {
        window.location.reload();
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { approveUrl?: string };
      if (res.ok && body.approveUrl) {
        window.location.assign(body.approveUrl);
        return;
      }
      throw new Error();
    } catch {
      setState("failed");
      setLine(pickLine(LINES.errors.failed));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {state !== "idle" && (
        <div className="flex min-h-11 items-center">
          <Said who="spark" state={state === "paying" ? "pay" : "sulk"} scale={1} live>
            {line}
          </Said>
        </div>
      )}
      {state !== "paying" && <PayPalButton label="Pay with" onClick={pay}>{state === "failed" ? "Try again" : undefined}</PayPalButton>}
    </div>
  );
}

// Web Share where available, otherwise copy to the clipboard.
export function ShareLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The user closed the share sheet; nothing to do.
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-2.5">
      <p className="min-w-0 text-[13px] text-text-2">{text}</p>
      <Button variant="outline" onClick={share} className="h-11 shrink-0 sm:h-8">
        {copied ? "Copied" : "Share"}
      </Button>
    </div>
  );
}
