// 画物品小图标用的家什：一张共用的“字符 → 颜色”表，和两种画法（字符画、圆滚滚的东西）。
// 图标都是 16×16，四周留一圈给描边。
import { Grid, fromText } from './pixel.js';
import { P } from './palette.js';

// prettier-ignore
export const INK = {
  // 绿：从浅到深
  L: P.g1, l: P.g2, G: P.g3, M: P.g4, g: P.g5, D: P.g6, V: P.g7,
  // 白和灰
  w: P.l0, W: P.l1, x: P.l2, X: P.l3,
  s: P.s1, a: P.s2, A: P.s3, S: P.s4,
  k: P.ink1, K: P.ink3,
  // 红和粉
  o: P.c0, r: P.c1, R: P.c2, Q: P.c3,
  q: P.p1, p: P.p2, O: P.p3,
  // 黄和稻草
  z: P.y0, y: P.y1, Y: P.y2,
  i: P.h0, h: P.h1, j: P.h2, H: P.h3,
  // 土和木
  f: P.e1, e: P.e2, F: P.e3, E: P.e4,
  n: P.t0, t: P.t1, u: P.t2, T: P.t3, U: P.t4,
  v: P.u0, m: P.u1, N: P.u2,
  // 蓝
  c: P.i0, b: P.i1, C: P.i2, B: P.i3,
  // 竹
  1: P.b0, 2: P.b1, 3: P.b2, 4: P.b3,
  // 皮肉
  5: P.k0, 6: P.k1, 7: P.k2,
  // 湿土
  8: P.m0, 9: P.m2,
};

/** 字符画 → 16×16 的小图。swap 可以临时换掉几个字符的颜色（同一个形状，换一身颜色）。 */
export function sketch(rows, swap = null) {
  return new Grid(16, 16).blit(fromText(rows, swap ? { ...INK, ...swap } : INK), 0, 0);
}

/** 一个圆滚滚的东西：中间色打底，右下暗一圈，左上一点高光。shades = [亮, 中, 暗]。 */
export function ball(g, cx, cy, rx, ry, [light, mid, dark]) {
  const mine = new Set();
  g.ellipse(cx, cy, rx, ry, mid, (x, y) => (mine.add(y * 16 + x), true));
  for (const at of mine) {
    const x = at % 16;
    const y = (at - x) / 16;
    if ((x - cx) / rx + (y - cy) / ry > 0.7) g.set(x, y, dark);
  }
  const lit = (x, y) => mine.has(y * 16 + x);
  g.ellipse(cx - rx * 0.4, cy - ry * 0.45, Math.max(0.5, rx * 0.3), 0.5, light, lit);
  return g;
}

/** 在一张图上点几个点：dots 是 [[x, y], …]。 */
export function dot(g, color, dots) {
  for (const [x, y] of dots) g.set(x, y, color);
  return g;
}
