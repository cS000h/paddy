import { Grid, rng } from './pixel.js';
import { P, SHADOW } from './palette.js';

// 船身略斜，留出前舱和船尾的坐板；船篷开口朝左，暗处露出两级竹圈。
export function boat({ stowedOar = true } = {}) {
  const g = new Grid(58, 35);
  g.ellipse(30, 28, 23, 3, P.w4).hline(11, 20, 31, P.w2).hline(40, 49, 27, P.w2);
  const hull = [
    [1, 19],
    [9, 20],
    [40, 15],
    [56, 10],
    [54, 18],
    [48, 23],
    [18, 30],
    [9, 29],
    [4, 26],
  ];
  g.poly(hull, P.t4);
  g.poly(
    [
      [2, 19],
      [11, 18],
      [43, 13],
      [55, 10],
      [50, 19],
      [14, 26],
      [6, 24],
    ],
    P.t1,
  );
  g.poly(
    [
      [5, 20],
      [44, 14],
      [51, 13],
      [46, 17],
      [13, 24],
    ],
    P.t3,
  );
  for (const x of [10, 16, 43, 48]) {
    const y = 21 - Math.floor(x / 6);
    g.line(x, y, x + 3, y + 2, P.t0).line(x, y + 1, x + 3, y + 3, P.t2);
  }
  g.line(8, 26, 15, 28, P.t2).line(16, 28, 46, 21, P.t2).line(46, 21, 53, 17, P.t1);
  const arch = [8, 5, 3, 2, 1, 1, 1, 2, 3, 5, 8, 11];
  // 一排排篾片跨在竹圈上，右下沿比迎光的一面深两档。
  for (let step = 19; step >= 0; step--) {
    const x = 19 + step;
    const y = 7 - Math.floor(step / 5);
    for (let i = 0; i < arch.length; i++) {
      const rib = step % 7 === 0 || step === 19;
      const face = i < 6 ? P.h1 : i < 9 ? P.h2 : P.t2;
      g.set(x + i, y + arch[i], rib ? P.t2 : face).set(x + i, y + arch[i] + 1, rib ? P.t1 : face);
    }
  }
  g.poly(
    [
      [18, 21],
      [18, 15],
      [20, 10],
      [23, 8],
      [26, 8],
      [29, 11],
      [31, 19],
    ],
    P.t4,
  );
  const rim = [
    [18, 21],
    [18, 15],
    [20, 10],
    [23, 8],
    [26, 8],
    [29, 11],
    [31, 19],
  ];
  for (let i = 1; i < rim.length; i++) g.line(...rim[i - 1], ...rim[i], P.h2);
  g.line(20, 19, 28, 17, P.t2).line(33, 18, 49, 15, P.h3);
  if (stowedOar)
    g.line(4, 13, 17, 26, P.t3).line(1, 10, 5, 14, P.t1).line(1, 11, 4, 14, P.t2);
  g.rect(50, 15, 2, 2, P.c2).set(52, 17, P.c1);
  return { grid: g, ax: 29, ay: 35 };
}

// 两桩高低不同。网眼跟着上下两根绳一起垂下来，网后仍能看见草地。
export function netRack() {
  const g = new Grid(34, 30);
  g.ellipse(18, 27, 15, 1, SHADOW);
  for (const [x, top, foot] of [
    [3, 2, 28],
    [29, 5, 25],
  ]) {
    g.line(x, top, x + 1, foot, P.t3).line(x + 1, top, x + 2, foot, P.t2);
    g.hline(x - 1, x + 2, top, P.t0).hline(x, x + 2, top + 3, P.h2);
  }
  for (let i = 0; i <= 25; i++) {
    const x = 4 + i;
    const sag = Math.sin((Math.PI * i) / 25);
    const top = 5 + Math.round(i / 11 + 3 * sag);
    const length = 10 + Math.round(4 * sag);
    for (let j = 0; j <= length; j++) {
      const mesh = (i + j) % 6 === 0 || (i - j + 30) % 6 === 0;
      if (mesh) g.set(x, top + j, i < 14 ? P.e3 : P.ink3);
    }
    g.set(x, top, P.e4).set(x, top + length, P.e4);
    if (i % 7 === 3) g.set(x, top + length + 1, P.c2).set(x + 1, top + length, P.t1);
  }
  g.ellipse(5, 26, 4, 2, P.t3).ellipse(5, 25, 4, 1.6, P.h2).hline(4, 6, 25, P.t3);
  return { grid: g, ax: 8, ay: 30 };
}

export function lotus(seed) {
  const g = new Grid(18, 13);
  const r = rng(seed);
  // 叶沿的缺口和旁边的亮水线，在一格大小上也能认出浮叶。
  for (const [cx, cy, size] of [
    [12, 6, 4],
    [5, 9, 5],
  ]) {
    g.ellipse(cx, cy + 1, size, 2.5, P.w4);
    g.ellipse(cx, cy, size, 2.5, P.g6).ellipse(cx - 1, cy - 1, size - 1, 1.4, P.g4);
    g.line(cx, cy, cx + size - 1, cy + 1, P.w3).set(cx - 1, cy - 1, P.g2);
  }
  if (r() < 0.75) {
    g.vline(11, 3, 7, P.g6).hline(9, 13, 3, P.p3).hline(9, 13, 2, P.p2);
    g.set(8, 1, P.p1)
      .set(10, 1, P.p1)
      .set(11, 0, P.p0)
      .set(12, 1, P.p1)
      .set(14, 1, P.p2)
      .set(11, 2, P.y1);
  }
  return { grid: g, ax: 9, ay: 13 };
}

export function stones(seed) {
  const g = new Grid(16, 10);
  const lift = rng(seed)() < 0.5 ? 1 : 0;
  for (const [x, y, w] of [
    [6, 1, 5],
    [1, 4 + lift, 6],
    [10, 6, 5],
  ]) {
    g.hline(x, x + w - 1, y + 2, P.s4).hline(x + 1, x + w - 2, y + 3, P.w3);
    g.hline(x + 1, x + w - 2, y, P.s1)
      .hline(x, x + w - 1, y + 1, P.s2)
      .set(x + 1, y, P.s0)
      .set(x + w - 1, y + 1, P.ink3)
      .set(x - 1, y + 2, P.w1)
      .set(x + w, y + 2, P.w1);
  }
  return { grid: g, ax: 8, ay: 10 };
}
