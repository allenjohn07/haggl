"use client";

import { useState } from "react";
import { Pixel } from "@/components/pixel/Pixel";
import { Speech } from "@/components/pixel/Speech";
import { LINES, pickLine } from "@/data/lines";

// Re-creates the PayPal order for this purchase and goes back to PayPal. The price comes from the server.
export function RetryPay({ purchaseId, label }: { purchaseId: string; label: string }) {
  const [state, setState] = useState<"idle" | "paying" | "failed">("idle");
  const [line, setLine] = useState("");

  async function pay() {
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
    <div className="flex flex-col items-center gap-3">
      {state !== "idle" && (
        <div className="flex items-end gap-2">
          <Pixel who="spark" state={state === "paying" ? "pay" : "sulk"} scale={2} />
          <div className="mb-4">
            <Speech who="spark" tail="left" size="sm" live>
              {line}
            </Speech>
          </div>
        </div>
      )}
      {state !== "paying" && (
        <button type="button" onClick={pay} className="min-h-13 w-full rounded-full bg-paypal px-6 font-semibold text-ink active:scale-[0.98]">
          {state === "failed" ? "Try again" : label}
        </button>
      )}
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
    <div className="flex flex-col items-center gap-2">
      <p className="font-hand text-lg text-muted">&ldquo;{text}&rdquo;</p>
      <button type="button" onClick={share} className="min-h-11 rounded-full border border-line px-5 text-sm font-medium text-text hover:border-muted">
        {copied ? "Copied" : "Share"}
      </button>
    </div>
  );
}
