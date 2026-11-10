"use client";

import { useState, useSyncExternalStore } from "react";

const canShare = () => typeof navigator !== "undefined" && (!!navigator.share || !!navigator.clipboard);

// Web Share API, falling back to copying the text. Hidden if the browser supports neither.
export function ShareButton({ text, url }: { text: string; url: string }) {
  const supported = useSyncExternalStore(() => () => {}, canShare, () => false);
  const [copied, setCopied] = useState(false);
  if (!supported) return null;

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: "Haggle", text, url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
    } catch {
      // Copy blocked: the text is already visible on the card.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="min-h-11 w-full rounded-xl border border-current px-4 py-3 font-semibold"
    >
      {copied ? "Copied. Go brag." : "Share my bargain"}
    </button>
  );
}
