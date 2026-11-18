// 各地的标志物：让每张地图一眼认得出是哪儿。
//   灯笼柱（茶摊、村口挂着红灯笼）、摊棚（集上的蓝白条篷子）、凉亭（后山茶园半山腰）、
//   土地庙（路边的小庙）、板车。水边的船、荷叶、踏石、渔网在 waterside.js。
// 每个函数返回 {grid, ax, ay}；ax、ay 是“脚下那一格的底边中点”在图里的位置。
import { Grid, rng } from './pixel.js';
import { P, SHADOW } from './palette.js';

const made = (grid, ax, ay) => ({ grid, ax, ay });

// 灯笼柱：一根木杆，顶上一道横木，横木一头的钩子上挂灯笼（灯笼另画，世界里让它随风晃）。
export function lanternPost() {
  const g = new Grid(16, 36);
  g.ellipse(9, 34, 5, 1.5, SHADOW);
  g.rect(6, 33, 5, 2, P.s2).hline(6, 10, 33, P.s1);
  g.rect(7, 5, 2, 29, P.t3).vline(7, 5, 33, P.t2);
  g.hline(2, 14, 5, P.t2).hline(2, 14, 6, P.t4).set(14, 7, P.t4).set(2, 7, P.t4);
  return made(g, 8, 36);
}

/** 挂在灯笼柱上的红灯笼：上头一根绳，世界把它挂在钩子上、绕绳头轻轻摆。 */
export function lanternGlobe() {
  const g = new Grid(9, 15);
  g.vline(4, 0, 2, P.ink2);
  g.hline(2, 6, 3, P.y2);
  g.ellipse(4, 8, 4, 4.5, P.c1).ellipse(3, 7, 2, 3, P.c0).set(2, 6, P.p1);
  g.vline(1, 6, 10, P.c2).vline(7, 6, 10, P.c2).vline(4, 4, 12, P.c2);
  g.hline(2, 6, 12, P.y2);
  g.vline(4, 13, 14, P.c3).set(3, 14, P.c2).set(5, 14, P.c2);
  return g;
}

// 摊棚：两根竹竿撑一片蓝白条的布篷，案板上一筐筐菜蛋果子。跨三格，锚点在中间那格。
export function stall(seed) {
  const g = new Grid(48, 40);
  const r = rng(seed);
  g.ellipse(25, 38, 21, 2, SHADOW);
  for (const x of [5, 41]) g.rect(x, 10, 2, 28, P.b3).vline(x, 10, 37, P.b2);
  g.rect(3, 26, 42, 4, P.t1).hline(3, 44, 26, P.t0).hline(3, 44, 29, P.t3);
  g.rect(4, 30, 40, 7, P.t2).hline(4, 43, 36, P.t4).vline(4, 30, 36, P.t3).vline(43, 30, 36, P.t4);
  for (let x = 8; x < 42; x += 8) g.vline(x, 31, 35, P.t3);
  const goods = [
    [P.g4, P.g5],
    [P.y1, P.y2],
    [P.c0, P.c1],
    [P.l0, P.l2],
  ];
  goods.forEach(([a, b], i) => {
    const x = 9 + i * 10;
    g.ellipse(x, 24, 4, 2.2, P.h2).hline(x - 4, x + 4, 25, P.h3);
    for (let k = 0; k < 9; k++) {
      const dx = Math.floor(r() * 7) - 3;
      const dy = Math.floor(r() * 3);
      g.set(x + dx, 21 + dy, k % 3 ? a : b);
    }
  });
  for (let y = 5; y <= 12; y++) {
    const inset = Math.max(0, 7 - y);
    for (let x = 1 + inset; x <= 46 - inset; x++)
      g.set(x, y, Math.floor((x + 3) / 6) % 2 ? P.i1 : P.l0);
  }
  for (let x = 1; x <= 46; x++)
    if ((x + 3) % 6 !== 0) g.set(x, 13, Math.floor((x + 3) / 6) % 2 ? P.i2 : P.l2);
  g.hline(7, 40, 4, P.i3).hline(3, 44, 12, P.i2);
  return made(g, 24, 40);
}

// 凉亭：石台基，四根朱漆柱，一圈矮栏，青瓦顶的四角往上翘，顶上一颗宝顶。跨四格。
export function pavilion() {
  const g = new Grid(64, 70);
  g.ellipse(33, 67, 29, 3, SHADOW);
  g.rect(5, 57, 54, 8, P.s2).hline(5, 58, 57, P.s0).hline(5, 58, 64, P.s4).vline(58, 57, 64, P.s4);
  for (let x = 11; x < 58; x += 9) g.vline(x, 58, 63, P.s3);
  g.rect(25, 65, 14, 3, P.s1).hline(25, 38, 67, P.s3);
  for (const x of [10, 23, 38, 51])
    g.rect(x, 25, 3, 32, P.c2)
      .vline(x, 25, 56, P.c1)
      .vline(x + 2, 25, 56, P.c3);
  g.hline(12, 51, 46, P.t2).hline(12, 51, 47, P.t4);
  for (let x = 15; x < 51; x += 4) if (x < 23 || x > 26) g.vline(x, 48, 56, P.t3);
  g.rect(7, 21, 50, 4, P.t2).hline(7, 56, 21, P.t1).hline(7, 56, 24, P.t4);
  for (let x = 12; x < 52; x += 7) g.set(x, 22, P.y2);
  for (let y = 5; y <= 20; y++) {
    const half = 7 + ((y - 5) / 15) * 25;
    for (let x = Math.round(32 - half); x <= Math.round(31 + half); x++)
      g.set(x, y, y % 3 === 0 ? P.r4 : x % 4 === 0 ? P.r3 : P.r2);
  }
  g.hline(3, 60, 20, P.r3).hline(4, 59, 21, P.r4);
  g.line(3, 20, 0, 16, P.r3).line(4, 21, 1, 17, P.r4);
  g.line(60, 20, 63, 16, P.r3).line(59, 21, 62, 17, P.r4);
  g.hline(25, 38, 5, P.r4).hline(26, 37, 4, P.r1);
  g.rect(31, 0, 2, 4, P.y2).set(31, 0, P.y1);
  return made(g, 32, 70);
}

// 土地庙：石台上一间小小的庙，青瓦顶，红对联，龛里一点香火，前面一只香炉插着香。
export function shrine() {
  const g = new Grid(26, 32);
  g.ellipse(14, 30, 11, 2, SHADOW);
  g.rect(3, 23, 20, 6, P.s2).hline(3, 22, 23, P.s0).hline(3, 22, 28, P.s4);
  g.rect(5, 12, 16, 11, P.l1).vline(5, 12, 22, P.l0).vline(20, 12, 22, P.l3);
  g.rect(10, 14, 6, 8, P.ink1).rect(11, 15, 4, 7, P.t4).set(12, 17, P.y1).set(13, 17, P.y2);
  g.vline(7, 14, 21, P.c1).vline(18, 14, 21, P.c1);
  for (let y = 4; y <= 11; y++) {
    const half = 3 + (y - 4) * 1.5;
    for (let x = Math.round(13 - half); x <= Math.round(12 + half); x++)
      g.set(x, y, y % 2 ? P.r2 : P.r3);
  }
  g.hline(1, 24, 11, P.r4).set(0, 10, P.r3).set(25, 10, P.r3).hline(10, 15, 3, P.r4);
  g.rect(10, 25, 6, 3, P.s4).hline(9, 16, 25, P.s3);
  g.vline(12, 22, 24, P.e3).vline(14, 23, 24, P.e3).set(12, 21, P.c0).set(14, 22, P.c0);
  return made(g, 13, 32);
}

// 板车：两只木轮，车板上码着几袋粮，车把斜斜搁在地上。
export function cart() {
  const g = new Grid(36, 24);
  g.ellipse(19, 22, 15, 2, SHADOW);
  g.line(0, 19, 8, 13, P.t3).line(0, 20, 8, 14, P.t4);
  g.rect(7, 11, 25, 3, P.t1).hline(7, 31, 11, P.t0).hline(7, 31, 13, P.t3);
  for (const [x, y] of [
    [11, 5],
    [18, 4],
    [25, 5],
    [14, 8],
    [21, 8],
    [28, 8],
  ]) {
    g.ellipse(x, y + 1, 4, 3, P.h1)
      .hline(x - 3, x + 3, y + 3, P.h3)
      .set(x - 1, y - 1, P.h0);
    g.set(x, y - 1, P.h3);
  }
  for (const x of [13, 27]) {
    g.ellipse(x, 18, 5, 5, P.t4).ellipse(x, 18, 4, 4, P.t2).ellipse(x, 18, 1.5, 1.5, P.t4);
    g.line(x - 3, 18, x + 3, 18, P.t3).line(x, 15, x, 21, P.t3);
  }
  return made(g, 8, 24);
}
