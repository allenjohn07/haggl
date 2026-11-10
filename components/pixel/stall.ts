// The market stall, baked once per size and palette into two low-res layers:
// `back` (awning, wall, shelves of jars, lanterns, cobbles) is drawn behind Mr. Pickle,
// `front` (the counter) is drawn over his feet.
import { OUTLINE, scenePalette, type ScenePalette } from "./palette";

export const SCENE_H = 92; // logical pixels tall

export function stallLayout(W: number, H = SCENE_H) {
  const counterTop = H - 34;
  const ground = H - 20;
  return {
    counterTop,
    counterLeft: Math.round(W * 0.3),
    ground,
    lanterns: [Math.round(W * 0.14), Math.round(W * 0.86)],
    // feet positions per character
    bao: { x: Math.round(W * 0.19), y: H - 9 },
    pickle: { x: Math.round(W * 0.6), y: counterTop + 3 },
    beanie: { x: Math.round(W * 0.86), y: H - 9 },
    item: { x: Math.round(W * 0.4), y: counterTop },
  };
}

const hash = (x: number, y: number, s = 0) => {
  let n = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
export const dither = (x: number, y: number, t: number) => t * 16 > BAYER[y & 3][x & 3] + 0.5;

function layer(W: number, H: number) {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  return { c, ctx, px: (x: number, y: number, color: string) => { ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1); } };
}

const LANTERN = ["..O..", ".OGO.", "OLLLO", "OLHLO", "OLHLO", "OLLLO", ".OGO.", "..O.."];

export function bakeStall(W: number, H: number, dusk: boolean) {
  const p: ScenePalette = scenePalette(dusk);
  const L = stallLayout(W, H);
  const back = layer(W, H);
  const { px } = back;

  // back wall: vertical planks with seams and a few knots
  for (let y = 12; y < L.ground; y++) for (let x = 0; x < W; x++) {
    const seam = x % 8 === 0;
    let c = seam ? p.wallLine : x % 8 === 1 ? p.wallH : p.wall;
    if (!seam && hash(Math.floor(x / 8), Math.floor(y / 3), 4) > 0.93 && x % 8 === 4) c = p.wallLine;
    px(x, y, c);
  }
  // shelves with jars of "haunted" stock
  for (const sy of [30, 44]) {
    for (let x = 6; x < W - 6; x++) { px(x, sy, p.shelfH); px(x, sy + 1, p.shelf); px(x, sy + 2, OUTLINE); }
    for (let x = 9; x < W - 12; x += 8 + Math.floor(hash(x, sy) * 5)) {
      const h = 5 + Math.floor(hash(x, sy, 2) * 3), w = 5;
      const k = hash(x, sy, 3);
      const body = k < 0.5 ? p.jarGreen : k < 0.8 ? p.jarAmber : p.jarPlum;
      for (let y = sy - h; y < sy; y++) for (let i = 0; i < w; i++) {
        const edge = i === 0 || i === w - 1 || y === sy - h;
        px(x + i, y, edge ? OUTLINE : y <= sy - h + 1 ? p.jarLid : i === 1 && y < sy - 1 ? p.glass : body);
      }
    }
  }
  // poles
  for (const x0 of [2, W - 5]) for (let y = 12; y < L.ground; y++) {
    px(x0, y, OUTLINE); px(x0 + 1, y, p.poleH); px(x0 + 2, y, p.pole); px(x0 + 3, y, OUTLINE);
  }
  // awning: red and cream stripes with a scalloped edge
  for (let x = 0; x < W; x++) {
    const stripe = Math.floor(x / 8) % 2 === 0;
    const lx = (x % 8) - 3.5;
    const depth = 14 + Math.round(Math.sqrt(Math.max(0, 16 - lx * lx)) * 0.75);
    for (let y = 0; y <= depth; y++) {
      let c = stripe ? p.awning : p.cream;
      if (y < 3) c = y === 2 ? OUTLINE : p.awningD;
      else if (y >= depth - 1 || x % 8 === 7) c = stripe ? p.awningD : p.creamD;
      if (y === depth) c = OUTLINE;
      px(x, y, c);
    }
  }
  // hanging lanterns
  for (const lx of L.lanterns) {
    for (let y = 16; y < 20; y++) px(lx, y, OUTLINE);
    const map: Record<string, string> = { O: OUTLINE, G: p.jarLid, L: p.lantern, H: p.lanternH };
    LANTERN.forEach((r, y) => [...r].forEach((k, x) => { if (k !== ".") px(lx - 2 + x, 20 + y, map[k]); }));
  }
  // cobblestones
  for (let y = L.ground; y < H; y++) for (let x = 0; x < W; x++) {
    const row = Math.floor((y - L.ground) / 4), off = row % 2 ? 4 : 0;
    const lx = (x + off) % 8, ly = (y - L.ground) % 4;
    const n = hash(Math.floor((x + off) / 8), row, 7);
    let c = n > 0.6 ? p.cobbleD : p.cobble;
    if (lx === 0 || ly === 3) c = p.grout;
    else if (ly === 0 && lx < 5) c = p.cobbleH;
    else if (lx === 7 || (ly === 2 && lx > 4)) c = p.cobbleD;
    px(x, y, y === L.ground ? OUTLINE : c);
  }

  // counter (front layer)
  const front = layer(W, H);
  for (let y = L.counterTop - 1; y <= L.ground; y++) for (let x = L.counterLeft - 1; x < W; x++) {
    let c = p.counter;
    if (y === L.counterTop - 1 || x === L.counterLeft - 1 || y === L.ground) c = OUTLINE;
    else if (y === L.counterTop) c = p.counterH;
    else if (y === L.counterTop + 1) c = p.counter;
    else if (y === L.counterTop + 2) c = OUTLINE;
    else if ((x - L.counterLeft) % 7 === 0) c = p.counterD;
    else if ((x - L.counterLeft) % 7 === 1) c = p.counterH;
    else if (y === L.ground - 1) c = p.counterD;
    front.px(x, y, c);
  }
  return { back: back.c, front: front.c, layout: L, palette: p };
}

// Pixel-true soft light or shadow: an ordered-dither falloff instead of a blur.
export function ditherGlow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string, strength: number) {
  ctx.fillStyle = color;
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (e <= 1 && dither(x, y, (1 - e) * strength)) ctx.fillRect(x, y, 1, 1);
  }
}
