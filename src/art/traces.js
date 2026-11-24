// 院门和柜台上的小东西。边也画在这一格里，贴在地上的脚印只留泥色。
import { Grid } from './pixel.js';
import { P } from './palette.js';

const tile = grid => ({ grid, ax: 8, ay: 16 });

export function iou(look = 'plain') {
  const g = new Grid(16, 16);
  g.rect(3, 4, 10, 8, P.paper0).hline(4, 12, 12, P.e3);
  g.vline(12, 5, 11, P.paper2).line(9, 4, 12, 7, P.e3).hline(10, 12, 5, P.paper2);
  g.hline(5, 8, 7, P.ink2).hline(5, 9, 9, P.ink3).rect(10, 10, 2, 2, P.c2);
  if (look === 'crossed') g.line(4, 11, 10, 5, P.c2).line(4, 6, 11, 11, P.c2);
  g.ellipse(4, 4, 2.4, 1.8, P.s5).hline(3, 5, 3, P.s2).set(3, 4, P.s3);
  return tile(g.outline(P.o0));
}

export function doorBasket() {
  const g = new Grid(16, 16);
  g.ellipse(8, 7, 4, 5, P.t3).ellipse(8, 7, 3, 4, 0);
  g.rect(2, 8, 12, 3, P.h2).rect(3, 11, 10, 2, P.t2).hline(4, 11, 13, P.t3);
  g.hline(2, 13, 8, P.h1).hline(3, 12, 11, P.h3);
  for (const x of [4, 7, 10]) g.set(x, 10, P.t2).set(x + 1, 12, P.h1);
  g.ellipse(4, 7, 1.5, 1.8, P.l0).set(3, 7, P.e1);
  g.line(5, 7, 7, 4, P.g6).line(5, 7, 4, 5, P.g4);
  g.hline(7, 12, 7, P.i1).hline(6, 13, 8, P.i0).hline(8, 13, 9, P.i1);
  g.hline(9, 12, 10, P.i2).hline(10, 11, 11, P.i1).line(9, 7, 12, 10, P.l1);
  return tile(g.outline(P.o0));
}

export function coinString() {
  const g = new Grid(16, 16);
  g.line(2, 12, 12, 4, P.c3).line(11, 4, 13, 2, P.c1).line(11, 4, 14, 4, P.c2);
  for (const [x, y] of [
    [11, 5],
    [8, 8],
    [4, 10],
  ]) {
    g.ellipse(x, y, 2.4, 2.4, P.t3).ellipse(x, y - 1, 2.3, 1.7, P.y2);
    g.hline(x - 1, x + 1, y - 2, P.y0)
      .set(x, y - 1, P.t4)
      .set(x, y, P.t4);
  }
  g.line(4, 11, 2, 13, P.c2).set(3, 13, P.c0);
  return tile(g.outline(P.o0));
}

export function cashBox(look = 'closed') {
  const g = new Grid(16, 16);
  g.rect(2, 8, 12, 5, P.t2).hline(3, 12, 12, P.t3);
  g.vline(3, 9, 12, P.h2).vline(12, 9, 12, P.h3).hline(6, 9, 11, P.t3);
  if (look === 'open') {
    g.rect(2, 2, 12, 5, P.t1).rect(3, 3, 10, 3, P.t3).hline(4, 11, 4, P.t2);
    g.rect(2, 7, 12, 3, P.t4).hline(2, 13, 7, P.t0).hline(2, 13, 10, P.t0);
    g.hline(3, 6, 9, P.y2).hline(4, 5, 8, P.y0).set(5, 9, P.t3);
  } else {
    g.rect(2, 5, 12, 4, P.t1).hline(3, 12, 5, P.t0).hline(2, 13, 9, P.t4);
    g.vline(4, 5, 8, P.h2).vline(11, 5, 8, P.h3).hline(6, 9, 7, P.t2);
  }
  g.rect(7, 9, 2, 2, P.h2).set(7, 9, P.y0);
  return tile(g.outline(P.o0));
}

export function footprints() {
  const g = new Grid(16, 16);
  for (const [x, y, side] of [
    [3, 9, -1],
    [9, 7, 1],
    [7, 2, -1],
    [13, 0, 1],
  ]) {
    g.hline(x, x + 1, y, P.wet1).hline(x - 1, x + 1, y + 1, P.wet2);
    g.hline(x - 1, x, y + 2, P.wet1).set(x + side, y + 2, P.wet0);
    g.hline(x - 2, x - 1, y + 4, P.wet2).set(x - 2, y + 5, P.wet1);
  }
  return tile(g);
}
