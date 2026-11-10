// Canvas palette for the pixel scene. UI tokens live in styles/tokens.css.
// Every scene colour has a [day, dusk] variant.

export const OUTLINE = "#2a2033";

const SCENE = {
  awning: ["#d9534f", "#a8404a"],
  awningD: ["#a83b3b", "#7a2c3c"],
  cream: ["#f6ead2", "#d9b8a0"],
  creamD: ["#d9c3a0", "#a88a7e"],
  pole: ["#8a5a35", "#5e3d32"],
  poleH: ["#b07a48", "#7a5040"],
  wall: ["#c9925a", "#6e4f4a"],
  wallH: ["#d6a26a", "#7d5a52"],
  wallLine: ["#8a5a35", "#4e3633"],
  shelf: ["#7a4a2a", "#4a2f2a"],
  shelfH: ["#9c6438", "#5e3c32"],
  jarGreen: ["#8fbf5a", "#5f7a52"],
  jarAmber: ["#e0a040", "#a8784a"],
  jarPlum: ["#9a4a7a", "#6a3a5e"],
  jarLid: ["#e0b44a", "#b08a50"],
  glass: ["#eef6e0", "#b8b0b4"],
  counter: ["#b5793f", "#7a5240"],
  counterH: ["#d49a5c", "#946650"],
  counterD: ["#8a5530", "#5a3a34"],
  cobble: ["#a39a8e", "#6a6070"],
  cobbleH: ["#c4bcb0", "#857a8a"],
  cobbleD: ["#857c72", "#544a5e"],
  grout: ["#6a6258", "#3a3346"],
  lantern: ["#e8543f", "#ff7a4a"],
  lanternH: ["#f5a54a", "#ffd27a"],
  shadow: ["#5a4a44", "#2a2033"],
} as const;

export type ScenePalette = Record<keyof typeof SCENE, string>;

export function scenePalette(dusk: boolean): ScenePalette {
  const out = {} as ScenePalette;
  for (const k in SCENE) out[k as keyof ScenePalette] = SCENE[k as keyof typeof SCENE][dusk ? 1 : 0];
  return out;
}

export const GLOW = "#ffd27a";

// Body colours per character: base, lit (top-left) and shaded (bottom-right).
export const BODY = {
  bao: { B: "#f6e7cc", H: "#fff9ec", S: "#dcc39c" },
  pickle: { B: "#7fae45", H: "#a9d16a", S: "#5a8530" },
  beanie: { B: "#7a4a2e", H: "#9e6a44", S: "#55301c" },
} as const;

// Shared prop and face colours, keyed by the single letters used in sprite grids.
export const SHARED: Record<string, string> = {
  O: OUTLINE, F: OUTLINE, W: "#ffffff", P: "#f4a3b4", T: "#e0607e", t: "#b84462",
  U: "#d98aa0", G: "#f0c64e", M: "#4a2f1f", A: "#8a5a35", a: "#6a4228",
  X: "#d9534f", x: "#f0c64e", "-": "#e8dcc0", C: "#c08a52", N: "#f7f3e8", n: "#9aa3b2",
  g: "#efe3c2", L: "#bfe3f2", K: "#d9534f", h: "#a0673a", b: "#5b8fd1", y: "#f0c64e",
  Y: "#ffd34f", D: "#c9cfdc", R: "#6aa6e8",
};

export const CONFETTI = ["#d9534f", "#f0c64e", "#7fae45", "#5b8fd1", "#f4a3b4", "#ffffff"];
