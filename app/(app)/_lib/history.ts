"use client";

import type { Offer, ProductCard, Verdict } from "@/lib/types";
import type { ChatItem } from "./useDebate";

// Past debates, kept in this browser only (localStorage): there are no accounts and no database.
// Saved when a verdict arrives; the outcome (bought / skipped) is added afterwards.

export type HistoryEntry = {
  debateId: string;
  at: number;
  product: ProductCard;
  picked: Offer;
  compare?: ProductCard;
  verdict: Verdict;
  items: ChatItem[]; // the transcript
  outcome?: { kind: "bought"; purchaseId: string; title: string; price: number; merchant: string } | { kind: "skipped" };
};

const KEY = "haggl:history";
const MAX = 30;
const listeners = new Set<() => void>();
let cache: { raw: string | null; list: HistoryEntry[] } = { raw: null, list: [] };

export function readHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY);
  if (raw !== cache.raw) {
    try {
      cache = { raw, list: raw ? (JSON.parse(raw) as HistoryEntry[]) : [] };
    } catch {
      cache = { raw, list: [] };
    }
  }
  return cache.list; // same array until it changes, so useSyncExternalStore stays stable
}

function write(list: HistoryEntry[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // storage full or blocked: history is a nicety
  }
  listeners.forEach((fn) => fn());
}

export function subscribeHistory(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => e.key === KEY && fn();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: HistoryEntry[] = [];
export const historyServerSnapshot = () => EMPTY;

// Insert or update by debateId (keeps any outcome already recorded), newest first.
export function saveDebate(entry: Omit<HistoryEntry, "outcome">) {
  const list = readHistory();
  const old = list.find((e) => e.debateId === entry.debateId);
  write([{ ...entry, outcome: old?.outcome }, ...list.filter((e) => e.debateId !== entry.debateId)]);
}

export function setOutcome(debateId: string, outcome: HistoryEntry["outcome"]) {
  write(readHistory().map((e) => (e.debateId === debateId ? { ...e, outcome } : e)));
}

export function clearHistory() {
  write([]);
}
