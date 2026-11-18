// 盘子的口沿共用同一中心，让锅里的配料能直接转到成品上。
import { P } from './palette.js';

export function servingKind({ method, items = [], base = '' }) {
  if (['姜茶', '香草茶', '薄荷凉饮'].includes(base)) return 'cup';
  if (['炭烤鱼', '香草烤鱼', '红烧鱼', '糖醋鱼', '蒸咸鱼'].includes(base)) return 'fishPlate';
  if (['茶叶蛋', '叫花鸡'].includes(base) || method === 'roast') return 'basket';
  if (items.includes('rice') && (method === 'fry' || /饭$/.test(base))) return 'riceBowl';
  if (/红烧|酱香|扣肉|炖肉|焖鸡|烧鸡|煲$/.test(base)) return 'crock';
  if (method === 'mix') return 'celadon';
  if (method === 'fry') return 'plate';
  return 'soupBowl';
}

// 用口沿、圈足和两三笔釉色分器型，食物都落在 y=24 附近。
export function drawServing(g, kind) {
  if (kind === 'basket') {
    g.ellipse(32, 34, 23, 7, P.t3)
      .rect(9, 25, 47, 9, P.t2)
      .ellipse(32, 32, 23, 6, P.t1)
      .hline(16, 48, 37, P.t3);
    for (const x of [14, 21, 28, 35, 42, 49]) g.line(x, 31, x + 2, 35, P.h2);
    g.ellipse(32, 25, 24, 8, P.t3)
      .ellipse(32, 24, 23, 7, P.h1)
      .ellipse(32, 24, 21, 5, P.t1)
      .poly(
        [
          [11, 25],
          [22, 20],
          [44, 19],
          [52, 22],
          [44, 27],
          [23, 29],
        ],
        P.g4,
      )
      .line(15, 26, 47, 21, P.g2);
    return;
  }
  if (kind === 'cup') {
    g.rect(25, 38, 13, 3, P.n1)
      .ellipse(31, 35, 13, 5, P.n1)
      .poly(
        [
          [16, 22],
          [47, 22],
          [44, 35],
          [39, 39],
          [24, 39],
          [19, 35],
        ],
        P.n1,
      )
      .poly(
        [
          [18, 23],
          [45, 23],
          [42, 34],
          [38, 37],
          [24, 37],
          [21, 34],
        ],
        P.w2,
      )
      .line(20, 28, 22, 34, P.w1)
      .ellipse(31, 22, 16, 6, P.n1)
      .ellipse(31, 22, 15, 5, P.l0)
      .ellipse(31, 22, 12, 4, P.h1);
    return;
  }
  if (['plate', 'celadon', 'fishPlate'].includes(kind)) {
    const wide = kind === 'fishPlate',
      green = kind === 'celadon';
    const rx = wide ? 28 : 24,
      ry = wide ? 7 : 9;
    g.ellipse(31, 30, rx - 2, ry - 1, green ? P.n1 : P.s4)
      .ellipse(31, 27, rx, ry, green ? P.n1 : P.s3)
      .ellipse(31, 26, rx - 1, ry - 1, green ? P.w1 : P.l0)
      .ellipse(31, 26, rx - 4, ry - 3, green ? P.w2 : P.i0)
      .ellipse(31, 25, rx - 5, ry - 3, green ? P.w1 : P.paper1);
    if (wide) {
      for (const x of [8, 50]) g.line(x, 26, x + 2, 27, P.i2).set(x + 1, 24, P.i1);
    }
    return;
  }
  const clay = kind === 'crock',
    rice = kind === 'riceBowl';
  const rim = clay ? P.t3 : rice ? P.i2 : P.s4,
    body = clay ? P.t1 : rice ? P.paper1 : P.w2;
  if (clay) for (const x of [10, 52]) g.ellipse(x, 26, 5, 3, P.t3).ellipse(x, 25, 2, 1, P.e1);
  g.rect(24, 38, 15, 4, rim)
    .hline(26, 36, 41, clay ? P.t2 : P.s2)
    .poly(
      [
        [9, 24],
        [53, 24],
        [49, 33],
        [43, 38],
        [36, 40],
        [25, 40],
        [17, 36],
        [12, 31],
      ],
      rim,
    )
    .poly(
      [
        [11, 25],
        [50, 25],
        [47, 32],
        [41, 37],
        [34, 39],
        [26, 38],
        [18, 34],
      ],
      body,
    )
    .ellipse(31, 24, 22, 7, rim)
    .ellipse(31, 23, 21, 6, clay ? P.h1 : P.l0)
    .ellipse(31, 24, 18, 5, clay ? P.t2 : P.paper2);
  if (rice) g.hline(23, 39, 33, P.i1).line(15, 30, 22, 33, P.i1).line(40, 33, 47, 30, P.i2);
  if (clay) g.hline(20, 42, 34, P.e3).hline(24, 39, 36, P.h3);
}
