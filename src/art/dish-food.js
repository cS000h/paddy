// 配菜沿锅口排开，大块主菜留出完整轮廓。锅和盘共用这层，选料与出锅能一眼对上。
import { Grid } from './pixel.js';
import { P } from './palette.js';
import { morsel, riceBall } from './cooked-food.js';
import { signature, specialPiece } from './recipe-shapes.js';
import { servingKind } from './serving-ware.js';

const bounce = [0, 0, 1, 3, 5, 3, 1, 0];
const sweep = [-3, -2, 0, 2, 3, 2, 0, -2];

function season(g, spices, frame) {
  // 两勺落在不同的位置，葱段和辣椒看得出形，液体顺着菜面走。
  for (const [i, id] of spices.entries()) {
    const dx = i ? 5 : -3,
      dy = frame > 2 && frame < 6 ? -1 : 0;
    if (id === 'scallion' || id === 'chili') {
      for (const [x, y] of [
        [25, 23],
        [35, 20],
        [31, 25],
      ]) {
        const px = x + dx,
          py = y + dy;
        if (id === 'chili') g.line(px, py, px + 3, py - 2, P.c2).set(px + 3, py - 2, P.c0);
        else g.rect(px, py - 1, 3, 2, P.g6).set(px + 1, py - 1, P.g1);
      }
    } else {
      const color = { soy: P.t3, vinegar: P.u2, wine: P.h1, sugar: P.l0 }[id];
      if (color === undefined) continue;
      g.each((x, y) => {
        const k = x + dx,
          line = y + dy;
        if (id === 'sugar' && (k * 3 + line * 7) % 17 === 0) return color;
        if (id !== 'sugar' && (k + line * 2) % 17 < 2 && line % 4 !== 0) return color;
      });
    }
  }
}

function finish(g, q) {
  if (q === 'plain' || !q) return;
  g.each((x, y, color) => {
    const rim = !g.opaque(x, y + 1);
    if (q === 'burnt' && (rim || (x + y) % 5 < 2)) return P.t4;
    if (q === 'over' && rim && x % 3 !== 0) return P.t3;
    if (q === 'raw' && (x + 2 * y) % 7 < 2) return P.l2;
    if (q === 'under' && (x + 2 * y) % 13 === 0) return P.paper1;
    if (q === 'good' && !g.opaque(x, y - 1) && x % 6 === 0) return color === P.h0 ? P.l0 : P.h0;
    if (q === 'great' && !g.opaque(x, y - 1) && x % 6 < 3) return P.paper0;
  });
}

function tea(g, { items, method }, cy) {
  const ginger = items.includes('ginger');
  const cold = method === 'mix';
  g.ellipse(31, cy, 12, 3, cold ? P.w2 : ginger ? P.h1 : P.b1).hline(
    23,
    26,
    cy - 1,
    cold ? P.w0 : P.h0,
  );
  if (ginger) g.line(28, cy + 1, 33, cy - 1, P.h3).line(28, cy, 32, cy - 2, P.y0);
  else
    g.line(32, cy + 1, 35, cy - 2, P.g6)
      .hline(30, 33, cy, P.g4)
      .line(34, cy, 37, cy - 1, cold ? P.n1 : P.b3);
}

function skewers(g, selection, frame) {
  for (const [x, y] of [
    [18, 27],
    [28, 29],
  ]) {
    g.line(x - 4, y + 2, x + 16, y - 7, P.t2);
    for (let n = 0; n < 3; n++) {
      const px = x + n * 5,
        py = y - n * 2 - (frame === 4 ? 1 : 0);
      const pale = selection.items.includes('mutton') ? P.k0 : P.k1;
      g.rect(px, py - 3, 6, 4, P.t3)
        .rect(px, py - 4, 5, 4, P.t1)
        .hline(px + 1, px + 3, py - 4, pale)
        .set(px + 3, py - 2, P.t3);
    }
  }
}

function toppings(g, s, frame, served, kind) {
  const { items, method, base, cut, quality, spices = [] } = s;
  const center = method === 'fry' && !served ? 28 : 24;
  if (kind === 'cup') return tea(g, s, served ? 22 : 24);
  if (base?.endsWith('肉串')) return skewers(g, s, frame);
  if (base === '茶叶蛋') {
    const egg = specialPiece('teaEgg', 'egg', quality);
    g.blit(egg, 19, 14).blit(egg, 32, 12, { flipX: true }).blit(egg, 27, 17);
    g.blit(morsel('tea', null, quality), 40, 23);
    return;
  }
  const rice = items.includes('rice');
  if (rice && method !== 'roast') {
    g.ellipse(31, center, 14, 4, P.e2).ellipse(30, center - 1, 13, 4, P.paper1);
    for (const [x, y] of [
      [20, 0],
      [24, -2],
      [27, 1],
      [31, -3],
      [35, 0],
      [39, -1],
    ])
      g.hline(x, x + 2, center + y, P.l0);
  }
  const dominant = items.find(id =>
    ['wholeFish', 'wrapped', 'drum'].includes(signature(base, id, cut)),
  );
  if (dominant) {
    const shape = signature(base, dominant, cut);
    const bit = specialPiece(shape, dominant, quality, spices);
    const dy = served ? 0 : bounce[frame] >> 1;
    // 整道菜只有一个主形，留足面积给鱼身上的刀花、包叶和烤皮。
    const w = Math.round(bit.w * 1.4),
      h = Math.round(bit.h * 1.3);
    const left = 31 - Math.floor(w / 2),
      top = center - h + 5 - dy;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const c = bit.get(Math.floor((x * bit.w) / w), Math.floor((y * bit.h) / h));
        if (c) g.set(left + x, top + y, c);
      }
    if (shape === 'wrapped') {
      const inside = specialPiece('drum', 'chicken', quality);
      g.blit(inside, 29, center - 10 - dy);
      g.line(22, center - 1 - dy, 28, center + 3 - dy, P.b2);
    }
    for (const id of items.filter(k => k !== dominant)) {
      const side = morsel(id, cut, quality);
      g.blit(side, 39, center - 3);
    }
    return;
  }
  const coords =
    method === 'roast'
      ? items.length === 3
        ? [
            [-9, 0],
            [0, -3],
            [9, 1],
          ]
        : [
            [-7, -1],
            [7, 1],
          ]
      : [
          [-4, -2],
          [4, -2],
          [-9, 1],
          [0, 2],
          [8, 1],
        ];
  for (const [i, [dx, dy]] of coords.entries()) {
    const id = items[i % items.length],
      form = signature(base, id, cut);
    const toss = !served && method === 'fry' ? bounce[(frame + i) % 8] : 0;
    const slide = !served && method === 'mix' ? sweep[frame] : 0;
    let bit = specialPiece(form, id, quality, spices);
    if (!bit) {
      if (method === 'roast' && id === 'rice') bit = riceBall(served || frame > 2);
      else bit = morsel(id, form === 'crisp' || form === 'block' ? 'chunk' : cut, quality);
    }
    let x = 31 + dx - Math.floor(bit.w / 2) + slide,
      y = center + dy - bit.h + 3 - toss;
    if (form === 'crumb') {
      g.rect(x + 1, y + 2, 3, 2, P.t2)
        .rect(x + 5, y + 3, 2, 2, P.u2)
        .set(x + 4, y, P.k2);
    } else g.blit(bit, x, y, { flipX: i === 2 && id !== 'fish' });
  }
}

export function drawFood(g, selection, frame, served) {
  const { items = [], spices = [], method = 'stew', base = '' } = selection;
  if (!items.length) return;
  const kind = servingKind(selection);
  const food = new Grid(g.w, g.h);
  if (method === 'stew' && kind !== 'cup' && (!served || kind !== 'basket')) {
    let color = P.h0;
    if (items.includes('rice') || items.includes('taro')) color = P.paper1;
    if (items.includes('tomato')) color = P.c0;
    if (spices.includes('wine')) color = P.h1;
    if (spices.includes('soy')) color = P.t1;
    if (base === '羊肉汤' || base === '豆腐鱼汤') color = P.l1;
    food.ellipse(31, 25, served ? 17 : 14, served ? 4 : 3, color);
  }
  toppings(food, selection, frame, served, kind);
  season(food, spices, served ? 0 : frame);
  finish(food, selection.quality);
  g.blit(food, 0, 0);
}
