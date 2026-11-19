// 村里随处可见的零碎：木桶、柴垛、粮袋、晒东西的簸箕、蕨丛、小凳、长凳、乱石、木箱。
// 照「场景与物件参考」里的地图，人家门口、摊子旁边、路边都堆着这些，地图才显得有人在过日子。
// 每个函数返回 {grid, ax, ay}；ax、ay 是“脚下那一格的底边中点”在图里的位置。描边由 index.js 统一加。
import { Grid, rng } from './pixel.js';
import { P, SHADOW } from './palette.js';

const made = (grid, ax, ay) => ({ grid, ax, ay });

// 一只木桶：桶身一道道竖板，上下两道铁箍，桶口一圈亮边
function barrel(g, x, y, w, h, lid) {
  g.ellipse(x + w / 2, y + h, w / 2 + 1, 1.5, SHADOW);
  g.rect(x, y + 2, w, h - 2, P.t2);
  for (let i = x + 2; i < x + w - 1; i += 3) g.vline(i, y + 3, y + h - 1, P.t3);
  g.vline(x, y + 2, y + h - 1, P.t3).vline(x + w - 1, y + 2, y + h - 1, P.t4);
  g.hline(x, x + w - 1, y + 4, P.s4).hline(x, x + w - 1, y + h - 3, P.s4);
  g.ellipse(x + w / 2 - 0.5, y + 2, w / 2, 2, lid ? P.t1 : P.t4);
  if (lid) g.hline(x + 2, x + w - 3, y + 1, P.t0);
  else g.ellipse(x + w / 2 - 0.5, y + 2.5, w / 2 - 2, 1, P.w4);
}

/** 两只木桶，一只盖着盖，一只盛着水。 */
export function barrels(seed) {
  const r = rng(seed);
  const g = new Grid(24, 22);
  barrel(g, 1, 6, 10, 15, r() < 0.5);
  barrel(g, 12, 3, 11, 17, true);
  return made(g, 12, 22);
}

/** 柴垛：劈好的柴横着码成一垛，截面露着年轮，顶上压一块木板。 */
export function firewood(seed) {
  const r = rng(seed);
  const g = new Grid(30, 20);
  g.ellipse(15, 18, 14, 2, SHADOW);
  for (let row = 0; row < 3; row++) {
    const y = 15 - row * 4;
    const n = 6 - row;
    const x0 = 2 + row * 2 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 4;
      g.ellipse(x + 1.5, y, 2, 2, P.t3)
        .ellipse(x + 1.5, y, 1.2, 1.2, P.t0)
        .set(x + 1, y, P.h1);
    }
  }
  g.rect(5, 3, 19, 2, P.t2).hline(5, 23, 3, P.t1);
  return made(g, 15, 20);
}

/** 粮袋：三四只鼓鼓的麻袋靠在一起，袋口扎着绳。 */
export function sacks(seed) {
  const r = rng(seed);
  const g = new Grid(26, 20);
  g.ellipse(13, 18, 12, 2, SHADOW);
  const bags = [
    [7, 11, 6],
    [17, 11, 6],
    [12, 6, 5.5],
  ].slice(0, 2 + Math.floor(r() * 2));
  for (const [x, y, w] of bags) {
    g.ellipse(x, y + 1, w, 5.5, P.h3).ellipse(x - 0.5, y, w - 1, 5, P.u0);
    g.ellipse(x - 2, y - 2, 2, 1.5, P.h1).hline(x - 2, x + 2, y - 5, P.u1);
    g.rect(x - 1, y - 7, 3, 2, P.u0).set(x, y - 7, P.c2);
  }
  return made(g, 13, 20);
}

/** 晒东西的簸箕：两三只圆竹匾，晒着稻谷、红辣椒、豆子。 */
export function trays(seed) {
  const r = rng(seed);
  const g = new Grid(34, 16);
  const goods = [
    [P.y1, P.y2],
    [P.c1, P.c2],
    [P.g4, P.g5],
    [P.t1, P.t2],
  ];
  const spots = [
    [8, 9, 7],
    [24, 10, 7],
    [16, 5, 6],
  ].slice(0, 2 + Math.floor(r() * 2));
  for (const [x, y, w] of spots) {
    const [a, b] = goods[Math.floor(r() * goods.length)];
    g.ellipse(x, y + 1, w + 1, 3, SHADOW);
    g.ellipse(x, y, w, 2.8, P.h3).ellipse(x, y, w - 1, 2.2, P.h1);
    for (let k = 0; k < 16; k++) {
      const dx = Math.round((r() - 0.5) * (w - 2) * 2);
      const dy = Math.round((r() - 0.5) * 2.4);
      g.set(x + dx, y + dy, k % 3 ? a : b);
    }
  }
  return made(g, 16, 14);
}

/** 一丛蕨：几片羽状叶向四面伸开。 */
export function fern(seed) {
  const r = rng(seed);
  const g = new Grid(20, 14);
  g.ellipse(10, 12, 7, 1.5, SHADOW);
  const fronds = [
    [-8, -3],
    [-6, -7],
    [-1, -10],
    [4, -8],
    [8, -4],
    [2, -5],
  ];
  for (const [dx, dy] of fronds) {
    const ex = 10 + dx + Math.round((r() - 0.5) * 2);
    const ey = 12 + dy;
    g.line(10, 12, ex, ey, P.v3);
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    for (let k = 1; k < steps; k += 2) {
      const x = Math.round(10 + (dx * k) / steps);
      const y = Math.round(12 + (dy * k) / steps);
      g.set(x - 1, y, P.v2).set(x + 1, y - 1, P.v1);
    }
    g.set(ex, ey, P.v0);
  }
  return made(g, 10, 14);
}

/** 一只小板凳。 */
export function stool() {
  const g = new Grid(14, 12);
  g.ellipse(7, 11, 6, 1.2, SHADOW);
  g.rect(2, 3, 2, 8, P.t3).rect(10, 3, 2, 8, P.t3);
  g.rect(0, 1, 14, 3, P.t1).hline(0, 13, 1, P.t0).hline(0, 13, 3, P.t3);
  return made(g, 7, 12);
}

/** 长条凳：两格长，供人坐着歇脚、喝茶。 */
export function bench() {
  const g = new Grid(32, 13);
  g.ellipse(16, 12, 15, 1.5, SHADOW);
  for (const x of [3, 27]) g.rect(x, 4, 2, 8, P.t3).set(x + 1, 11, P.t4);
  g.rect(0, 2, 32, 3, P.t1).hline(0, 31, 2, P.t0).hline(0, 31, 4, P.t3);
  g.hline(5, 26, 8, P.t2);
  return made(g, 8, 13);
}

/** 乱石：大小三块挤在一起，背阴面长着青苔。 */
export function rockPile(seed) {
  const r = rng(seed);
  const g = new Grid(26, 16);
  g.ellipse(13, 14, 12, 2, SHADOW);
  const stones = [
    [8, 10, 6, 4],
    [17, 11, 5, 3.5],
    [12, 6, 4.5, 3.5],
  ];
  for (const [x, y, w, h] of stones) {
    g.ellipse(x, y, w, h, P.s3).ellipse(x - 1, y - 1, w - 1.5, h - 1.2, P.s1);
    g.set(x - 2, y - 2, P.s0).hline(x - 1, x + 2, y + h - 1, P.s4);
    if (r() < 0.7) g.set(x + w - 2, y + 1, P.m4).set(x + w - 3, y + 2, P.m5);
  }
  return made(g, 13, 16);
}

/** 木箱：两只叠着，一只开着口露出里面的菜。 */
export function crates(seed) {
  const r = rng(seed);
  const g = new Grid(24, 22);
  g.ellipse(12, 20, 11, 1.5, SHADOW);
  const box = (x, y, w, h) => {
    g.rect(x, y, w, h, P.t1)
      .rect(x, y, w, 1, P.t0)
      .vline(x, y, y + h - 1, P.t2);
    g.vline(x + w - 1, y, y + h - 1, P.t3).hline(x, x + w - 1, y + h - 1, P.t3);
    g.line(x + 1, y + 1, x + w - 2, y + h - 2, P.t2);
  };
  box(1, 9, 13, 11);
  box(12, 12, 11, 8);
  box(3, 2, 10, 7);
  const veg = r() < 0.5 ? [P.g4, P.g5] : [P.c1, P.y1];
  for (let x = 13; x < 22; x += 2) g.set(x, 11, veg[(x >> 1) % 2]).set(x + 1, 12, veg[0]);
  return made(g, 12, 22);
}

// 参考菜畦图里的竹棚：前后两排杆错开，藤只攀半架，让横梁和里面的空隙透出来。
export function trellis(seed) {
  const g = new Grid(40, 34);
  const r = rng(seed);
  for (const x of [6, 31]) {
    g.line(x + 2, 3, x + 2, 24, P.t3).line(x + 3, 3, x + 3, 23, P.b2);
    g.line(x, 10, x - 2, 32, P.t3).line(x + 1, 10, x - 1, 31, P.h2);
  }
  for (const y of [4, 7, 11]) g.hline(3, 36, y, P.t3).hline(4, 36, y - 1, P.b2);
  for (const x of [5, 12, 19, 26, 33]) g.line(x, 12, x + 4, 2, P.h2);
  for (let i = 0; i < 29; i++) {
    const x = 7 + Math.floor(r() * 27),
      y = 3 + Math.floor(r() * 7) + (x > 22 ? Math.floor(r() * 9) : 0);
    g.line(x - 2, y - 2, x + 1, y + 2, P.v3)
      .ellipse(x, y, 3, 2, P.v2)
      .hline(x - 2, x, y - 1, P.v0);
  }
  g.line(28, 10, 27, 24, P.b4).line(27, 23, 24, 26, P.b4);
  for (const [x, y] of [
    [9, 8],
    [19, 7],
    [26, 14],
  ]) {
    g.set(x, y - 1, P.y0)
      .hline(x - 1, x + 1, y, P.y1)
      .set(x, y + 1, P.y2);
  }
  return made(g, 27, 33);
}
