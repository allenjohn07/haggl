"use client";

import { useSyncExternalStore } from "react";

// Wide screens get the 4x stage with bubbles above each head; phones get a 3x stage with stacked bubbles.
const QUERY = "(min-width: 900px)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function useWide(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
