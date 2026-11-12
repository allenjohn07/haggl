"use client";

import { defineSound, ensureReady, setMasterVolume } from "@web-kits/audio";
import type { Advisor } from "@/lib/types";

// Small synthesized sounds (no audio files). Played only after the user has tapped something,
// so browsers allow audio. Kept quiet on purpose: they should feel like UI, not a game.

const pop = (frequency: { start: number; end: number }, pan: number) =>
  defineSound({ source: { type: "sine", frequency }, envelope: { attack: 0.004, decay: 0.09 }, gain: 0.16, pan });

const SAY: Record<Advisor, ReturnType<typeof defineSound>> = {
  spark: pop({ start: 720, end: 540 }, -0.25), // a little brighter, from the left
  penny: pop({ start: 520, end: 400 }, 0.25), // a little lower, from the right
};

const ASK = defineSound({
  layers: [
    { source: { type: "triangle", frequency: 660 }, envelope: { attack: 0.005, decay: 0.12 }, gain: 0.12 },
    { source: { type: "triangle", frequency: 880 }, envelope: { attack: 0.005, decay: 0.16 }, gain: 0.1, delay: 0.09 },
  ],
});

const VERDICT = defineSound({
  layers: [523.25, 659.25, 783.99].map((frequency, i) => ({
    source: { type: "sine" as const, frequency },
    envelope: { attack: 0.01, decay: 0.45 },
    gain: 0.08,
    delay: i * 0.06,
  })),
});

const KEY = "haggl:sound";

export function soundOn(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) !== "off";
}

export function setSoundOn(on: boolean) {
  window.localStorage.setItem(KEY, on ? "on" : "off");
  if (on) unlockSound(); // the toggle tap counts as the user gesture
  else setMasterVolume(0);
}

function play(sound: ReturnType<typeof defineSound>) {
  if (!soundOn()) return;
  try {
    sound({ jitter: { detune: 25, volume: 0.1 } });
  } catch {
    // Audio is a nicety; never let it break the debate.
  }
}

// Call from a tap or key press: browsers (iPhone Safari especially) only start audio inside a user gesture.
export function unlockSound() {
  if (!soundOn()) return;
  ensureReady()
    .then(() => setMasterVolume(1))
    .catch(() => {});
}

// Interface sounds: each interaction has its own short, quiet voice.
const note = (type: "sine" | "triangle", frequency: number | { start: number; end: number }, decay: number, gain: number, delay = 0) => ({
  source: { type, frequency },
  envelope: { attack: 0.003, decay },
  gain,
  delay,
});

const UI = {
  tap: defineSound(note("sine", 880, 0.035, 0.07)), // a generic button press
  tick: defineSound(note("sine", 1320, 0.018, 0.035)), // moving through suggestions
  search: defineSound({ layers: [note("sine", { start: 420, end: 760 }, 0.12, 0.09)] }), // a small rising swoosh
  pick: defineSound({ layers: [note("triangle", 587.33, 0.07, 0.09), note("triangle", 880, 0.09, 0.07, 0.05)] }), // two-note "selected"
  start: defineSound({ layers: [note("sine", 392, 0.1, 0.08), note("sine", 523.25, 0.1, 0.08, 0.07), note("sine", 659.25, 0.14, 0.07, 0.14)] }),
  answer: defineSound({ layers: [note("triangle", 659.25, 0.06, 0.09), note("triangle", 987.77, 0.1, 0.07, 0.05)] }),
  open: defineSound(note("sine", { start: 520, end: 700 }, 0.08, 0.06)), // a sheet sliding in
  close: defineSound(note("sine", { start: 700, end: 480 }, 0.08, 0.06)), // and out
  buy: defineSound({
    layers: [note("triangle", 1046.5, 0.09, 0.08), note("triangle", 1318.51, 0.09, 0.08, 0.06), note("sine", 1567.98, 0.25, 0.07, 0.12)],
  }), // a little "cha-ching"
  skip: defineSound({ layers: [note("sine", 523.25, 0.1, 0.07), note("sine", 392, 0.16, 0.07, 0.08)] }), // a gentle step down
  error: defineSound({ layers: [note("triangle", 220, 0.12, 0.08), note("triangle", 196, 0.16, 0.07, 0.09)] }),
};

export const sounds = {
  say: (who: Advisor) => play(SAY[who]),
  ask: () => play(ASK),
  verdict: () => play(VERDICT),
  tap: () => play(UI.tap),
  tick: () => play(UI.tick),
  search: () => play(UI.search),
  pick: () => play(UI.pick),
  start: () => play(UI.start),
  answer: () => play(UI.answer),
  open: () => play(UI.open),
  close: () => play(UI.close),
  buy: () => play(UI.buy),
  skip: () => play(UI.skip),
  error: () => play(UI.error),
};
