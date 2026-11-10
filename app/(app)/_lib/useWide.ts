"use client";

import { useSyncExternalStore } from "react";

// Wide screens get two chat screens side by side; phones get one thread.
const QUERY = "(min-width: 900px)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function useWide(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
