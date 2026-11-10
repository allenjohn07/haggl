import type { Advisor } from "@/lib/types";

// Hand-drawn pixel maps. Each sprite is a 32x32 canvas built from small string grids:
// one character per pixel, "." is transparent, every other character is a palette colour.
// A frame is the body plus a few hand-drawn parts (eyes, mouth, arms, props) at offsets.

export type PixelState = "idle" | "think" | "lookup" | "talk" | "ask" | "pay" | "cheer" | "sulk";
export const SIZE = 32;

type Art = string[];
type Layer = [art: Art, x: number, y: number];
type Frame = { dx?: number; dy?: number; layers: Layer[] };
export type Anim = { fps: number; frames: Frame[] };

// Body origin on the canvas. Part coordinates below are relative to it.
const OX = 8;
const OY = 11;

/* ------------------------------------------------------------------ Spark */

const SPARK_PALETTE: Record<string, string> = {
  c: "#ff6b57", // coral body
  C: "#ffa088", // coral highlight (lit from within)
  d: "#e2503f", // coral shade
  p: "#ff4f8b", // hot pink
  h: "#ff92b8", // pink highlight
  P: "#c93b6e", // deep pink: fins and legs
  g: "#ffc857", // gold bands
  G: "#e6a23a", // gold shade
  w: "#fff7ea", // white
  k: "#2b0f1a", // eyes and mouth
  r: "#ffb0c4", // cheeks
  f: "#b07a50", // fuse
  s: "#ffe680", // spark yellow
  o: "#ff9f43", // spark orange
  b: "#c8eeff", // magnifier glass
  q: "#86b2ff", // card
  Q: "#3a5799", // card stripe
};

const SPARK_BODY: Art = [
  "......gggg......",
  ".....pppppp.....",
  "....phhppppp....",
  "...phhppppppP...",
  "..ggggggggggGG..",
  "..cCCcccccccdd..",
  "..cCCcccccccdd..",
  "..cCCcccccccdd..",
  "..cCCcccccccdd..",
  "..cCCcccccccdd..",
  "..cCCcccccccdd..",
  "..cCCcccccccdd..",
  "..ggggggggggGG..",
  "..phhppppppppP..",
  "...pppppppppP...",
  "....gggggggG....",
  ".....P....P.....",
  ".....P....P.....",
  "....PP....PP....",
];

const S_EYE: Art = ["wk", "kk"];
const S_EYE_BLINK: Art = ["..", "kk"];
const S_EYE_UP: Art = ["kw", "kk"];
const S_EYE_HAPPY: Art = [".k.", "k.k"];
const S_EYE_SAD: Art = ["dd", "kk"];
const S_CHEEK: Art = ["r"];

const S_SMILE: Art = ["k..k", ".kk."];
const S_OPEN: Art = ["kkkk", "khhk", ".kk."];
const S_FLAT: Art = ["....", ".kk."];
const S_FROWN: Art = [".kk.", "k..k"];
const S_O: Art = [".kk.", "k..k", ".kk."];

const FIN_L_DOWN: Art = [".P", "PP", "PP", "P."];
const FIN_R_DOWN: Art = ["P.", "PP", "PP", ".P"];
const FIN_L_UP: Art = ["P.", "PP", ".P"];
const FIN_R_UP: Art = [".P", "PP", "P."];

const FUSE: Art = [".f", "f.", "f.", ".f"]; // at (7,-4), tip at (8,-4)
const FUSE_DROOP: Art = ["fff.", "...f"]; // at (4,-2)

const SP_A: Art = ["s...s", ".sws.", "..o.."];
const SP_B: Art = ["..s..", "o.w.o", ".s.s."];
const SP_C: Art = ["s.o.s", "..w..", "....."];
const SP_SMALL: Art = ["o"];
const SP_TINY: Art = ["s"];

const DOTS_1: Art = ["s"];
const DOTS_2: Art = ["s.s"];
const DOTS_3: Art = ["s.s.s"];

const MAG: Art = [".gg..", "gbbg.", "gbwg.", ".gg..", "...f.", "....f"];
const S_QUESTION: Art = ["sss.", "...s", "..s.", "....", "..s."];
const CARD: Art = ["qqqqqq", "QQQQQQ", "qqqqqq", "qggqqq"];
const COIN: Art = [".g.", "gGg", ".g."];
const STAMP_FX: Art = ["s.w.s"];

const BURST_Y: Art = ["s...s", ".s.s.", "..w..", ".s.s.", "s...s"];
const BURST_P: Art = ["h...h", ".h.h.", "..w..", ".h.h.", "h...h"];
const BURST_O: Art = ["..o..", ".o.o.", "o.w.o", ".o.o.", "..o.."];
const BURST_S: Art = [".s.", "sws", ".s."];

function spark(o: {
  eyes?: Art;
  eyesY?: number;
  mouth?: Art;
  finL?: Layer;
  finR?: Layer;
  fuse?: "up" | "droop";
  fx?: Layer[];
  dx?: number;
  dy?: number;
}): Frame {
  const eyes = o.eyes ?? S_EYE;
  const wide = eyes[0].length === 3;
  const ey = o.eyesY ?? 6;
  const layers: Layer[] = [
    [SPARK_BODY, 0, 0],
    o.fuse === "droop" ? [FUSE_DROOP, 4, -2] : [FUSE, 7, -4],
    [eyes, wide ? 3 : 4, ey],
    [eyes, wide ? 10 : 10, ey],
    [S_CHEEK, 3, 8],
    [S_CHEEK, 12, 8],
    [o.mouth ?? S_SMILE, 6, 9],
    o.finL ?? [FIN_L_DOWN, 0, 10],
    o.finR ?? [FIN_R_DOWN, 14, 10],
    ...(o.fx ?? []),
  ];
  return { dx: o.dx, dy: o.dy, layers };
}

const SPARK: Record<PixelState, Anim> = {
  idle: {
    fps: 3,
    frames: [
      spark({ fx: [[SP_A, 6, -7]] }),
      spark({ dy: -1, fx: [[SP_B, 6, -7]] }),
      spark({ fx: [[SP_C, 6, -7]] }),
      spark({ eyes: S_EYE_BLINK, fx: [[SP_SMALL, 8, -5]] }),
    ],
  },
  think: {
    fps: 4,
    frames: [
      spark({ eyes: S_EYE_UP, eyesY: 5, mouth: S_FLAT, finR: [FIN_R_UP, 14, 8], fx: [[SP_SMALL, 8, -5], [DOTS_1, 12, -3]] }),
      spark({ eyes: S_EYE_UP, eyesY: 5, mouth: S_FLAT, finR: [FIN_R_UP, 14, 9], fx: [[DOTS_2, 12, -3]] }),
      spark({ eyes: S_EYE_UP, eyesY: 5, mouth: S_FLAT, finR: [FIN_R_UP, 14, 8], fx: [[SP_TINY, 9, -6], [DOTS_3, 12, -3]] }),
    ],
  },
  lookup: {
    fps: 6,
    frames: [
      spark({ mouth: S_O, finR: [FIN_R_UP, 14, 7], fx: [[MAG, 15, 3], [SP_A, 6, -7]] }),
      spark({ dx: 2, mouth: S_O, finR: [FIN_R_UP, 14, 6], fx: [[MAG, 15, 2], [SP_B, 6, -7]] }),
      spark({ dx: 3, dy: -1, mouth: S_SMILE, finR: [FIN_R_UP, 14, 7], fx: [[MAG, 15, 3], [SP_C, 6, -7]] }),
      spark({ dx: 1, mouth: S_O, finR: [FIN_R_UP, 14, 6], fx: [[MAG, 14, 4], [SP_B, 6, -7]] }),
    ],
  },
  talk: {
    fps: 6,
    frames: [
      spark({ mouth: S_OPEN, finL: [FIN_L_UP, 0, 7], fx: [[SP_A, 6, -7]] }),
      spark({ dy: -1, mouth: S_SMILE, fx: [[SP_B, 6, -7]] }),
      spark({ mouth: S_OPEN, finR: [FIN_R_UP, 14, 7], fx: [[SP_C, 6, -7]] }),
    ],
  },
  ask: {
    fps: 3,
    frames: [
      spark({ dx: 1, mouth: S_O, finR: [FIN_R_UP, 14, 6], fx: [[S_QUESTION, 12, -9], [SP_SMALL, 8, -5]] }),
      spark({ dx: 2, mouth: S_O, finR: [FIN_R_UP, 14, 5], fx: [[S_QUESTION, 12, -10], [SP_TINY, 7, -6]] }),
    ],
  },
  pay: {
    fps: 6,
    frames: [
      spark({ mouth: S_SMILE, finR: [FIN_R_UP, 14, 6], fx: [[CARD, 15, 2], [SP_A, 6, -7]] }),
      spark({ dy: -1, mouth: S_OPEN, finR: [FIN_R_UP, 14, 4], fx: [[CARD, 15, 0], [SP_B, 6, -7]] }),
      spark({ mouth: S_OPEN, finR: [FIN_R_DOWN, 14, 10], fx: [[CARD, 15, 9], [STAMP_FX, 15, 13], [SP_C, 6, -7]] }),
      spark({ mouth: S_SMILE, eyes: S_EYE_HAPPY, finR: [FIN_R_DOWN, 14, 10], fx: [[CARD, 15, 9], [COIN, -5, 1], [COIN, 17, 4], [SP_A, 6, -7]] }),
    ],
  },
  cheer: {
    fps: 8,
    frames: [
      spark({ eyes: S_EYE_HAPPY, mouth: S_OPEN, finL: [FIN_L_UP, 0, 6], finR: [FIN_R_UP, 14, 6], fx: [[SP_A, 6, -7], [BURST_S, -6, -6]] }),
      spark({ dy: -2, eyes: S_EYE_HAPPY, mouth: S_OPEN, finL: [FIN_L_UP, 0, 5], finR: [FIN_R_UP, 14, 5], fx: [[SP_B, 6, -7], [BURST_Y, -7, -8], [BURST_S, 17, -4]] }),
      spark({ dy: -3, eyes: S_EYE_HAPPY, mouth: S_OPEN, finL: [FIN_L_UP, 0, 5], finR: [FIN_R_UP, 14, 5], fx: [[SP_C, 6, -7], [BURST_P, 16, -9], [BURST_O, -7, 1]] }),
      spark({ dy: -1, eyes: S_EYE_HAPPY, mouth: S_OPEN, finL: [FIN_L_UP, 0, 6], finR: [FIN_R_UP, 14, 6], fx: [[SP_A, 6, -7], [BURST_Y, 16, 1], [BURST_S, -5, -3]] }),
    ],
  },
  sulk: {
    fps: 2,
    frames: [
      spark({ fuse: "droop", eyes: S_EYE_SAD, mouth: S_FROWN, fx: [[SP_SMALL, 3, -1]] }),
      spark({ fuse: "droop", eyes: S_EYE_SAD, mouth: S_FROWN, dy: 1, fx: [[SP_TINY, 3, 1]] }),
    ],
  },
};

/* ------------------------------------------------------------------ Penny */

const PENNY_PALETTE: Record<string, string> = {
  t: "#5cc4a6", // sage-teal body
  a: "#a9e2bd", // sage highlight
  T: "#2c9488", // teal wings and tufts
  b: "#e2f8ec", // belly
  B: "#a7dcc5", // belly feathers
  y: "#f4e2a8", // glasses rims
  L: "#e6fbff", // lenses
  k: "#10302c", // pupils
  n: "#ffb35c", // beak and feet
  w: "#f7f4ea", // receipt paper
  z: "#a9a393", // receipt print
  m: "#a6f5dc", // mint question mark
};

const PENNY_BODY: Art = [
  "..TT........TT..",
  "..tTt......tTt..",
  "..tttttttttttt..",
  ".tttttttttttttt.",
  ".tttttttttttttt.",
  ".tttttttttttttt.",
  ".tttttttttttttt.",
  ".tttttttttttttt.",
  ".tttttttttttttt.",
  ".tttttttttttttt.",
  ".TtttbbbbbbtttT.",
  ".TttbbBbbBbbttT.",
  ".TttbbbbbbbbttT.",
  ".TttbBbbBbbbttT.",
  "..TtbbbbbbbbtT..",
  "...ttbbbbbbtt...",
  "....tttttttt....",
  ".....n....n.....",
  "....nn....nn....",
];

const P_HIGHLIGHT: Art = ["aaaa", "aa..", "a..."];
const GLASSES: Art = [
  ".yyyy....yyyy.",
  "yLLLLyyyyLLLLy",
  "yLLLLy..yLLLLy",
  "yLLLLy..yLLLLy",
  ".yyyy....yyyy.",
];
// Eye parts cover a 4x3 lens.
const PE_OPEN: Art = ["LLLL", "LkkL", "LkkL"];
const PE_BLINK: Art = ["LLLL", "LLLL", "kkkk"];
const PE_UP: Art = ["LkkL", "LkkL", "LLLL"];
const PE_DOWN_R: Art = ["LLLL", "LLkk", "LLkk"];
const PE_DOWN_L: Art = ["LLLL", "kkLL", "kkLL"];
const PE_HAPPY: Art = ["LkkL", "kLLk", "LLLL"];
const PE_SAD: Art = ["LLLL", "kkkk", "LkkL"];

const BEAK: Art = ["nn"];
const BEAK_OPEN: Art = ["nn", "kk"];

const WING_L_DOWN: Art = [".T", "TT", "TT", "T."];
const WING_L_UP: Art = ["T.", "TT", ".T", ".T"];
const WING_L_MID: Art = ["TT.", "TTT", ".TT"];
const WING_R_HOLD: Art = ["T.", "TT", "TT", ".T"];
const WING_R_UP: Art = [".T", "TT", "T.", "T."];

const P_QUESTION: Art = ["mmm.", "...m", "..m.", "....", "..m."];
const RUFFLE_A: Art = ["T...T"];
const RUFFLE_B: Art = [".T.T."];
const HOOT: Art = ["m.m", ".m."];

// A receipt strip `rows` tall, with a torn bottom edge.
function receipt(rows: number): Art {
  const out: Art = [];
  for (let i = 0; i < rows - 1; i++) out.push(i % 2 === 1 ? "wzw" : "www");
  out.push("w.w");
  return out;
}
const RECEIPT_SHORT = receipt(6);
const RECEIPT_FLY: Art = ["www", "wzw", "www", "w.w"];

function penny(o: {
  eyes?: Art;
  glassesY?: number;
  beak?: Art;
  wingL?: Layer;
  wingR?: Layer;
  receipt?: Layer[];
  fx?: Layer[];
  dx?: number;
  dy?: number;
}): Frame {
  const gy = o.glassesY ?? 4;
  const eyes = o.eyes ?? PE_OPEN;
  return {
    dx: o.dx,
    dy: o.dy,
    layers: [
      [PENNY_BODY, 0, 0],
      [P_HIGHLIGHT, 2, 2],
      [GLASSES, 1, gy],
      [eyes, 2, gy + 1],
      [eyes, 10, gy + 1],
      [o.beak ?? BEAK, 7, 9],
      o.wingL ?? [WING_L_DOWN, -1, 10],
      ...(o.receipt ?? [[RECEIPT_SHORT, 16, 9] as Layer]),
      o.wingR ?? [WING_R_HOLD, 15, 9],
      ...(o.fx ?? []),
    ],
  };
}

const PENNY: Record<PixelState, Anim> = {
  idle: {
    fps: 3,
    frames: [
      penny({}),
      penny({ receipt: [[receipt(3), 16, 9], [["wzw", "www", "w.w"], 17, 12]] }),
      penny({ eyes: PE_BLINK }),
      penny({ dy: -1 }),
    ],
  },
  think: {
    fps: 4,
    frames: [
      penny({ eyes: PE_UP }),
      penny({ eyes: PE_UP, glassesY: 3, wingL: [WING_L_UP, -1, 4] }),
      penny({ eyes: PE_UP, wingL: [WING_L_UP, -1, 5] }),
    ],
  },
  lookup: {
    fps: 6,
    frames: [
      penny({ eyes: PE_DOWN_R, receipt: [[receipt(7), 16, 9]] }),
      penny({ eyes: PE_DOWN_R, receipt: [[receipt(10), 16, 9]] }),
      penny({ eyes: PE_DOWN_L, receipt: [[receipt(12), 16, 9]], wingL: [WING_L_MID, -2, 9] }),
      penny({ eyes: PE_DOWN_R, receipt: [[receipt(12), 16, 9], [["ww"], 19, 20]] }),
    ],
  },
  talk: {
    fps: 6,
    frames: [
      penny({ beak: BEAK_OPEN, wingL: [WING_L_MID, -2, 9] }),
      penny({ dy: 1, beak: BEAK }),
      penny({ beak: BEAK_OPEN, wingL: [WING_L_UP, -1, 6] }),
    ],
  },
  ask: {
    fps: 3,
    frames: [
      penny({ wingL: [WING_L_UP, -1, 5], fx: [[P_QUESTION, 6, -8]] }),
      penny({ wingL: [WING_L_UP, -1, 4], fx: [[P_QUESTION, 6, -9]], dy: -1 }),
    ],
  },
  pay: {
    fps: 3,
    frames: [penny({}), penny({ eyes: PE_BLINK })],
  },
  cheer: {
    fps: 8,
    frames: [
      penny({ eyes: PE_HAPPY, beak: BEAK_OPEN, wingL: [WING_L_UP, -1, 5], wingR: [WING_R_UP, 15, 5], receipt: [[RECEIPT_FLY, 15, -2]], fx: [[HOOT, -4, -2]] }),
      penny({ dy: -2, eyes: PE_HAPPY, beak: BEAK_OPEN, wingL: [WING_L_UP, -1, 4], wingR: [WING_R_UP, 15, 4], receipt: [[RECEIPT_FLY, 12, -8]], fx: [[HOOT, -5, -5]] }),
      penny({ dy: -3, eyes: PE_HAPPY, beak: BEAK_OPEN, wingL: [WING_L_UP, -1, 4], wingR: [WING_R_UP, 15, 4], receipt: [[RECEIPT_FLY, 4, -8]], fx: [[HOOT, 17, -4]] }),
      penny({ dy: -1, eyes: PE_HAPPY, beak: BEAK, wingL: [WING_L_UP, -1, 5], wingR: [WING_R_UP, 15, 5], receipt: [[RECEIPT_FLY, -3, -6]], fx: [[HOOT, 17, -1]] }),
    ],
  },
  sulk: {
    fps: 2,
    frames: [
      penny({ eyes: PE_SAD, glassesY: 5, fx: [[RUFFLE_A, 5, -1]] }),
      penny({ eyes: PE_SAD, glassesY: 5, fx: [[RUFFLE_B, 5, -1]] }),
    ],
  },
};

/* ------------------------------------------------------------- rendering */

const SPRITES: Record<Advisor, { palette: Record<string, string>; anims: Record<PixelState, Anim> }> = {
  spark: { palette: SPARK_PALETTE, anims: SPARK },
  penny: { palette: PENNY_PALETTE, anims: PENNY },
};

export function getAnim(who: Advisor, state: PixelState): Anim {
  return SPRITES[who].anims[state];
}

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Frames are rasterised once and cached per advisor, state and frame.
const cache = new Map<string, ImageData>();

export function frameImage(who: Advisor, state: PixelState, index: number): ImageData {
  const key = `${who}:${state}:${index}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { palette, anims } = SPRITES[who];
  const frame = anims[state].frames[index];
  const img = new ImageData(SIZE, SIZE);
  for (const [art, x, y] of frame.layers) {
    art.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        const ch = row[rx];
        const color = palette[ch];
        if (!color) continue;
        const px = OX + x + rx + (frame.dx ?? 0);
        const py = OY + y + ry + (frame.dy ?? 0);
        if (px < 0 || py < 0 || px >= SIZE || py >= SIZE) continue;
        const [r, g, b] = hex(color);
        const i = (py * SIZE + px) * 4;
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = b;
        img.data[i + 3] = 255;
      }
    });
  }
  cache.set(key, img);
  return img;
}
