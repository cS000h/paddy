import { Grid } from './pixel.js';
import { P, SHADOW } from './palette.js';
const wrap = (g, ax = g.w / 2) => ({ grid: g, ax, ay: g.h });
export const indoors = {
  bed() {
    const g = new Grid(38, 42);
    g.ellipse(19, 39, 18, 2, SHADOW).rect(3, 5, 31, 33, P.t3).rect(5, 7, 27, 27, P.t0);
    g.rect(6, 9, 25, 23, P.i2).rect(7, 11, 23, 19, P.i1).rect(7, 8, 23, 7, P.l1);
    g.hline(7, 29, 16, P.i0)
      .hline(7, 29, 28, P.i0)
      .rect(3, 0, 3, 40, P.t3)
      .rect(31, 0, 3, 40, P.t3);
    return wrap(g);
  },
  roomWindow() {
    const g = new Grid(36, 38);
    g.rect(1, 1, 34, 33, P.t3).rect(3, 3, 30, 28, P.w1).rect(5, 5, 26, 23, P.g0);
    for (const x of [4, 12, 20, 28]) g.rect(x, 3, 2, 28, P.t2);
    for (const y of [11, 20]) g.rect(3, y, 30, 2, P.t2);
    g.rect(0, 32, 36, 4, P.t1);
    return wrap(g);
  },
  rug() {
    const g = new Grid(45, 20);
    g.rect(0, 1, 45, 18, P.h2).rect(2, 3, 41, 14, P.h0);
    for (let y = 4; y < 17; y += 3) g.hline(2, 42, y, P.h1);
    return wrap(g);
  },
  route() {
    const g = new Grid(22, 30);
    g.rect(9, 8, 3, 21, P.t3).rect(1, 4, 20, 10, P.t1).hline(2, 19, 5, P.t0);
    g.line(5, 9, 16, 9, P.ink1).line(13, 6, 16, 9, P.ink1).line(13, 12, 16, 9, P.ink1);
    return wrap(g);
  },
  teaCounter() {
    const g = new Grid(52, 45);
    g.rect(3, 7, 3, 36, P.t3).rect(46, 7, 3, 36, P.t3);
    g.rect(1, 3, 50, 9, P.i2)
      .rect(2, 3, 48, 4, P.i0)
      .rect(5, 27, 42, 14, P.t2)
      .rect(3, 24, 46, 4, P.t0);
    for (const x of [10, 21, 34]) g.ellipse(x, 22, 4, 2, P.l1).rect(x - 2, 21, 4, 2, P.w4);
    return wrap(g);
  },
  marketCounter() {
    const g = new Grid(52, 36);
    g.ellipse(26, 33, 25, 2, SHADOW).rect(3, 16, 46, 16, P.t2).rect(1, 14, 50, 4, P.t0);
    for (const x of [8, 23, 38]) g.ellipse(x, 10, 7, 4, P.h2).ellipse(x, 9, 6, 3, P.h0);
    g.ellipse(8, 8, 4, 3, P.g4).ellipse(23, 8, 4, 3, P.l1).ellipse(38, 8, 4, 3, P.e2);
    return wrap(g);
  },
  boat() {
    const g = new Grid(58, 35);
    g.ellipse(29, 28, 28, 5, P.w4).ellipse(29, 21, 26, 9, P.t3).ellipse(29, 18, 24, 7, P.t0);
    g.ellipse(29, 18, 20, 5, P.t2)
      .rect(18, 12, 3, 12, P.t0)
      .rect(38, 12, 3, 12, P.t0)
      .line(9, 4, 45, 31, P.t3);
    return wrap(g);
  },
};
