// 衣橱原画的布纹、下摆与袖口。调用方传入人物底图。
import { P } from './palette.js';
import { Grid } from './pixel.js';
export const coats = {
  hoodie: [P.n0, P.n1, P.n2, P.r2],
  stripe: [P.l0, P.s2, P.i3, P.i2],
  denim: [P.i1, P.i2, P.i0, P.t3],
  dungarees: [P.l1, P.l3, P.t2, P.t2],
  field: [P.e0, P.e3, P.g6, P.u2],
  tea: [P.g4, P.g6, P.h0, P.n3],
  cook: [P.l1, P.l3, P.i2, P.ink2],
  rain: [P.h1, P.h3, P.b3, P.u2],
  winter: [P.c1, P.c3, P.l1, P.r3],
  feast: [P.p2, P.p3, P.i3, P.u2],
};
export function clothed(original, coat, dir, pose) {
  const [base, shade, trim, pants] = coats[coat];
  const side = dir === 'right',
    back = dir === 'up',
    d = Number(pose === 'strike');
  const g = new Grid(16, 32).blit(original, 0, 0);
  const replace = new Map([
    [P.i1, base],
    [P.i2, shade],
    [P.l1, trim],
    [P.i3, trim],
    [P.ink2, pants],
  ]);
  g.each((x, y, c) => (y >= 12 ? replace.get(c) : undefined));
  const x = side ? 5 : 4;
  if (coat === 'hoodie') {
    g.rect(x - 1, 20 + d, side ? 8 : 10, 5, base).hline(x - 1, side ? 11 : 12, 25 + d, shade);
    if (back || side) {
      const hood = side ? 5 : 8;
      g.ellipse(hood, 18 + d, side ? 3 : 4, 2.8, shade)
        .hline(hood - 2, hood + 1, 18 + d, base)
        .set(hood, 21 + d, trim);
    }
    if (!back) {
      const cx = side ? 10 : 8;
      g.vline(cx - 1, 17 + d, 19 + d, P.l2)
        .set(cx + 1, 18 + d, P.l2)
        .hline(cx - 2, cx + 1, 23 + d, shade)
        .set(cx - 3, 22 + d, shade);
    }
  } else if (coat === 'stripe') {
    for (const y of [18, 21, 24]) g.hline(x, x + (side ? 5 : 7), y + d, trim);
    if (!side) g.hline(3, 4, 19 + d, trim).hline(11, 12, 19 + d, trim);
    g.hline(x + 2, x + 4, 17 + d, P.l2);
  } else if (coat === 'denim') {
    g.rect(x - 1, 17 + d, side ? 7 : 10, 8, base).hline(x - 1, side ? 10 : 12, 24 + d, shade);
    if (back) g.hline(x - 1, x + 7, 19 + d, trim).vline(7, 20 + d, 23 + d, shade);
    else {
      const cx = side ? 10 : 8;
      g.vline(cx, 18 + d, 23 + d, P.l1)
        .set(cx, 23 + d, P.t1)
        .line(cx - 3, 17 + d, cx - 1, 19 + d, trim)
        .hline(x - 1, x + 1, 20 + d, shade)
        .set(x, 21 + d, trim);
      if (!side) g.hline(10, 12, 20 + d, shade);
    }
  } else if (coat === 'dungarees') {
    g.rect(x, 17 + d, side ? 6 : 8, 7, base);
    g.rect(x, 22 + d, side ? 6 : 8, 4, trim);
    if (back) g.line(x, 17 + d, x + 5, 22 + d, trim).line(x + 5, 17 + d, x, 22 + d, trim);
    else {
      const bib = side ? 8 : 5;
      g.vline(bib, 17 + d, 20 + d, trim)
        .vline(bib + (side ? 2 : 5), 17 + d, 20 + d, trim)
        .rect(bib, 20 + d, side ? 3 : 6, 4, trim)
        .set(bib, 20 + d, P.h0)
        .hline(bib + 1, bib + (side ? 2 : 4), 22 + d, P.t3);
    }
  } else if (coat === 'field') {
    g.line(x, 18 + d, x + 5, 22 + d, shade).rect(x, 23 + d, 3, 2, P.e3);
    g.hline(5, 6, 27, P.l2).hline(9, 10, 26, P.l2);
  } else if (coat === 'tea') {
    g.line(side ? 9 : 4, 17 + d, side ? 5 : 11, 23 + d, P.h1);
    g.rect(side ? 4 : 9, 22 + d, 4, 4, P.t2).hline(side ? 4 : 9, side ? 7 : 12, 23 + d, P.h0);
  } else if (coat === 'cook') {
    if (back) {
      g.line(4, 17 + d, 10, 22 + d, P.i2)
        .line(10, 17 + d, 4, 22 + d, P.i2)
        .hline(4, 11, 23 + d, P.i3);
    } else {
      const a = side ? 8 : 5;
      g.rect(a, 18 + d, side ? 3 : 6, 8, P.i2).hline(a, a + (side ? 2 : 5), 25 + d, P.i3);
      g.hline(a, a + 2, 22 + d, P.i0).set(a + 1, 23 + d, P.i1);
    }
  } else if (coat === 'rain') {
    for (let j = 0; j < 8; j++) {
      const half = 3 + Math.floor(j / 2);
      const cx = side ? 7 : 8;
      for (let k = -half; k <= half; k++)
        if (j < 7 || k % 3 !== 0)
          g.set(cx + k, 17 + d + j, (k + j) % 4 === 0 ? P.h0 : k % 3 === 0 ? P.h3 : P.h2);
    }
    g.hline(5, 10, 18 + d, P.b3);
  } else if (coat === 'winter') {
    g.rect(x - 1, 21 + d, side ? 8 : 10, 5, base).hline(x - 1, side ? 11 : 12, 25 + d, shade);
    g.hline(x - 1, x + 6, 17 + d, P.l2).hline(x, x + 4, 18 + d, P.l0);
    if (!back) for (let y = 20; y < 25; y += 2) g.set(x + 4, y + d, P.y1);
  } else {
    g.poly(
      [
        [x + 1, 21 + d],
        [x + 5, 21 + d],
        [side ? 12 : 14, 28 + d],
        [side ? 4 : 2, 28 + d],
      ],
      base,
    );
    g.hline(side ? 4 : 3, side ? 11 : 13, 27 + d, shade).hline(x, x + 6, 21 + d, trim);
    if (!back) g.vline(side ? 9 : 10, 22 + d, 25 + d, P.i1).set(side ? 8 : 9, 26 + d, P.l0);
  }
  // 衣服上的图案可能经过伸出来的手，重新露出手掌。
  original.each((x, y, c) => {
    if (y >= 17 && (c === P.k1 || c === P.k0)) g.set(x, y, c);
  });
  return g;
}
