// 发束随步态摆动；长度按各发式的成品轮廓取值。
import { P } from './palette.js';
import { Grid } from './pixel.js';

// 辫根绕到耳后，束节在脸廓外一浅一深交错。只有辫梢随步子摆动。
function braid(g, side, back, length, drop, swing) {
  const root = back ? 8 : side ? 3 : 13;
  const start = (back ? 12 : side ? 13 : 14) + drop;
  if (!back) {
    const temple = side ? 3 : 13;
    g.vline(temple, 10 + drop, start - 1, P.a0).vline(temple, 12 + drop, start - 1, P.u2);
    if (!side) g.set(12, 13 + drop, P.k1);
  }
  const sections = length + 1;
  for (let i = 0; i < sections; i++) {
    const x = root + (i === sections - 1 ? swing : 0);
    const row = start + i * 2;
    const twist = i % 2 === 0 ? 1 : -1;
    g.set(x, row, P.u1)
      .set(x + twist, row, P.a0)
      .set(x, row + 1, P.u2)
      .set(x - twist, row + 1, P.a0);
  }
  const tip = root + swing;
  const end = start + sections * 2;
  g.hline(tip - 1, tip, end, P.h2).set(tip, end + 1, P.u2);
}

function extraHair(g, style, side, back, y, dark, light, c) {
  if (style === 'topknot') {
    const cx = side ? 6 : 8;
    g.rect(cx - 2, 1 + y, 4, 4, dark).hline(cx - 1, cx + 1, 2 + y, P.a0).set(cx, 1 + y, light);
    g.hline(cx - 3, cx + 3, 3 + y, P.h2).set(cx + 3, 3 + y, P.y1);
  } else if (style === 'sidebun') {
    const cx = side ? 4 : 12;
    g.ellipse(cx, 6 + y, 2.2, 2.2, dark).set(cx - 1, 5 + y, light).hline(cx - 1, cx + 1, 8 + y, c);
  } else if (style === 'short') {
    g.hline(3, 12, 5 + y, P.a0).hline(4, 11, 4 + y, dark).hline(5, 8, 5 + y, light);
    if (back) g.rect(3, 8 + y, 10, 5, P.a0).hline(4, 11, 13 + y, dark);
    else g.vline(side ? 3 : 2, 8 + y, 11 + y, dark);
  } else if (style === 'doublebun') {
    for (const cx of side ? [5] : [3, 12]) {
      g.ellipse(cx, 4 + y, 2, 2, dark).set(cx, 3 + y, light).hline(cx - 1, cx + 1, 6 + y, c);
    }
  } else if (style === 'cap') {
    // 乡间靛蓝包头，后脑垂一小角
    g.rect(3, 4 + y, 10, 4, P.i2).hline(4, 11, 4 + y, P.i1).hline(3, 12, 7 + y, P.i3);
    if (back || side) g.rect(side ? 2 : 7, 8 + y, 2, 4, P.i2).set(side ? 2 : 8, 12 + y, P.i3);
  }
}

export function hairLayer(hair, dir, pose) {
  const g = new Grid(16, 32),
    side = dir === 'right',
    back = dir === 'up';
  const { length: n, style, part } = hair;
  const y = Number(pose === 'strike'),
    sw = pose === 'walkA' ? 1 : pose === 'walkB' ? -1 : 0;
  const c = P.c1,
    dark = P.a1,
    light = P.u2;
  const strand = (cx, top, end, width) => {
    for (let j = top; j <= end; j++) {
      const dx = sw && j > end - 3 ? sw : 0;
      g.hline(cx + dx, cx + dx + width - (j === end ? 1 : 0), j + y, P.a0).set(
        cx + dx,
        j + y,
        dark,
      );
      if (j % 4 === 0 && width > 1) g.set(cx + dx + 1, j + y, light);
    }
  };
  if (style === 'crop') {
    const fringe = part === 'middle' ? 7 : 10;
    g.line(3, 7 + y, 6, 4 + y, P.a0)
      .hline(6, 9, 4 + y, P.a0)
      .set(9, 3 + y, P.a0)
      .set(12, 5 + y, dark)
      .set(4, 8 + y, light);
    if (back) {
      for (let x = 3; x <= 12; x += 3) g.line(x, 12 + y, x + 1, 14 + n + y, dark);
    } else {
      g.line(fringe - 2, 8 + y, fringe, 10 + y, dark).set(fringe - 4, 10 + y, P.a0);
      strand(3, 9, 11 + 2 * n, 1);
    }
  } else if (style === 'bob') {
    const hem = 14 + 2 * n;
    if (back) {
      g.rect(2, 9 + y, 12, hem - 9, P.a0).hline(3, 12, hem + y, dark);
      g.vline(3, 10 + y, hem - 2 + y, light).vline(12, 11 + y, hem - 1 + y, dark);
    } else {
      strand(2, 8, hem - 1, side ? 4 : 2);
      g.hline(3, side ? 7 : 5, hem + y, dark);
      if (!side) {
        strand(12, 8, hem - 1, 1);
        g.hline(10, 12, hem + y, dark);
      }
      g.hline(side ? 8 : 4, side ? 12 : 10, 9 + y, P.a0);
    }
  } else if (style === 'pony') {
    const cx = side ? 2 : back ? 8 : 2;
    g.ellipse(cx + 1, 6 + y, 2, 2.4, dark).hline(cx, cx + 1, 6 + y, c);
    for (let j = 0; j < 6 + 2 * n; j++) {
      const x = cx + (j < 3 ? -1 : 0) + (j > 6 ? sw : 0);
      g.hline(x, x + (j < 6 ? 2 : 1), 8 + j + y, P.a0).set(x, 8 + j + y, dark);
    }
  } else if (style === 'knot') {
    const cx = side ? 5 : 8;
    g.ellipse(cx, 3 + y, 3.3 + (n - 2) * 0.5, 2.5, dark)
      .ellipse(cx - 1, 2 + y, 2, 1.2, P.a0)
      .set(cx - 1, 1 + y, light)
      .set(cx + 3, 2 + y, P.a0)
      .hline(cx - 2, cx + 2, 5 + y, c);
    g.line(side ? 3 : 2, 10 + y, side ? 3 : 3, 12 + y, P.a0);
    if (!back) g.set(4, 13 + y, dark);
  } else if (style === 'loose') {
    const end = 11 + n * 3;
    if (back) for (let x = 4; x < 12; x += 2) strand(x, 10, end + (x === 6 || x === 8 ? 2 : 0), 2);
    else {
      strand(side ? 3 : 2, 9, end, side ? 3 : 2);
      if (!side) strand(11, 9, end - 1, 2);
    }
  } else if (style === 'bun') {
    const cx = side ? 4 : 8,
      rad = n === 3 ? 4 : 3;
    g.ellipse(cx, 4 + y, rad, 3, dark)
      .ellipse(cx - 1, 3 + y, rad - 1, 1.6, P.a0)
      .hline(cx - 2, cx, 2 + y, light)
      .hline(cx - 2, cx + 2, 5 + y, c);
    g.line(cx, 4 + y, cx + 5, 2 + y, P.h2).set(cx + 5, 2 + y, P.y0);
  } else if (style === 'twins') {
    for (const cx of side ? [3] : [2, 12]) {
      g.ellipse(cx, 10 + y, 2, 2.2, dark).hline(cx - 1, cx + 1, 11 + y, c);
      strand(cx - 1, 12, 12 + n * 2, 2);
    }
  } else if (style === 'braid') {
    braid(g, side, back, n, y, sw);
  } else if (['topknot', 'sidebun', 'short', 'doublebun', 'cap'].includes(style)) {
    extraHair(g, style, side, back, y, dark, light, c);
  } else {
    const cx = side ? 2 : back ? 8 : 12;
    const start = side ? 10 : 13;
    strand(cx - 1, start, start + 2 + n * 2, 2);
    g.hline(cx - 1, cx + 1, start + y, c).set(cx + 2, start + 1 + y, c);
  }
  if (!back && style !== 'cap') {
    if (part === 'middle')
      g.line(7, 7 + y, 4, 10 + y, P.a0)
        .line(8, 7 + y, 11, 9 + y, P.a0)
        .set(7, 9 + y, P.k0);
    else g.line(5, 8 + y, side ? 10 : 9, 9 + y, P.a0).set(side ? 9 : 8, 10 + y, P.a0);
  } else if (back && style !== 'cap') g.hline(5, 8, 7 + y, light);
  // 远景只用两点表示眼睛，留出眼周和脸颊的底色，各种发式都能看清朝向。
  if (!back) g.rect(side ? 9 : 4, 11 + y, side ? 5 : 8, 4, 0);
  return g;
}
