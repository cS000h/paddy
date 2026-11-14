// 粉墙黛瓦的农舍。正面朝南：上半是看得见的瓦坡，下半是白墙、木门、格子窗。
// 两户人家用同一个画法，细节不同：借住的小院旧一些，桂嫂家门上挂着蓝印花布门帘、屋顶有烟囱。
import { Grid, rng, noise } from './pixel.js';
import { P, SHADOW } from './palette.js';

const W = 112;
const H = 96;
const ROOF_TOP = 8;
const EAVE = 52;
const WALL_L = 8;
const WALL_R = 103;
const WALL_BOTTOM = 91;

const darker = { [P.r0]: P.r1, [P.r1]: P.r2, [P.r2]: P.r3, [P.r3]: P.r4, [P.r4]: P.r4 };
const lighter = { [P.r4]: P.r3, [P.r3]: P.r2, [P.r2]: P.r1, [P.r1]: P.r0, [P.r0]: P.r0 };

function wall(g, r, old) {
  g.rect(WALL_L, EAVE + 1, WALL_R - WALL_L + 1, WALL_BOTTOM - EAVE, P.l0);
  g.rect(WALL_R - 7, EAVE + 1, 8, WALL_BOTTOM - EAVE, P.l1);
  // 屋漏痕：檐下淌下来的淡墨水渍，旧房子多一些
  for (let i = 0; i < (old ? 10 : 5); i++) {
    const x = WALL_L + 3 + Math.floor(r() * 90);
    const len = 5 + Math.floor(r() * 13);
    for (let d = 0; d < len; d++) g.set(x, EAVE + 7 + d, d < len * 0.55 ? P.l2 : P.l1);
  }
  // 屋檐投在墙上的影子，往下渐淡
  g.rect(WALL_L, EAVE + 1, WALL_R - WALL_L + 1, 3, P.l3);
  g.rect(WALL_L, EAVE + 4, WALL_R - WALL_L + 1, 2, P.l2);
  for (let x = WALL_L; x <= WALL_R; x += 2) g.set(x, EAVE + 6, P.l2);
  // 墙脚的石基和潮气
  g.hline(WALL_L, WALL_R, 86, P.l1).hline(WALL_L, WALL_R, 87, P.l2);
  g.rect(WALL_L, 88, WALL_R - WALL_L + 1, 4, P.s2);
  g.hline(WALL_L, WALL_R, 88, P.s0).hline(WALL_L, WALL_R, 91, P.s4);
  for (let x = WALL_L + 5; x < WALL_R; x += 9 + Math.floor(r() * 5)) g.vline(x, 89, 90, P.s4);
  g.vline(WALL_L, EAVE + 1, WALL_BOTTOM, P.l3).vline(WALL_R, EAVE + 1, WALL_BOTTOM, P.ink3);
}

function roof(g, seed) {
  for (let y = ROOF_TOP; y < EAVE; y++) {
    const t = (y - ROOF_TOP) / (EAVE - ROOF_TOP);
    const x0 = Math.round(10 - 8 * t);
    const x1 = Math.round(101 + 8 * t);
    const course = Math.floor((y - ROOF_TOP) / 4);
    for (let x = x0; x <= x1; x++) {
      const tone = 0.5 * t + 0.5 * noise(x, y, 16, seed);
      let c = tone < 0.36 ? P.r1 : tone < 0.7 ? P.r2 : P.r3;
      const row = (y - ROOF_TOP) % 4;
      const col = (x + (course & 1) * 2) % 4;
      if (row === 3) c = darker[darker[c]];
      else if (col === 0) c = darker[c];
      else if (row === 0 && col === 2) c = lighter[c];
      g.set(x, y, c);
    }
    g.set(x0, y, P.r4)
      .set(x1, y, P.r4)
      .set(x0 + 1, y, P.r1)
      .set(x1 - 1, y, P.r3);
  }
  // 檐口和一排滴水瓦
  g.hline(2, 109, EAVE - 1, P.r4).hline(2, 109, EAVE, P.r3);
  for (let x = 3; x <= 108; x += 3) g.set(x, EAVE, P.r1);
  // 正脊，两头微微翘起
  g.rect(8, 5, 96, 3, P.r3).hline(8, 103, 4, P.r0).hline(8, 103, 8, P.r4);
  for (const [x, d] of [
    [8, -1],
    [103, 1],
  ]) {
    g.set(x + d, 5, P.r4)
      .set(x + d, 4, P.r3)
      .set(x + d * 2, 3, P.r3)
      .set(x + d * 3, 2, P.r4);
  }
  g.rect(54, 2, 4, 3, P.r3).hline(54, 57, 1, P.r1);
}

function windows(g) {
  for (const x0 of [16, 78]) {
    g.rect(x0, 63, 18, 17, P.t3);
    g.rect(x0 + 1, 64, 16, 15, P.paper1);
    for (let x = x0 + 5; x < x0 + 17; x += 4) g.vline(x, 64, 78, P.t2);
    g.hline(x0 + 1, x0 + 16, 68, P.t2).hline(x0 + 1, x0 + 16, 74, P.t2);
    g.hline(x0 - 1, x0 + 18, 80, P.t2).hline(x0 - 1, x0 + 18, 81, P.l2);
  }
}

function door(g, curtain) {
  g.rect(47, 60, 18, 32, P.t3);
  if (curtain) {
    // 门开着，里头是暗的；上半截挂着蓝印花布门帘
    g.rect(48, 62, 16, 30, P.ink1);
    g.rect(48, 62, 16, 15, P.i2);
    for (let y = 63; y < 76; y++)
      for (let x = 48; x < 64; x++) if ((x * 2 + y * 3) % 7 === 0) g.set(x, y, P.l0);
    g.hline(48, 63, 76, P.i3).hline(48, 63, 62, P.i3);
    g.vline(55, 62, 76, P.i3);
  } else {
    g.rect(48, 62, 16, 30, P.t1);
    for (let x = 51; x < 64; x += 4) g.vline(x, 62, 91, P.t2);
    g.vline(55, 62, 91, P.t4).vline(56, 62, 91, P.t0);
    g.set(53, 77, P.y1).set(58, 77, P.y1);
    g.hline(48, 63, 62, P.t3);
  }
  // 春联和横批
  for (const x of [43, 66]) {
    g.rect(x, 62, 3, 23, P.c1);
    for (let y = 64; y < 84; y += 4) g.set(x + 1, y, P.c3);
  }
  g.rect(50, 56, 12, 3, P.c1);
  for (let x = 52; x < 61; x += 3) g.set(x, 57, P.c3);
  // 门槛石
  g.rect(44, 92, 24, 3, P.s1).hline(44, 67, 92, P.s0).hline(44, 67, 94, P.s3);
}

// 檐下挂的东西：一串辣椒、两棒玉米
function harvest(g, x) {
  g.vline(x + 1, 58, 60, P.t3);
  for (let i = 0; i < 6; i++) {
    g.set(x + (i & 1), 61 + i * 2, P.c1).set(x + 1 - (i & 1), 62 + i * 2, P.c2);
    g.set(x + 2, 61 + i * 2, i % 3 ? P.c1 : P.c0);
  }
}

function strawHat(g, x, y) {
  g.ellipse(x + 3, y + 3, 3.5, 2.5, P.h1);
  g.hline(x, x + 7, y + 4, P.h2)
    .set(x + 3, y + 1, P.h0)
    .set(x + 4, y + 1, P.h0);
  g.hline(x + 1, x + 6, y + 5, P.h3);
}

function hoe(g, x) {
  g.line(x + 5, 88, x + 1, 62, P.t2);
  g.line(x + 6, 88, x + 2, 62, P.t3);
  g.rect(x - 1, 60, 5, 3, P.s3).hline(x - 1, x + 3, 60, P.s1);
}

function chimney(g) {
  g.rect(85, 12, 7, 15, P.l2).vline(91, 12, 26, P.l3).vline(85, 12, 26, P.l0);
  g.rect(84, 10, 9, 3, P.r3).hline(84, 92, 10, P.r1);
  g.rect(86, 13, 5, 2, P.ink1);
}

/**
 * @param {'hero'|'gui'} variant
 * @returns {{grid: Grid, ax: number, ay: number}} 锚点在门槛正中
 */
export function house(variant, seed = 1) {
  const g = new Grid(W, H);
  const r = rng(seed);
  // 墙根落在地上的影子
  g.rect(WALL_L + 2, 92, WALL_R - WALL_L + 4, 3, SHADOW);
  for (let x = WALL_L + 2; x <= WALL_R + 5; x += 2) g.set(x, 95, SHADOW);
  wall(g, r, variant === 'hero');
  windows(g);
  door(g, variant === 'gui');
  if (variant === 'gui') {
    harvest(g, 36);
    harvest(g, 71);
  } else {
    hoe(g, 35);
    strawHat(g, 69, 62);
  }
  roof(g, seed);
  if (variant === 'gui') chimney(g);
  return { grid: g, ax: 56, ay: 96 };
}
