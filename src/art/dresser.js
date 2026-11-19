// 小屋梳妆台，沿用试衣原稿的木案和铜镜。
import { Grid } from './pixel.js';
import { P, SHADOW } from './palette.js';
export function dresser() {
  const g = new Grid(37, 42);
  g.ellipse(19, 39, 16, 2, SHADOW);
  g.rect(16, 15, 3, 10, P.t3)
    .ellipse(17, 12, 9, 10, P.t3)
    .ellipse(17, 12, 8, 9, P.h2)
    .ellipse(17, 12, 6.5, 7.5, P.w3)
    .line(12, 13, 18, 6, P.w1)
    .line(14, 15, 20, 8, P.w2);
  g.rect(4, 26, 3, 13, P.t2)
    .rect(29, 26, 3, 13, P.t3)
    .rect(4, 26, 28, 5, P.t2)
    .rect(3, 23, 30, 3, P.t1)
    .hline(3, 32, 23, P.t0)
    .hline(11, 24, 28, P.t3)
    .set(18, 28, P.h1);
  g.hline(5, 12, 21, P.t4);
  for (let x = 5; x <= 12; x += 2) g.set(x, 22, P.t2);
  g.ellipse(28, 22, 3, 1.4, P.c2).hline(26, 30, 21, P.c0);
  return g;
}
