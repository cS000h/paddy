// 锅口中心是共同的落点，食材、工具和水气各画一层。
import { Grid } from './pixel.js';
import { P, SHADOW } from './palette.js';
import { morsel } from './cooked-food.js';
import { drawFood } from './dish-food.js';
import { drawServing, servingKind } from './serving-ware.js';

export const COOK_FRAMES = 8;
const rise = [0, 0, 1, 3, 5, 3, 1, 0];
const stir = [-3, -2, 0, 2, 3, 2, 0, -2];

function brothPot(g) {
  // 锅身的土色带、两边的把手和低矮的圈足，让砂锅在小图里也容易认。
  g.ellipse(13, 28, 5, 3, P.t3)
    .ellipse(13, 27, 3, 1, P.paper2)
    .ellipse(49, 28, 5, 3, P.t3)
    .ellipse(49, 27, 3, 1, P.paper2)
    .rect(22, 41, 19, 3, P.u2)
    .poly(
      [
        [11, 25],
        [16, 22],
        [44, 22],
        [50, 26],
        [48, 36],
        [42, 41],
        [38, 43],
        [23, 43],
        [16, 39],
        [12, 34],
      ],
      P.t3,
    )
    .poly(
      [
        [13, 27],
        [47, 27],
        [46, 35],
        [40, 40],
        [24, 41],
        [17, 38],
        [14, 34],
      ],
      P.t1,
    )
    .poly(
      [
        [14, 29],
        [43, 29],
        [44, 33],
        [39, 37],
        [21, 37],
        [15, 34],
      ],
      P.e3,
    )
    .hline(20, 40, 38, P.h3)
    .hline(21, 32, 39, P.t1)
    .ellipse(31, 25, 19, 7, P.t3)
    .ellipse(31, 24, 18, 6, P.h1)
    .ellipse(31, 24, 16, 5, P.t3)
    .ellipse(31, 25, 14, 3, P.e3);
}
function wok(g) {
  g.line(46, 28, 57, 23, P.ink1)
    .line(46, 29, 57, 24, P.ink1)
    .poly(
      [
        [51, 23],
        [59, 19],
        [62, 20],
        [62, 23],
        [53, 27],
        [51, 26],
      ],
      P.t3,
    )
    .line(52, 24, 60, 20, P.t1)
    .line(53, 25, 60, 22, P.t2)
    .ellipse(10, 29, 5, 3, P.ink1)
    .ellipse(9, 28, 2, 1, P.paper2)
    .poly(
      [
        [9, 29],
        [52, 29],
        [49, 35],
        [42, 40],
        [36, 42],
        [27, 42],
        [17, 38],
      ],
      P.ink1,
    )
    .poly(
      [
        [12, 31],
        [49, 30],
        [47, 35],
        [39, 39],
        [27, 40],
        [17, 36],
      ],
      P.r2,
    )
    .ellipse(31, 28, 22, 8, P.ink1)
    .ellipse(31, 27, 21, 7, P.s3)
    .ellipse(31, 27, 19, 6, P.r3)
    .ellipse(30, 28, 16, 4, P.r2)
    .hline(16, 22, 25, P.r1)
    .hline(27, 36, 34, P.s3);
}
function grill(g) {
  g.rect(14, 39, 6, 5, P.t3)
    .rect(43, 39, 6, 5, P.t3)
    .poly(
      [
        [11, 24],
        [48, 23],
        [54, 31],
        [51, 40],
        [16, 41],
        [9, 35],
      ],
      P.t3,
    )
    .poly(
      [
        [11, 29],
        [52, 29],
        [50, 37],
        [17, 38],
        [11, 35],
      ],
      P.u1,
    )
    .hline(18, 46, 38, P.e4)
    .poly(
      [
        [14, 21],
        [46, 21],
        [53, 29],
        [52, 32],
        [10, 32],
        [9, 30],
      ],
      P.t2,
    )
    .poly(
      [
        [15, 23],
        [45, 23],
        [50, 30],
        [12, 30],
      ],
      P.ink1,
    );
  for (const x of [16, 24, 32, 40]) g.hline(x, x + 3, 28, P.c1).set(x + 1, 27, P.y1);
  for (const x of [16, 22, 28, 34, 40, 46]) g.line(x, 22, x - 2, 31, P.s4);
  g.hline(12, 50, 32, P.e3).hline(22, 29, 36, P.t4).hline(36, 43, 36, P.t4);
}
function china(g) {
  g.rect(24, 40, 15, 3, P.s4)
    .hline(25, 38, 40, P.paper1)
    .poly(
      [
        [10, 25],
        [53, 25],
        [50, 34],
        [42, 40],
        [35, 42],
        [26, 41],
        [18, 37],
        [13, 32],
      ],
      P.ink2,
    )
    .poly(
      [
        [12, 26],
        [51, 26],
        [48, 33],
        [40, 39],
        [29, 40],
        [20, 37],
        [15, 32],
      ],
      P.paper1,
    )
    .poly(
      [
        [14, 28],
        [44, 28],
        [41, 36],
        [33, 39],
        [25, 37],
        [18, 34],
      ],
      P.l0,
    )
    .ellipse(31, 25, 21, 7, P.s4)
    .ellipse(31, 24, 20, 6, P.l0)
    .ellipse(31, 24, 17, 4, P.s1)
    .ellipse(31, 25, 15, 3, P.w1)
    .hline(23, 39, 32, P.i1)
    .line(15, 29, 21, 32, P.i1)
    .line(41, 32, 49, 29, P.i2)
    .line(27, 36, 35, 34, P.i2)
    .set(30, 34, P.i1)
    .set(32, 36, P.i1);
}

const vessels = { stew: brothPot, fry: wok, roast: grill, mix: china };

function steam(g, x, y, frame) {
  for (let i = 0; i < 2; i++) {
    const age = (frame + i * 4) % 8;
    const dx = x + i * 9 + (age > 3 ? 1 : 0),
      dy = y - age;
    g.line(dx, dy, dx + 1, dy - 2, P.s2);
    if (age > 1 && age < 7) g.line(dx + 1, dy - 3, dx, dy - 4, P.s1);
  }
}

function turner(g, x, y) {
  g.line(x, y, x - 14, y - 16, P.t3)
    .line(x - 1, y, x - 15, y - 16, P.t1)
    .line(x, y, x - 5, y - 6, P.s4)
    .poly(
      [
        [x - 4, y],
        [x, y - 3],
        [x + 3, y - 1],
        [x + 1, y + 2],
        [x - 3, y + 3],
      ],
      P.ink2,
    )
    .line(x - 3, y + 1, x, y - 1, P.s2);
}

/** 一格 64×50；桌面和手机用同一组图。出锅时按菜的做法换盘。 */
export function cookingFrame(selection, frame = 0, served = false) {
  const { method = 'stew', items = [] } = selection;
  const g = new Grid(64, 50);
  if (served) {
    const kind = servingKind(selection);
    const foot = { fishPlate: 36, plate: 38, celadon: 38, basket: 41, cup: 41 }[kind] || 42;
    g.ellipse(32, foot, kind === 'cup' ? 10 : 18, 2, SHADOW);
    drawServing(g, kind);
  } else {
    g.ellipse(32, 44, 19, 2, SHADOW);
    (vessels[method] || brothPot)(g);
  }
  drawFood(g, selection, frame, served);
  if (!items.length || served) return g;
  if (method === 'stew') {
    const x = frame < 4 ? 20 : 40;
    g.hline(x, x + 2, 25, P.paper0);
    steam(g, 26, 16, frame);
  }
  if (method === 'fry') turner(g, 33 + stir[frame], 28 - rise[frame]);
  if (method === 'roast') {
    g.set(19 + (frame % 4), 29, P.y1);
    steam(g, 23, 17, frame);
  }
  if (method === 'mix') {
    const x = 35 + stir[frame];
    g.line(x, 23, x + 12, 8, P.t3).line(x + 3, 23, x + 15, 9, P.t2);
  }
  return g;
}

/** 备菜时左边留出厚木案板，刀落时停一拍，切完的料收在刀口右边。 */
export function prepBoard(selection, frame, rawIcon) {
  const g = new Grid(52, 50);
  g.ellipse(25, 43, 21, 2, SHADOW)
    .poly(
      [
        [8, 27],
        [42, 27],
        [48, 36],
        [46, 40],
        [7, 40],
        [3, 37],
      ],
      P.t3,
    )
    .poly(
      [
        [9, 25],
        [41, 25],
        [47, 35],
        [46, 37],
        [5, 37],
        [4, 35],
      ],
      P.t1,
    )
    .poly(
      [
        [10, 26],
        [40, 26],
        [44, 34],
        [42, 35],
        [7, 35],
      ],
      P.t0,
    )
    .line(9, 36, 39, 36, P.h1)
    .hline(11, 35, 39, P.t2);
  if (!rawIcon) return g;
  g.blit(rawIcon, 7, 18);
  const item = selection.items[0];
  g.blit(morsel(item, selection.cut), 30, 29);
  if (!selection.cut) return g;
  const lift = rise[frame];
  const y = 30 - lift;
  g.poly(
    [
      [19, y - 6],
      [28, y - 9],
      [31, y - 5],
      [22, y - 1],
      [20, y - 1],
    ],
    P.ink2,
  )
    .poly(
      [
        [20, y - 6],
        [28, y - 8],
        [30, y - 5],
        [22, y - 2],
      ],
      P.s3,
    )
    .line(22, y - 2, 30, y - 5, P.l1)
    .line(29, y - 8, 36, y - 12, P.t3)
    .line(30, y - 8, 36, y - 11, P.t1);
  return g;
}
