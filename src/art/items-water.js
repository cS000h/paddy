// 物品图标（四）：钓上来的六种鱼和蚯蚓。每个函数返回一张没描边的 16×16 小图。
// 先拿「鱼」改色的临时图，Astra 的 A-05 换成正式的。
import { Grid } from './pixel.js';
import { P } from './palette.js';
import { sketch } from './items-kit.js';
import { FISH } from './items-pantry.js';

// 同一条鱼换颜色：b 背、c 身子、w 肚皮；marks 是另点上的几个像素（须、斑）。
const species =
  (b, c, w, marks = []) =>
  () => {
    const g = sketch(FISH, { b, c, w });
    for (const [x, y, col] of marks) g.set(x, y, col);
    return g;
  };

export const water = {
  'fish.bleak': species(P.s3, P.s0, P.w0),
  'fish.crucian': species(P.s4, P.s2, P.s1),
  'fish.yellowcat': species(P.h3, P.y1, P.y0, [
    [1, 6, P.h3],
    [0, 7, P.h3],
  ]),
  'fish.carp': species(P.t3, P.y2, P.h1, [
    [1, 8, P.t3],
    [0, 9, P.t3],
  ]),
  'fish.grass': species(P.n2, P.g4, P.g1),
  'fish.mandarin': species(P.u2, P.e2, P.e0, [
    [6, 5, P.ink2],
    [10, 5, P.ink2],
    [8, 6, P.ink2],
    [7, 7, P.ink2],
  ]),
  // 蚯蚓：一小团土上盘着一条
  worm: () => {
    const g = new Grid(16, 16).ellipse(8, 11, 6, 3, P.d1).ellipse(7, 10, 4, 1.5, P.d0);
    const body = [
      [3, 8],
      [4, 7],
      [5, 7],
      [6, 8],
      [7, 9],
      [8, 9],
      [9, 8],
      [10, 7],
      [11, 6],
      [12, 6],
      [12, 5],
    ];
    for (const [x, y] of body) g.set(x, y, P.p3).set(x, y + 1, P.k2);
    return g;
  },
};
