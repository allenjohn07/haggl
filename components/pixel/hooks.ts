"use client";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

export function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia("(prefers-reduced-motion: reduce)");
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

// Dusk palette from 5pm to 7am local time; day otherwise. Server renders day.
export function useDusk() {
  return useSyncExternalStore(
    noop,
    () => { const h = new Date().getHours(); return h >= 17 || h < 7; },
    () => false,
  );
}
