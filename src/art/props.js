// 院里和田边的物件：篱笆、院门、水缸、水井、收菜筐、石桌、草垛、晾衣架、坛子、稻草人、路牌、石头、花、芦苇。
// 每个函数返回 {grid, ax, ay}；ax、ay 是“脚下那一格的底边中点”在图里的位置。
import { Grid, rng, hash2, fromText } from './pixel.js';
import { P, SHADOW } from './palette.js';
import { coats } from './garments.js';

const made = (grid, ax, ay) => ({ grid, ax, ay });

// 横着的一段竹篱笆：高低不齐的竹片，两道横篾。
export function fenceH(seed) {
  const g = new Grid(16, 20);
  for (let x = 0; x < 16; x++) {
    if (x % 3 === 2) continue;
    const top = 3 + Math.floor(hash2(Math.floor(x / 3), seed, 5) * 3);
    g.vline(x, top, 18, x % 3 === 0 ? P.b1 : P.b2).set(x, top, P.b0);
  }
  g.hline(0, 15, 8, P.b3).hline(0, 15, 15, P.b3).hline(0, 15, 19, SHADOW);
  for (let x = 2; x < 16; x += 3) g.set(x, 8, P.b4).set(x, 15, P.b4);
  return made(g, 8, 23);
}

// 竖着的一段：从侧面看是一道窄窄的竹片边。
export function fenceV(seed) {
  const g = new Grid(16, 26);
  for (let y = 1; y < 26; y++) {
    const gap = y % 3 === 0;
    g.set(6, y, gap ? P.b3 : P.b0)
      .set(7, y, gap ? P.b3 : P.b1)
      .set(8, y, gap ? P.b4 : P.b2);
    g.set(9, y, P.b4).set(10, y, SHADOW).set(11, y, SHADOW);
  }
  if (hash2(seed, 3, 6) < 0.5) g.set(6, 0, P.b0).set(7, 0, P.b1);
  return made(g, 8, 26);
}

export function gatePost() {
  const g = new Grid(16, 34);
  g.rect(6, 4, 4, 30, P.t2).vline(6, 4, 33, P.t1).vline(9, 4, 33, P.t3).vline(10, 8, 33, SHADOW);
  g.rect(5, 2, 6, 3, P.t3).hline(5, 10, 2, P.t1);
  return made(g, 8, 37);
}

// 院门上头的小门楼：一根横梁，上面一小片瓦顶。跨四格，锚点在左边门柱。
export function gateArch() {
  const g = new Grid(64, 16);
  g.rect(6, 11, 52, 3, P.t2).hline(6, 57, 11, P.t1).hline(6, 57, 13, P.t4);
  for (let y = 3; y <= 10; y++) {
    const inset = 10 - y;
    for (let x = 2 + inset; x <= 61 - inset; x++) {
      const row = y % 3;
      g.set(x, y, row === 2 ? P.r4 : (x + (y > 6 ? 2 : 0)) % 4 === 0 ? P.r3 : P.r2);
    }
  }
  g.hline(10, 53, 2, P.r3).hline(10, 53, 1, P.r0).hline(2, 61, 10, P.r4);
  g.set(9, 1, P.r3).set(8, 0, P.r4).set(54, 1, P.r3).set(55, 0, P.r4);
  return made(g, 8, 49);
}

export function vat() {
  const g = new Grid(18, 22);
  g.ellipse(10, 19, 7, 2, SHADOW);
  g.ellipse(9, 13, 7, 7, P.t3).ellipse(7, 12, 3, 5, P.t2).ellipse(6, 10, 1, 3, P.t1);
  g.ellipse(12, 15, 3, 4, P.t4);
  g.ellipse(9, 5, 7, 3, P.t4).ellipse(9, 5, 5.5, 2, P.w3).hline(6, 8, 4, P.w0);
  g.hline(3, 15, 3, P.t2);
  g.line(13, 2, 16, 0, P.h2).rect(11, 3, 3, 2, P.h1);
  return made(g, 9, 21);
}

// 橱柜：靠墙立着的旧木柜，两扇门，柜顶搁着一只小坛子。家里存的东西都在这儿。
export function cupboard() {
  const g = new Grid(20, 28);
  g.ellipse(11, 26, 9, 1.5, SHADOW);
  g.rect(2, 7, 16, 18, P.t2).vline(2, 7, 24, P.t1).vline(17, 7, 24, P.t4);
  g.rect(1, 5, 18, 2, P.t1).hline(1, 18, 5, P.t0).hline(1, 18, 7, P.t4); // 柜顶的板
  for (const x of [4, 11]) {
    g.rect(x, 9, 5, 13, P.t1)
      .vline(x + 4, 9, 21, P.t3)
      .hline(x, x + 4, 21, P.t3);
    g.hline(x, x + 3, 9, P.t0)
      .rect(x + 1, 11, 3, 4, P.t2)
      .rect(x + 1, 16, 3, 4, P.t2);
  }
  g.vline(9, 8, 22, P.t4).vline(10, 8, 22, P.t3).set(8, 15, P.y2).set(11, 15, P.y2); // 门缝和铜拉手
  g.hline(2, 17, 23, P.t3).hline(2, 17, 24, P.t4).rect(3, 25, 2, 1, P.t4).rect(15, 25, 2, 1, P.t4);
  g.ellipse(6, 3, 2.5, 2, P.t3).set(5, 2, P.t1).hline(5, 7, 0, P.c1).hline(4, 8, 1, P.c2); // 小坛子
  g.rect(12, 3, 4, 2, P.h1).hline(12, 15, 2, P.h0).hline(12, 15, 4, P.h3); // 一摞粗布
  return made(g, 10, 27);
}

export function well() {
  const g = new Grid(22, 26);
  g.ellipse(12, 23, 9, 2, SHADOW);
  g.rect(3, 12, 16, 10, P.s2);
  for (let x = 3; x < 19; x++) g.set(x, 21, P.s4).set(x, 12, P.s0);
  for (const x of [8, 13]) g.vline(x, 13, 20, P.s3);
  g.hline(3, 18, 17, P.s3).vline(3, 12, 21, P.s1).vline(18, 12, 21, P.s4);
  g.ellipse(11, 11, 8, 3, P.s1).ellipse(11, 11, 6, 2, P.ink1).hline(7, 10, 10, P.w4);
  // 井架和吊桶
  g.vline(4, 1, 12, P.t3).vline(17, 1, 12, P.t3).hline(3, 18, 1, P.t2).hline(3, 18, 2, P.t4);
  g.vline(11, 3, 6, P.h3).rect(9, 6, 5, 4, P.t1).hline(9, 13, 6, P.t3).hline(9, 13, 9, P.t3);
  return made(g, 11, 25);
}

export function basket() {
  const g = new Grid(16, 16);
  g.ellipse(9, 14, 6, 1.5, SHADOW);
  for (let y = 5; y <= 13; y++) {
    const inset = y > 11 ? 2 : y > 8 ? 1 : 0;
    for (let x = 2 + inset; x <= 13 - inset; x++) g.set(x, y, (x + y) % 2 ? P.h1 : P.h2);
  }
  g.hline(2, 13, 5, P.h3).hline(2, 13, 4, P.h0).hline(4, 11, 13, P.h3);
  g.ellipse(8, 4, 5, 1.5, P.h3).ellipse(8, 4, 4, 1, P.t4);
  g.line(3, 4, 7, 0, P.h2).line(12, 4, 8, 0, P.h2);
  g.rect(11, 7, 2, 4, P.c1).set(11, 11, P.c2);
  return made(g, 8, 16);
}

export function table() {
  const g = new Grid(32, 20);
  g.ellipse(17, 18, 13, 2, SHADOW);
  for (const x of [4, 26])
    g.ellipse(x, 14, 3, 2, P.s2)
      .hline(x - 2, x + 2, 13, P.s0)
      .hline(x - 2, x + 2, 16, P.s4);
  g.rect(12, 9, 8, 9, P.s3).vline(12, 9, 17, P.s2).vline(19, 9, 17, P.s4);
  g.ellipse(16, 7, 10, 4, P.s2).ellipse(16, 6, 10, 3.4, P.s1).hline(9, 15, 4, P.s0);
  g.rect(13, 4, 3, 2, P.l0).rect(18, 5, 2, 2, P.t1).set(14, 4, P.i1);
  return made(g, 8, 20);
}

export function haystack(seed) {
  const g = new Grid(32, 32);
  const r = rng(seed);
  g.ellipse(18, 29, 13, 2.5, SHADOW);
  g.ellipse(16, 19, 13, 11, P.h1).rect(4, 20, 25, 9, P.h1);
  g.ellipse(12, 15, 7, 6, P.h0);
  for (let i = 0; i < 46; i++) {
    const x = 4 + Math.floor(r() * 24);
    const y = 10 + Math.floor(r() * 18);
    if (!g.opaque(x, y)) continue;
    g.vline(x, y, y + 2, x > 18 ? P.h3 : r() < 0.5 ? P.h2 : P.h0);
  }
  for (let x = 4; x < 29; x++) if (g.opaque(x, 28)) g.set(x, 28, P.h3);
  g.rect(14, 5, 5, 4, P.h2).hline(14, 18, 8, P.h3).set(16, 4, P.h1).set(15, 3, P.h2);
  return made(g, 8, 31);
}

// 晾衣架：两头叉着的竹竿，横竿上晾着三块布。
export function rack() {
  const g = new Grid(36, 32);
  g.hline(4, 33, 30, SHADOW).hline(6, 31, 31, SHADOW);
  for (const x of [5, 30]) g.line(x - 3, 30, x + 2, 3, P.b2).line(x + 3, 30, x - 2, 3, P.b3);
  g.hline(2, 33, 6, P.b1).hline(2, 33, 7, P.b3);
  g.rect(8, 8, 7, 12, P.i1).vline(14, 8, 19, P.i2);
  for (let y = 9; y < 19; y += 2)
    for (let x = 9; x < 14; x += 2) if ((x + y) % 4 === 1) g.set(x, y, P.l0);
  g.rect(17, 8, 6, 15, P.l0).vline(22, 8, 22, P.l2).hline(17, 22, 22, P.l2);
  g.rect(25, 8, 4, 9, P.c0).vline(28, 8, 16, P.c1);
  return made(g, 10, 32);
}

// 集上的布摊：同样的竹架子，横竿上挂着四件成衣，颜色取自衣橱里的几件（art/garments.js）。
export function clothRack() {
  const g = new Grid(36, 32);
  g.hline(4, 33, 30, SHADOW).hline(6, 31, 31, SHADOW);
  for (const x of [5, 30]) g.line(x - 3, 30, x + 2, 3, P.b2).line(x + 3, 30, x - 2, 3, P.b3);
  g.hline(2, 33, 6, P.b1).hline(2, 33, 7, P.b3);
  ['tea', 'lotus', 'harvest', 'ink'].forEach((id, i) => {
    const [cloth, shade, trim] = coats[id];
    const x = 4 + i * 7;
    g.set(x + 3, 7, P.ink2); // 挂钩
    const hem = [19, 24, 21, 17][i];
    g.line(x + 1, 10, x + 3, 8, P.b2).line(x + 3, 8, x + 5, 10, P.b2);
    g.rect(x, 11, 7, 3, cloth).rect(x + 1, 13, 5, hem - 12, cloth);
    g.vline(x + 5, 12, hem, shade).hline(x + 1, x + 5, hem, shade);
    if (id === 'lotus') g.rect(x, 16, 7, 8, trim).vline(x + 5, 17, 23, cloth);
    else g.line(x + 1, 11, x + 4, 14, trim).set(x + 2, hem - 2, shade);
  });
  return made(g, 10, 32);
}

export function jars() {
  const g = new Grid(18, 16);
  g.ellipse(9, 14, 8, 1.5, SHADOW);
  for (const [x, y, s] of [
    [5, 9, 4],
    [12, 10, 3.5],
  ]) {
    g.ellipse(x, y, s, s, P.t3)
      .ellipse(x - 1, y - 1, s * 0.5, s * 0.6, P.t2)
      .ellipse(x + 2, y + 1, 1, 2, P.t4);
    g.rect(x - 2, y - s - 1, 5, 2, P.c1).hline(x - 2, x + 2, y - s + 1, P.c2);
  }
  return made(g, 9, 16);
}

export function scarecrow() {
  const g = fromText(
    [
      '......HHHH........',
      '....HHhhhhHH......',
      '..HHhhhhhhhhHH....',
      '.HhhhhhhhhhhhhH...',
      '......kkkk........',
      '......kkkk........',
      '......kkkk........',
      'ss.iiiiiiiiiii.ss.',
      'sstiiiiiiiiiiitss.',
      '...iiiIiiiIiii....',
      '....iiiiiiIii.....',
      '....iiIiiiiii.....',
      '....iiiiiIiii.....',
      '.....ii.tt.ii.....',
      '.....s..tt..s.....',
      '........tt........',
      '........tt........',
      '........tt........',
      '........tt........',
      '........tt........',
      '........tT........',
      '........tT........',
    ],
    { H: P.h2, h: P.h1, k: P.h0, s: P.h1, i: P.i0, I: P.i1, t: P.t2, T: P.t4 },
  );
  g.outline(P.ink2, (x, y) => y < 14);
  g.ellipse(10, 21, 5, 1.2, SHADOW, (x, y) => !g.opaque(x, y));
  return made(g, 9, 23);
}

export function sign() {
  const g = new Grid(16, 22);
  g.ellipse(9, 20, 5, 1.5, SHADOW);
  g.rect(7, 9, 2, 12, P.t3).vline(7, 9, 20, P.t2);
  g.rect(1, 2, 14, 8, P.t1).hline(1, 14, 2, P.t0).hline(1, 14, 9, P.t3).vline(14, 2, 9, P.t3);
  for (const [x, y, n] of [
    [3, 4, 4],
    [8, 4, 4],
    [3, 6, 6],
    [10, 6, 3],
  ])
    g.hline(x, x + n - 1, y, P.ink1);
  return made(g, 8, 22);
}

// 石头：浅色的石面，右下几笔墨线勾出轮廓。
export function rock(seed) {
  const g = new Grid(18, 14);
  const r = rng(seed);
  g.ellipse(10, 12, 7, 1.5, SHADOW);
  g.ellipse(8, 8, 7, 4.5, P.s1).ellipse(11, 6, 4, 3.5, P.s1).ellipse(6, 6, 3, 2, P.s0);
  g.each((x, y) => {
    if (!g.opaque(x + 1, y + 1) || g.get(x, y + 1) === SHADOW) return P.ink2;
    if (!g.opaque(x + 2, y + 2)) return P.s3;
    return r() < 0.04 ? P.s3 : undefined;
  });
  g.set(4, 10, P.g4).set(5, 11, P.g5).set(3, 10, P.g5);
  return made(g, 9, 14);
}

export function flowers(seed) {
  const g = new Grid(16, 14);
  const r = rng(seed);
  const colors = [P.p2, P.y1, P.l0, P.p1, P.c0];
  for (let i = 0; i < 6; i++) {
    const x = 2 + Math.floor(r() * 12);
    const y = 3 + Math.floor(r() * 5);
    g.vline(x, y + 1, 12, i % 2 ? P.g5 : P.g4);
    if (r() < 0.6) g.set(x + (r() < 0.5 ? -1 : 1), y + 4, P.g4);
    const c = colors[Math.floor(r() * colors.length)];
    g.set(x, y, c)
      .set(x - 1, y, c)
      .set(x + 1, y, c)
      .set(x, y - 1, c)
      .set(x, y, P.y2);
  }
  return made(g, 8, 15);
}

export function reeds(seed) {
  const g = new Grid(16, 26);
  const r = rng(seed);
  for (let i = 0; i < 7; i++) {
    const x0 = 2 + Math.floor(r() * 12);
    const lean = (r() - 0.5) * 0.3;
    const top = 2 + Math.floor(r() * 8);
    for (let y = 24; y >= top; y--)
      g.set(Math.round(x0 + (24 - y) * lean), y, y < top + 4 && i % 2 ? P.u0 : i % 3 ? P.b3 : P.b2);
  }
  return made(g, 8, 25);
}
