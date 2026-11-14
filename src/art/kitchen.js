// 白灰灶身、铁锅、柴门与木铲；只使用统一调色板。
import { Grid } from './pixel.js';
import { P, SHADOW } from './palette.js';
export function stove() {
  const g = new Grid(32, 34);
  g.ellipse(16, 31, 15, 2, SHADOW).rect(3, 12, 26, 18, P.l2).rect(3, 12, 21, 16, P.l1);
  g.hline(3, 28, 18, P.l3).hline(3, 28, 27, P.l3).vline(9, 19, 26, P.l3).vline(23, 19, 26, P.l3);
  g.ellipse(16, 12, 13, 5, P.ink1).ellipse(16, 11, 10, 3, P.ink2).ellipse(16, 10, 8, 2, P.w2);
  g.rect(11, 22, 10, 8, P.ink0).rect(13, 26, 6, 3, P.c2).rect(15, 25, 2, 3, P.y1);
  g.line(24, 2, 19, 14, P.t2).rect(23, 1, 3, 4, P.t0).set(11, 10, P.g4).set(17, 11, P.y0);
  return { grid: g, ax: 16, ay: 34 };
}

export function bookshelf() {
  const g = new Grid(24, 30);
  g.ellipse(12, 28, 11, 2, SHADOW).rect(2, 3, 20, 24, P.t3).rect(4, 5, 16, 20, P.t1);
  for (const y of [6, 16]) {
    for (let x = 5; x < 19; x += 4) g.rect(x, y, 3, 8, x % 3 ? P.paper1 : P.i2);
    g.hline(3, 20, y + 9, P.t4);
  }
  return { grid: g, ax: 12, ay: 30 };
}
