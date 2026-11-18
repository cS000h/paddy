// 院里的三样活：撒谷喂鸡、草窝拾蛋、坐凳编篮。画法照搬 Astra 的「稻_院中日常」，
// 一帧 88×60，人朝右，脚下锚点见 YARD_ACTS；母鸡、鸡蛋、草窝、竹篮、小凳也单独拿得出来。
import { Grid } from './pixel.js';
import { P, SHADOW } from './palette.js';
import { worker, pose, hand, finish } from './worker.js';

const R = Math.round;

/** 母鸡（朝左）。peck 0–1 是低头啄食的程度，step 1 是抬脚。 */
export function hen(peck = 0, step = 0) {
  const g = new Grid(23, 19);
  const down = R(peck * 6);
  const forward = R(peck * 3);
  const bob = step === 1 ? 1 : 0;
  g.ellipse(11, 17, 8, 1, SHADOW);
  for (const [x, dx] of [
    [9, -bob],
    [13, bob],
  ])
    g.line(x, 13, x + dx, 16, P.h3).hline(x + dx - 2, x + dx + 1, 16, P.e4);
  // 尾羽的三层弧线和颈上的暖羽，十几个像素里也分得清朝向
  g.poly(
    [
      [13, 9 + bob],
      [16, 7],
      [18, 3],
      [20, 2],
      [19, 7],
      [22, 5],
      [20, 10],
      [16, 13],
    ],
    P.u2,
  );
  g.line(16, 9, 20, 4, P.e3).line(16, 11, 20, 8, P.t1);
  g.ellipse(11, 10 + bob, 6.4, 4.3, P.e4).ellipse(10, 9 + bob, 5.7, 4, P.l2);
  g.ellipse(12, 9 + bob, 3.9, 2.5, P.h1)
    .hline(11, 14, 10 + bob, P.e3)
    .set(14, 9 + bob, P.h0);
  const hx = 6 - forward;
  const hy = 5 + down + bob;
  g.line(8, 10 + bob, hx, hy + 1, P.h1).ellipse(hx, hy, 3.2, 2.8, P.h1);
  g.hline(hx - 2, hx, hy - 1, P.h0)
    .rect(hx - 1, hy - 4, 3, 2, P.c2)
    .set(hx - 1, hy - 5, P.c1)
    .set(hx + 1, hy - 5, P.c1)
    .set(hx - 1, hy, P.ink1)
    .hline(hx - 4, hx - 3, hy + 1, P.y2)
    .set(hx - 2, hy + 3, P.c1);
  return g;
}

export function egg() {
  const g = new Grid(5, 7);
  g.ellipse(2, 3.6, 2, 2.7, P.t1).ellipse(2, 3, 1.5, 2.1, P.l1).set(1, 2, P.l0).set(2, 0, P.l2);
  return g;
}

export function nest(full = true) {
  const g = new Grid(27, 15);
  g.ellipse(13, 12, 12, 2, SHADOW)
    .ellipse(13, 9, 12, 4, P.t2)
    .ellipse(13, 8, 11, 3.5, P.h2)
    .ellipse(13, 8, 8, 2.5, P.t3);
  if (full) g.blit(egg(), 11, 2);
  for (const [x, y, dx] of [
    [1, 8, 6],
    [3, 10, 7],
    [8, 11, 6],
    [13, 12, 6],
    [18, 10, 6],
    [19, 8, 6],
    [4, 6, 5],
  ])
    g.line(x, y, x + dx, y - 2, P.h1).set(x + dx, y - 2, P.h0);
  return g;
}

/** 竹篮：stage 0 起底，1 编了一半，2 收了边，3 装上提梁。 */
export function basketStage(stage = 3) {
  const g = new Grid(22, 23);
  g.ellipse(11, 20, 9, 1.5, SHADOW);
  if (stage === 0) {
    g.ellipse(11, 17, 7, 2.5, P.h2);
    for (const [x, y] of [
      [1, 11],
      [4, 8],
      [11, 7],
      [17, 8],
      [21, 12],
    ])
      g.line(11, 18, x, y, P.b3);
    g.hline(5, 16, 17, P.h0);
    return g;
  }
  const h = stage === 1 ? 4 : 8;
  const rim = 19 - h;
  for (let j = 0; j < h; j++) {
    const half = 6 + R((3 * (h - j)) / h);
    g.hline(11 - half, 11 + half, rim + j, j % 2 ? P.h2 : P.h1);
    for (let x = 12 - half + (j % 2) * 2; x < 11 + half; x += 4) g.hline(x, x + 1, rim + j, P.t1);
  }
  g.hline(5, 17, 19, P.h3).ellipse(11, rim, 9, 2.6, P.h3).ellipse(11, rim, 7, 1.3, P.t3);
  g.hline(6, 15, rim + 2, P.h0);
  if (stage === 1) for (const x of [4, 8, 14, 18]) g.vline(x, rim - 4, rim - 1, P.b3);
  if (stage === 3) {
    const arch = [
      [3, 11],
      [4, 6],
      [7, 3],
      [11, 2],
      [15, 3],
      [18, 6],
      [19, 11],
    ];
    for (let i = 1; i < arch.length; i++) g.line(...arch[i - 1], ...arch[i], P.t2);
    g.line(5, 5, 8, 3, P.h1).hline(9, 13, 2, P.h0);
  }
  return g;
}

export function stool() {
  const g = new Grid(21, 16);
  g.ellipse(11, 14, 9, 1.4, SHADOW);
  for (const x of [3, 14]) g.rect(x, 5, 3, 9, P.t2).vline(x, 6, 13, P.h2);
  g.hline(6, 13, 11, P.b3).rect(1, 3, 18, 3, P.t2).rect(2, 2, 16, 2, P.h1).hline(3, 16, 2, P.h0);
  return g;
}

const GRAINS = [
  [51, 47],
  [55, 49],
  [60, 50],
  [57, 48],
  [53, 50],
  [62, 46],
  [50, 51],
  [59, 52],
];

function feed(g, f, look) {
  const [lean, hx, hy] = pose(
    [
      [0, 0, 30, 39],
      [4, -2, 26, 39],
      [8, 3, 43, 27],
      [11, 2, 41, 33],
      [16, 0, 31, 38],
      [23, 0, 29, 40],
    ],
    f,
  );
  const x = 64 - Math.min(10, Math.max(0, f - 5));
  const peck = f >= 14 ? (1 - Math.cos(((f - 14) * Math.PI) / 3)) / 2 : 0;
  g.blit(hen(peck, f >= 5 && f < 17 ? f % 2 : 0), x, 32);
  worker(g, { x: 27, feet: 49, lean, at: [hx, hy], look });
  // 左手托着一簸箕谷
  g.ellipse(24, 38, 4, 1.7, P.t3).ellipse(24, 37, 4, 1.4, P.h1).hline(21, 26, 38, P.h2);
  finish(g);
  GRAINS.forEach(([tx, ty], i) => {
    const t = (f - 6 - (i % 3)) / 7;
    if (t < 0 || f >= 18 + (i % 5)) return;
    const u = Math.min(t, 1);
    const gx = R(40 + (tx - 40) * u);
    const gy = R(29 + (ty - 29) * u - 36 * u * (1 - u));
    g.set(gx, gy, P.h3).set(gx + 1, gy - 1, P.y1);
  });
}

function eggs(g, f, look) {
  const [bend, lean, hx, hy] = pose(
    [
      [0, 0, 0, 34, 37],
      [5, 3, 4, 43, 43],
      [10, 5, 7, 48, 46],
      [12, 5, 7, 48, 46],
      [17, 2, 4, 45, 38],
      [21, 0, 1, 42, 35],
      [23, 0, 0, 41, 36],
    ],
    f,
  );
  g.blit(nest(f < 12), 36, 41);
  g.blit(hen(f > 15 ? 0.2 : 0), 64, 32);
  worker(g, { x: 32, feet: 50, bend, lean, at: [hx, hy], look });
  if (f >= 12) g.blit(egg(), hx - 1, hy - 4);
  finish(g);
}

function weave(g, f, look) {
  const [hx, hy] = pose(
    [
      [0, 39, 39],
      [4, 51, 41],
      [8, 39, 41],
      [12, 52, 38],
      [16, 40, 37],
      [20, 50, 34],
      [24, 40, 36],
      [28, 45, 29],
      [31, 43, 31],
    ],
    f,
  );
  const lifted = Math.max(0, Math.min(4, f - 26));
  const stage = f < 7 ? 0 : f < 15 ? 1 : f < 25 ? 2 : 3;
  g.blit(stool(), 19, 36);
  worker(g, {
    x: 29,
    feet: 50,
    lean: hx > 45 ? 4 : 1,
    at: [hx, hy],
    sitting: true,
    far: [39, 40 - lifted],
    look,
  });
  g.blit(basketStage(stage), 35, 33 - lifted);
  for (let i = 0; i < 3; i++) g.line(59 + i * 2, 51, 70 + i * 3, 47 - i, P.b3);
  finish(g);
  if (stage < 3) {
    const tipY = hy - 5 - (f % 4);
    g.line(42, 46 - Math.min(7, R(f / 3)), hx, hy, P.b3).line(hx, hy, hx + 8, tipY, P.b2);
  }
  hand(g, hx, hy);
}

/** 院里三样活的帧：尺寸、帧数、每秒几帧、脚下锚点、画法。 */
export const YARD_ACTS = {
  feed: { w: 88, h: 60, frames: 24, fps: 8, ax: 27, ay: 50, draw: feed },
  eggs: { w: 88, h: 60, frames: 24, fps: 8, ax: 32, ay: 51, draw: eggs },
  weave: { w: 88, h: 60, frames: 32, fps: 8, ax: 29, ay: 51, draw: weave },
};
