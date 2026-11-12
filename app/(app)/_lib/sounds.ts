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

export const sounds = {
  say: (who: Advisor) => play(SAY[who]),
  ask: () => play(ASK),
  verdict: () => play(VERDICT),
};
