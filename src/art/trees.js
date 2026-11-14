// 树木。树冠不是一整团实色，而是先铺一层淡的底，再一小点一小点地“点叶”，
// 左上亮、右下暗，边缘啃掉一些，留出透气的缝——取的是水墨画点叶的意思。
import { Grid, rng } from './pixel.js';
import { P, SHADOW } from './palette.js';

const LEAF = [P.g3, P.g4, P.g5, P.g6, P.g7];
const BLOSSOM = [P.p0, P.p1, P.p2, P.p3, P.p3];
const WILLOW = [P.g1, P.b1, P.g3, P.b2, P.g5];

/**
 * 画一团树冠。blobs 是组成轮廓的椭圆 [[cx, cy, rx, ry], …]，tones 是从亮到暗的五个颜色。
 */
function canopy(g, r, blobs, tones, { erode = 0.32, holes = 0.02, dabs = 0.16 } = {}) {
  const mask = new Grid(g.w, g.h);
  for (const [cx, cy, rx, ry] of blobs) mask.ellipse(cx, cy, rx, ry, 1);
  const inside = (x, y) => mask.get(x, y) === 1;
  const body = new Grid(g.w, g.h);
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if ((edge && r() < erode) || r() < holes) continue;
      body.set(x, y, tones[2]);
    }
  const on = (x, y) => body.opaque(x, y);
  // 每一团：左上一片亮，最亮的一小块在更左上
  for (const [cx, cy, rx, ry] of blobs) {
    body.ellipse(cx - rx * 0.22, cy - ry * 0.28, rx * 0.66, ry * 0.58, tones[1], on);
    body.ellipse(cx - rx * 0.36, cy - ry * 0.46, rx * 0.3, ry * 0.26, tones[0], on);
  }
  // 整棵树的右下边缘压暗
  body.each((x, y) => {
    if (!inside(x + 1, y + 1) || !inside(x, y + 2)) return tones[4];
    if (!inside(x + 3, y + 2) || !inside(x + 1, y + 4)) return tones[3];
    return undefined;
  });
  // 点叶：比周围深一号或浅一号的小点
  const count = Math.floor(blobs.reduce((a, [, , rx, ry]) => a + rx * ry * 3.1, 0) * dabs);
  for (let i = 0; i < count; i++) {
    const [cx, cy, rx, ry] = blobs[Math.floor(r() * blobs.length)];
    const x = Math.round(cx + (r() * 2 - 1) * rx);
    const y = Math.round(cy + (r() * 2 - 1) * ry);
    if (!on(x, y)) continue;
    const index = tones.indexOf(body.get(x, y));
    const tone = tones[Math.max(0, Math.min(4, index + (r() < 0.55 ? 1 : -1)))];
    body.set(x, y, tone);
    if (on(x + 1, y) && r() < 0.7) body.set(x + 1, y, tone);
    if (on(x, y - 1) && r() < 0.35) body.set(x, y - 1, tone);
  }
  g.blit(body, 0, 0);
}

function trunk(g, x, top, bottom, width, colors = [P.t2, P.t3, P.t4]) {
  for (let y = top; y <= bottom; y++) {
    const flare = y > bottom - 4 ? (bottom - y < 2 ? 2 : 1) : 0;
    const x0 = x - Math.floor(width / 2) - flare;
    const x1 = x0 + width - 1 + flare * 2;
    g.hline(x0, x1, y, colors[1]).set(x0, y, colors[0]).set(x1, y, colors[2]);
    if (width > 4) g.set(x0 + 1, y, colors[0]);
  }
  for (let y = top + 3; y < bottom - 3; y += 5) g.set(x, y, colors[2]);
}

const shade = (g, cx, cy, rx, ry) => g.ellipse(cx, cy, rx, ry, SHADOW);
const jitter = (r, blobs, by) =>
  blobs.map(([x, y, rx, ry]) => [x + (r() * 2 - 1) * by, y + (r() * 2 - 1) * by, rx, ry]);

export function broadTree(seed) {
  const g = new Grid(48, 62);
  const r = rng(seed);
  shade(g, 27, 58, 13, 3);
  trunk(g, 24, 38, 59, 5);
  const blobs = [
    [24, 22, 17, 14],
    [13, 28, 10, 9],
    [35, 27, 11, 10],
    [24, 11, 11, 8],
    [18, 35, 9, 5],
    [31, 36, 9, 5],
  ];
  canopy(g, r, jitter(r, blobs, 2), LEAF);
  return { grid: g, ax: 24, ay: 61 };
}

export function camphorTree(seed) {
  const g = new Grid(92, 104);
  const r = rng(seed);
  shade(g, 50, 99, 26, 4);
  trunk(g, 46, 58, 100, 11);
  g.line(42, 62, 30, 48, P.t3)
    .line(43, 62, 31, 48, P.t4)
    .line(50, 62, 62, 46, P.t3)
    .line(51, 62, 63, 46, P.t4);
  const blobs = [
    [46, 34, 30, 22],
    [20, 46, 17, 13],
    [72, 44, 17, 14],
    [46, 15, 21, 12],
    [31, 57, 15, 8],
    [61, 58, 15, 8],
    [13, 31, 10, 8],
    [79, 28, 10, 8],
  ];
  canopy(g, r, jitter(r, blobs, 2), LEAF, { dabs: 0.2 });
  // 老樟树上系着几根祈福的红布条
  for (const [x, y] of [
    [33, 66],
    [56, 68],
    [64, 63],
  ])
    g.vline(x, y, y + 5, P.c1).set(x + 1, y + 5, P.c2);
  return { grid: g, ax: 46, ay: 102 };
}

export function peachTree(seed) {
  const g = new Grid(40, 50);
  const r = rng(seed);
  shade(g, 22, 47, 10, 2);
  trunk(g, 20, 30, 48, 3, [P.t3, P.t4, P.t4]);
  g.line(19, 32, 12, 22, P.t4).line(21, 32, 28, 21, P.t4).line(20, 30, 20, 14, P.t4);
  const blobs = [
    [20, 17, 13, 10],
    [10, 22, 8, 7],
    [30, 21, 8, 7],
    [20, 9, 8, 6],
  ];
  canopy(g, r, jitter(r, blobs, 1.5), BLOSSOM, { erode: 0.45, holes: 0.1, dabs: 0.22 });
  for (let i = 0; i < 14; i++) {
    const x = 6 + Math.floor(r() * 28);
    const y = 6 + Math.floor(r() * 22);
    if (g.opaque(x, y)) g.set(x, y, r() < 0.5 ? P.g4 : P.g3);
  }
  return { grid: g, ax: 20, ay: 49 };
}

export function willowTree(seed) {
  const g = new Grid(48, 64);
  const r = rng(seed);
  shade(g, 25, 61, 11, 2);
  for (let y = 26; y <= 62; y++) {
    const x = Math.round(27 - (y - 26) * 0.14);
    g.hline(x - 1, x + (y > 54 ? 3 : 2), y, P.t3)
      .set(x - 1, y, P.t2)
      .set(x + (y > 54 ? 3 : 2), y, P.t4);
  }
  canopy(
    g,
    r,
    [
      [26, 17, 15, 9],
      [15, 22, 9, 7],
      [37, 22, 9, 7],
    ],
    WILLOW,
    { erode: 0.5, holes: 0.08 },
  );
  // 垂下来的柳丝：一串串断断续续的叶点
  for (let i = 0; i < 17; i++) {
    const x0 = 5 + i * 2.4 + r() * 1.5;
    const from = 20 + Math.abs(i - 8) * 0.7 + r() * 4;
    const len = 16 + r() * 16;
    const sway = (r() - 0.5) * 0.25;
    for (let d = 0; d < len; d++) {
      if (d % 4 === 3) continue;
      const tone = d > len * 0.7 ? P.g1 : [P.b2, P.g3, P.g4][i % 3];
      g.set(Math.round(x0 + d * sway), Math.round(from + d), tone);
    }
  }
  return { grid: g, ax: 25, ay: 63 };
}

export function pineTree(seed) {
  const g = new Grid(38, 60);
  const r = rng(seed);
  shade(g, 21, 57, 10, 2);
  trunk(g, 19, 40, 58, 4, [P.t1, P.t2, P.t3]);
  for (const [cx, cy, rx, ry] of [
    [19, 42, 15, 6],
    [19, 33, 13, 6],
    [19, 24, 11, 6],
    [19, 15, 8, 6],
    [19, 8, 5, 5],
  ]) {
    const pad = new Grid(g.w, g.h);
    pad.ellipse(cx, cy, rx, ry, P.n1);
    pad.each((x, y) => {
      if (!pad.opaque(x, y - 1)) return P.n0;
      if (!pad.opaque(x, y + 1)) return P.n3;
      if (!pad.opaque(x, y + 2)) return P.n2;
      return r() < 0.1 ? P.n2 : undefined;
    });
    g.blit(pad, 0, 0);
    for (let x = cx - rx + 1; x < cx + rx; x += 2)
      if (r() < 0.7) g.set(x, Math.round(cy + ry * Math.sqrt(1 - ((x - cx) / rx) ** 2)) + 1, P.n3);
  }
  return { grid: g, ax: 19, ay: 59 };
}

export function bambooGrove(seed) {
  const g = new Grid(34, 68);
  const r = rng(seed);
  shade(g, 18, 65, 12, 2);
  const leaf = (x, y, dx, dy, len, c) => {
    for (let i = 0; i < len; i++)
      g.set(Math.round(x + dx * i), Math.round(y + dy * i), i === len - 1 ? P.g2 : c);
  };
  for (let s = 0; s < 6; s++) {
    const base = 6 + s * 4.4 + r() * 2;
    const lean = (r() - 0.5) * 0.16;
    const top = 6 + Math.floor(r() * 12);
    for (let y = 66; y >= top; y--) {
      const x = Math.round(base + (66 - y) * lean);
      const joint = (66 - y) % 8 === 7;
      g.set(x, y, joint ? P.b4 : P.b1).set(x + 1, y, joint ? P.b4 : P.b3);
    }
    for (let k = 0; k < 5; k++) {
      const y = top + 2 + k * 6 + Math.floor(r() * 3);
      const x = Math.round(base + (66 - y) * lean);
      const c = [P.g4, P.g5, P.b3][Math.floor(r() * 3)];
      const side = r() < 0.5 ? -1 : 1;
      leaf(x, y, side * 0.9, 0.5, 6, c);
      leaf(x, y, side * 0.5, 0.9, 6, c);
      leaf(x, y, side * 1.0, 0.1, 5, c);
    }
  }
  return { grid: g, ax: 17, ay: 67 };
}

export function bush(seed) {
  const g = new Grid(24, 18);
  const r = rng(seed);
  shade(g, 13, 16, 9, 2);
  canopy(
    g,
    r,
    [
      [12, 9, 9, 6],
      [6, 11, 5, 4],
      [18, 11, 5, 4],
    ],
    LEAF,
    { erode: 0.25 },
  );
  if (seed % 2)
    for (const [x, y] of [
      [8, 8],
      [14, 6],
      [16, 11],
    ])
      g.set(x, y, P.c1);
  return { grid: g, ax: 12, ay: 17 };
}
