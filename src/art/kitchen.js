// 檐下和屋里的家什：柴火灶、放册子的书架。每个函数返回 {grid, ax, ay}，ax、ay 是脚下那一格的底边中点。
import { Grid } from './pixel.js';
import { P, SHADOW } from './palette.js';

// 柴火灶：土坯砌的灶身，白灰抹的台面；左边一口大铁锅，右边一笼竹蒸屉，灶门里一点余火，灶脚码着柴。
export function stove() {
  const g = new Grid(32, 30);
  g.ellipse(17, 27, 14, 2, SHADOW);
  // 灶脚的柴
  for (const [x, y] of [
    [3, 25],
    [7, 25],
    [5, 22],
  ])
    g.ellipse(x, y, 2, 2, P.t2)
      .set(x, y, P.t0)
      .set(x - 1, y - 1, P.t1)
      .set(x + 1, y + 1, P.t4);
  // 灶身
  g.rect(9, 13, 21, 14, P.e1).vline(9, 13, 26, P.e0).vline(29, 13, 26, P.e3);
  g.hline(9, 29, 26, P.e4).hline(10, 28, 18, P.e2).hline(10, 28, 22, P.e2);
  for (const [x, y] of [
    [14, 14],
    [24, 14],
    [26, 19],
    [12, 23],
    [25, 23],
  ])
    g.vline(x, y, y + 3, P.e2);
  // 白灰台面，前沿一道影子
  g.rect(8, 10, 23, 3, P.l0).hline(8, 30, 12, P.l2).hline(8, 30, 13, P.e3).set(30, 10, P.l2);
  // 灶门：拱形的口子，里头是烧剩的炭火
  g.rect(15, 18, 8, 9, P.ink0).hline(16, 21, 17, P.ink0).hline(15, 22, 26, P.ink1);
  g.hline(16, 21, 25, P.c2)
    .hline(17, 20, 24, P.c1)
    .set(18, 23, P.y1)
    .set(19, 24, P.y0)
    .set(17, 25, P.c0);
  g.hline(14, 23, 16, P.e3).vline(14, 17, 26, P.e3).vline(23, 17, 26, P.e4);
  // 大铁锅和斜插着的锅铲
  g.ellipse(15, 9, 7, 3, P.ink1)
    .ellipse(15, 8, 5.5, 2, P.ink2)
    .hline(11, 14, 7, P.s3)
    .set(11, 8, P.s1);
  g.line(17, 8, 21, 2, P.t2).line(18, 8, 22, 2, P.t3).rect(21, 0, 2, 3, P.t1);
  // 竹蒸屉
  g.rect(24, 5, 7, 5, P.h1).hline(24, 30, 5, P.h0).hline(24, 30, 7, P.h3).hline(24, 30, 9, P.h3);
  g.hline(25, 29, 4, P.h2).hline(26, 28, 3, P.h1).vline(30, 5, 9, P.h2);
  return { grid: g, ax: 16, ay: 29 };
}

// 书架：两层旧木架，立着几册线装书，顶上一盏油灯。
export function bookshelf() {
  const g = new Grid(22, 30);
  g.ellipse(12, 28, 10, 1.5, SHADOW);
  g.rect(2, 6, 18, 22, P.t3).rect(3, 7, 16, 20, P.t4).vline(2, 6, 27, P.t2).vline(19, 6, 27, P.t4);
  g.hline(1, 20, 5, P.t1).hline(1, 20, 6, P.t3).hline(3, 18, 16, P.t2).hline(3, 18, 17, P.t3);
  g.hline(3, 18, 26, P.t2).hline(2, 19, 27, P.t4);
  const books = [
    [4, 9, P.i2, 7],
    [6, 8, P.paper1, 8],
    [8, 10, P.c2, 6],
    [10, 9, P.paper2, 7],
    [12, 8, P.i1, 8],
    [15, 11, P.u1, 5],
    [4, 19, P.paper1, 7],
    [6, 20, P.u2, 6],
    [8, 18, P.i3, 8],
    [11, 21, P.paper0, 5],
    [13, 19, P.c1, 7],
    [16, 20, P.paper2, 6],
  ];
  for (const [x, y, c, h] of books) g.rect(x, y, 2, h, c).set(x, y + 1, P.ink3);
  g.rect(9, 2, 4, 3, P.t1).hline(9, 12, 4, P.t3).set(10, 1, P.y1).set(11, 1, P.y0).set(10, 0, P.c0);
  return { grid: g, ax: 11, ay: 29 };
}
