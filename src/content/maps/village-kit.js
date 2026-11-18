// 村路地图共用的几样：一张 28×22 的底子（四周树丛、东西两头留路口）、路口、按字画的地面。
import { canvas } from './paint.js';

export function ground(w, h, paint) {
  const a = Array.from({ length: h }, () => Array(w).fill('.'));
  for (const [ch, x0, y0, x1, y1] of paint)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) a[y][x] = ch;
  return a.map(r => r.join(''));
}
export const route = (x, y, to, arrival, label) => ['route', x, y, { to, arrival, label }];

/** 一张 28×22 的村路地图：四周是树丛，东西两头留出路口。 */
export function frame() {
  return hedge(canvas(28, 22));
}

/** 四周的树丛：上下两边，左右两边只在大路口（第 13–16 行）留开。画完地面最后再补一遍。 */
export function hedge(c) {
  return c
    .rect('#', 0, 0, 27, 1)
    .rect('#', 0, 21, 27, 21)
    .rect('#', 0, 2, 0, 12)
    .rect('#', 27, 2, 27, 12)
    .rect('#', 0, 17, 0, 20)
    .rect('#', 27, 17, 27, 20);
}

// 地面画完，四边的树丛再补一遍（林子、苔地会画到边上）；大路口那几行和水流出去的地方留着。
export const edged = c => hedge(c);

export const village = (id, name, paint, objects, spots = {}) => ({
  id,
  name,
  width: 28,
  height: 22,
  ground: paint.rows(),
  objects,
  spots: { west: [2, 15, 'right'], east: [25, 15, 'left'], ...spots },
});
