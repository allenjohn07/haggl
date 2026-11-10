"use client";

import { useState } from "react";
import { LINES, pickLine } from "@/data/lines";
import { Speaker } from "./Speaker";

// Re-creates the PayPal order from the stored Deal and sends the buyer to PayPal.
export function RetryButton({ dealId }: { dealId: string }) {
  const [paying, setPaying] = useState<string>();
  const [error, setError] = useState<string>();

  async function pay() {
    setError(undefined);
    setPaying(pickLine(LINES.beanie.pay));
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId }),
      });
      if (res.status === 409) return window.location.reload(); // already paid: show SOLD
      const data = (await res.json()) as { approveUrl?: string };
      if (!res.ok || !data.approveUrl) throw new Error();
      window.location.assign(data.approveUrl); // stay on Beanie's line while the browser leaves
    } catch {
      setPaying(undefined);
      setError(pickLine(LINES.errors.failed, error));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {paying && <Speaker name="Beanie" line={paying} />}
      {error && <Speaker name="Beanie" line={error} />}
      <button
        type="button"
        onClick={pay}
        disabled={!!paying}
        className="min-h-11 w-full rounded-xl bg-[#ffc439] px-4 py-3 font-semibold text-[#2a2033] disabled:opacity-60"
      >
        Pay with PayPal
      </button>
    </div>
  );
}
