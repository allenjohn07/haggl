// Characters are rasterised from simple shape functions into a 32x32 grid,
// then shaded (lit top-left, shaded bottom-right), outlined, and given a face and props.
// Each cell holds a one-letter colour key (see palette.ts); "" is transparent.
import { BODY, SHARED } from "./palette";

export type CharacterId = "bao" | "pickle" | "beanie";
export type CharState = "idle" | "think" | "search" | "talk" | "pay" | "cheer" | "sulk";

export const STATES: Record<CharState, { frames: number; fps: number }> = {
  idle: { frames: 4, fps: 3 },
  think: { frames: 3, fps: 4 },
  search: { frames: 4, fps: 5 },
  talk: { frames: 3, fps: 6 },
  pay: { frames: 4, fps: 5 },
  cheer: { frames: 4, fps: 8 },
  sulk: { frames: 2, fps: 2 },
};

export const NAMES: Record<CharacterId, string> = { bao: "Bao", pickle: "Mr. Pickle", beanie: "Beanie" };

export const G = 32;
export const BOT = 28; // feet row
const CX = 16;

const SHAPES: Record<CharacterId, (x: number, y: number) => boolean> = {
  // steamed bun: a wide dome with a soft round bottom and a little knot on top
  bao: (x, y) => {
    if (y > BOT) return false;
    const dx = (x - CX) / 12;
    if (y <= BOT - 5) return dx * dx + ((y - (BOT - 5)) / 13) ** 2 <= 1 || (y >= 9 && y <= 11 && Math.abs(x - CX) <= 1);
    return dx * dx + ((y - (BOT - 5)) / 5.5) ** 2 <= 1;
  },
  // pickle: a tall capsule with a couple of bumps
  pickle: (x, y) => {
    if (y > BOT) return false;
    const r = 6.5, cy = Math.max(8 + r, Math.min(BOT - r, y));
    if ((x === 9 && y === 14) || (x === 23 && y === 20)) return true;
    return (x - CX) ** 2 + (y - cy) ** 2 <= r * r;
  },
  // coffee bean: a small upright oval
  beanie: (x, y) => y <= BOT && ((x - CX) / 7.5) ** 2 + ((y - (BOT - 8)) / 9) ** 2 <= 1,
};

const FACE_Y: Record<CharacterId, number> = { bao: 19, pickle: 14, beanie: 19 };
const EYES: Record<CharacterId, [number, number]> = { bao: [CX - 5, CX + 3], pickle: [CX - 4, CX + 2], beanie: [CX - 4, CX + 2] };

type Grid = string[][];
const rows = (r: string[]) => r;

const PURSE = rows([".OGO.", "OUUUO", "OUGUO", "OUUUO", ".OOO."]);
const ABACUS = rows(["OOOOOOO", "OXX-x-O", "O-x-XXO", "OX-xx-O", "OOOOOOO"]);
const ABACUS2 = rows(["OOOOOOO", "O-XXx-O", "OXx--XO", "O-Xx-xO", "OOOOOOO"]);
const CLIPBOARD = rows(["OOgggOO", "OCNNNCO", "OCnnNCO", "OCNNNCO", "OCnnnCO", "OCNNNCO", "OOOOOOO"]);
const MAGNIFIER = rows([".OOO..", "OLLLO.", "OLWLO.", "OLLLO.", ".OOOO.", "....OO"]);
const STAMP = rows([".OOO.", ".OhO.", ".OhO.", "OKKKO", "OOOOO"]);
const RECEIPT = rows(["OOOOOOO", "ONnNnNO", "ONNNNNO"]);
const CARD = rows(["OOOOOO", "ObbbbO", "OyyyyO", "ObbbbO", "OOOOOO"]);
const COIN = rows([".OOO.", "OGGGO", "OGYGO", "OGGGO", ".OOO."]);
const DOT = rows([".OO.", "OWWO", "OWWO", ".OO."]);
const PAW = rows([".OO.", "OHHO", "OSSO", ".OO."]);
const SPARK = rows(["..Y..", "..Y..", "YY.YY", "..Y..", "..Y.."]);
const CLOUD = rows(["..OOO....", ".ODDDOOO.", "ODDDDDDDO", "ODDDDDDDO", ".OOOOOOO."]);

function grid(id: CharacterId, state: CharState, frame: number): Grid {
  let sx = 1, sy = 1, dy = 0;
  if (state === "idle" && frame === 1) { sx = 1.06; sy = 0.93; }
  if (state === "talk" && frame === 2) dy = -1;
  if (state === "pay" && frame === 2) { sx = 1.04; sy = 0.95; }
  if (state === "sulk") { sx = 1.08; sy = 0.9; }
  if (state === "cheer") [sx, sy, dy] = ([[1.1, 0.88, 0], [1, 1, -3], [1, 1, -5], [1, 1, -2]] as const)[frame];

  const g: Grid = Array.from({ length: G }, () => new Array(G).fill(""));
  const set = (x: number, y: number, k: string) => { if (y >= 0 && y < G && x >= 0 && x < G) g[y][x] = k; };
  const at = (x: number, y: number) => (y >= 0 && y < G && x >= 0 && x < G ? g[y][x] : "");
  const shape = SHAPES[id];
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) if (shape(CX + (x - CX) / sx, BOT - (BOT - (y - dy)) / sy)) g[y][x] = "B";

  let top = 0;
  while (top < G && !g[top].includes("B")) top++;
  const fy = Math.round(BOT - (BOT - FACE_Y[id]) * sy) + dy;

  // cheer: both arms up (part of the silhouette so they get outlined)
  if (state === "cheer" && frame > 0) {
    const ay = fy + 3, row = g[ay], l = row.indexOf("B"), r = row.lastIndexOf("B");
    for (const [ox, oy] of [[1, -1], [1, -2], [2, -3], [2, -4]]) { set(r + ox, ay + oy, "B"); set(l - ox, ay + oy, "B"); }
  }
  // Mr. Pickle's apron covers his lower half
  if (id === "pickle") for (let y = fy + 6; y < G; y++) for (let x = CX - 5; x <= CX + 5; x++) if (g[y][x] === "B") g[y][x] = "A";

  // shading reads a snapshot of the silhouette so changes never cascade
  const mask = g.map((r) => r.map((v) => v !== ""));
  const body = (x: number, y: number) => !!mask[y]?.[x];
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
    const v = g[y][x];
    if (v !== "B" && v !== "A") continue;
    const shade = !body(x, y + 1) || !body(x, y + 2) || (!body(x + 1, y) && x > CX);
    const lit = (!body(x, y - 1) && x <= CX + 1) || (!body(x - 1, y) && y < BOT - 4);
    if (shade) g[y][x] = v === "B" ? "S" : "a";
    else if (lit && v === "B") g[y][x] = "H";
  }
  if (at(CX - 4, top + 3) === "B") set(CX - 4, top + 3, "H");
  if (at(CX - 3, top + 3) === "B") set(CX - 3, top + 3, "H");

  // character details on the body
  if (id === "bao") for (const [x, y] of [[CX - 2, top + 3], [CX - 3, top + 4], [CX + 2, top + 3], [CX + 3, top + 4]]) set(x, y, "S");
  if (id === "pickle") for (const [x, y] of [[CX - 3, top + 3], [CX + 3, top + 6], [CX - 4, fy + 4]]) if (at(x, y) === "B") set(x, y, "S");
  if (id === "beanie") for (let k = 0; k < 5; k++) set(CX + (k < 2 ? -1 : k < 4 ? 0 : 1), top + 1 + k, "S");

  // feet
  const feet = id === "bao" ? [CX - 5, CX - 4, CX + 3, CX + 4] : [CX - 3, CX - 2, CX + 1, CX + 2];
  if (dy === 0) for (const x of feet) set(x, BOT + 1, "O");

  // face
  const [lx, rx] = EYES[id];
  const eye = (x: number, kind: "open" | "closed" | "happy" | "up" | "down") => {
    const y = fy + (kind === "up" ? -1 : kind === "down" ? 1 : 0);
    if (kind === "closed") { set(x, fy + 1, "F"); set(x + 1, fy + 1, "F"); }
    else if (kind === "happy") { set(x - 1, fy + 1, "F"); set(x, fy, "F"); set(x + 1, fy, "F"); set(x + 2, fy + 1, "F"); }
    else { set(x, y, "W"); set(x + 1, y, "F"); set(x, y + 1, "F"); set(x + 1, y + 1, "F"); }
  };
  const look = state === "think" ? "up" : state === "search" ? "down" : state === "cheer" ? "happy" : "open";
  eye(lx, state === "sulk" || (state === "idle" && frame === 3) ? "closed" : look);
  eye(rx, state === "idle" && frame === 3 ? "closed" : look);

  if (id === "bao") for (const x of [lx - 2, lx - 1, rx + 2, rx + 3]) set(x, fy + 2, "P");
  if (id === "beanie") {
    for (const ex of [lx, rx]) {
      for (let x = ex; x <= ex + 1; x++) { set(x, fy - 1, "g"); set(x, fy + 2, "g"); }
      for (let y = fy; y <= fy + 1; y++) { set(ex - 1, y, "g"); set(ex + 2, y, "g"); }
    }
    set(lx + 3, fy, "g"); set(rx - 1, fy, "g");
  }
  if (id === "pickle") {
    if (state !== "cheer") { set(lx - 1, fy - 2, "M"); set(lx, fy - 2, "M"); set(lx + 1, fy - 1, "M"); set(rx, fy - 1, "M"); set(rx + 1, fy - 2, "M"); set(rx + 2, fy - 2, "M"); }
    for (let x = CX - 4; x <= CX + 3; x++) set(x, fy + 2, "M");
    for (const x of [CX - 3, CX - 2, CX + 1, CX + 2]) set(x, fy + 3, "M");
    set(CX - 5, fy + 1, "M"); set(CX + 4, fy + 1, "M");
  }

  // mouth
  const my = fy + (id === "pickle" ? 4 : 3);
  const mouth = (kind: string) => {
    if (kind === "smile") { set(CX - 2, my, "F"); set(CX - 1, my + 1, "F"); set(CX, my + 1, "F"); set(CX + 1, my, "F"); }
    if (kind === "flat") { set(CX - 1, my, "F"); set(CX, my, "F"); }
    if (kind === "frown") { set(CX - 1, my, "F"); set(CX, my, "F"); set(CX - 2, my + 1, "F"); set(CX + 1, my + 1, "F"); }
    if (kind === "open") { set(CX - 1, my, "F"); set(CX, my, "F"); set(CX - 1, my + 1, "F"); set(CX, my + 1, "F"); }
    if (kind === "o") set(CX, my, "F");
    if (kind === "wide") { for (let x = CX - 2; x <= CX + 1; x++) set(x, my, "F"); set(CX - 1, my + 1, "P"); set(CX, my + 1, "P"); }
  };
  const rest = id === "bao" ? "smile" : id === "pickle" ? "frown" : "flat";
  const talk = ["open", rest === "smile" ? "flat" : rest, "open"][frame % 3];
  mouth(({ idle: rest, think: "o", search: "flat", talk, pay: id === "pickle" ? "flat" : "smile", cheer: "wide", sulk: "frown" } as const)[state]);

  if (id === "bao" && state !== "cheer") {
    set(CX - 2, fy + 5, "T"); set(CX + 2, fy + 5, "T"); set(CX - 2, fy + 7, "T"); set(CX + 2, fy + 7, "T");
    for (let x = CX - 2; x <= CX + 2; x++) set(x, fy + 6, x === CX ? "t" : "T");
  }

  // outline: every empty pixel touching the silhouette
  const out = g.map((r) => r.slice());
  for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
    if (g[y][x] !== "") continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const v = g[y + b]?.[x + a]; return v && v !== "O"; })) out[y][x] = "O";
  }

  // props drawn over the outline
  const put = (s: string[], ox: number, oy: number) => s.forEach((r, y) => [...r].forEach((k, x) => {
    if (k !== "." && oy + y >= 0 && oy + y < G && ox + x >= 0 && ox + x < G) out[oy + y][ox + x] = k;
  }));
  const holding = state === "idle" || state === "think" || state === "talk" || state === "sulk";
  if (id === "bao" && holding) put(PURSE, 25, BOT - 6);
  if (id === "pickle" && holding) put(state === "think" && frame % 2 ? ABACUS2 : ABACUS, 3, fy + 3);
  if (id === "beanie" && (holding || state === "search" || state === "pay")) put(CLIPBOARD, CX - 3, fy + 4);
  if (state === "think") {
    put(PAW, id === "pickle" ? CX + 3 : CX + 2, my);
    for (let i = 0; i <= frame; i++) put(DOT, 18 + i * 4, 3 - i);
  }
  if (state === "search") put(MAGNIFIER, CX - 3 + [-3, 0, 3, 0][frame], fy + 3);
  if (state === "pay") {
    if (id === "pickle") {
      put(RECEIPT, 22, 21);
      put(STAMP, 23, [12, 13, 16, 14][frame]);
      if (frame === 2) { out[19][21] = "Y"; out[19][29] = "Y"; }
    } else if (id === "beanie") {
      put(CARD, 22, [16, 13, 15, 14][frame]);
      if (frame === 3) put(SPARK, 26, 6);
    } else {
      put(COIN, 25, [6, 4, 3, 5][frame]);
      if (frame === 3) put(SPARK, 2, 4);
    }
  }
  if (state === "cheer") { put(SPARK, frame % 2 ? 1 : 3, frame % 2 ? 6 : 2); put(SPARK, 26, frame % 2 ? 2 : 7); }
  if (state === "sulk") {
    const cx = CX - 4, cy = Math.max(0, top - 9);
    put(CLOUD, cx, cy);
    const drops = frame ? [[2, 6], [5, 7], [7, 6]] : [[3, 7], [6, 6], [1, 7]];
    for (const [x, y] of drops) if (cy + y < top - 1) out[cy + y][cx + x] = "R";
  }
  return out;
}

const cache = new Map<string, HTMLCanvasElement>();

// A 32x32 canvas for one frame, cached per character, state and frame.
export function sprite(id: CharacterId, state: CharState, frame: number): HTMLCanvasElement {
  const key = `${id}:${state}:${frame}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = G; c.height = G;
  const ctx = c.getContext("2d")!;
  const colors: Record<string, string> = { ...SHARED, ...BODY[id] };
  grid(id, state, frame).forEach((r, y) => r.forEach((k, x) => {
    if (!k) return;
    ctx.fillStyle = colors[k] ?? SHARED.O;
    ctx.fillRect(x, y, 1, 1);
  }));
  cache.set(key, c);
  return c;
}

// Which frame to show right now. Reduced motion holds frame 0.
export function frameAt(state: CharState, now: number, offset: number, reduce: boolean) {
  if (reduce) return 0;
  const s = STATES[state];
  return Math.floor((now / 1000) * s.fps + offset) % s.frames;
}
