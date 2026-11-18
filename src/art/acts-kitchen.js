// 灶前的活：切菜、蹲到灶口添柴、翻炒、盛出来。尺寸和锚点跟 acts-work.js 一样（72×56，脚下 (22, 51)）。
// 灶和锅是地图上本来就有的，这里只画人、案板、刀、锅铲和碗；火和烟由世界那边叠在灶上。
import { P } from './palette.js';
import { worker, pose, finish, reach } from './worker.js';
import { base } from './acts-work.js';

const X = 22;
const FEET = 50;
const R = Math.round;

// 切菜：案板搁在矮桌上，刀一下一下落，切好的一堆越来越多
function cut(g, f, look) {
  const [hx, hy] = pose(
    [
      [0, 34, 32],
      [1, 36, 37],
      [2, 35, 32],
      [3, 38, 37],
      [4, 37, 32],
      [5, 40, 37],
      [6, 39, 32],
      [7, 42, 37],
      [8, 41, 32],
      [9, 44, 37],
      [11, 36, 34],
    ],
    f,
  );
  g.rect(31, 40, 22, 2, P.t1).rect(33, 42, 2, 8, P.t3).rect(49, 42, 2, 8, P.t3);
  g.rect(34, 37, 16, 3, P.t0).hline(34, 49, 37, P.h0);
  g.ellipse(46, 36, 3.5, 2, P.g4).set(45, 35, P.g3);
  const shoulder = worker(g, { x: X, feet: FEET, at: [hx, hy], far: [45, 36], look });
  const tip = reach(shoulder, [hx, hy], 4);
  g.line(hx + 1, hy, tip[0] + 1, tip[1], P.s1).set(tip[0] + 2, tip[1], P.s0);
  for (let i = 0; i < Math.min(5, R(f / 2)); i++) g.set(37 + i, 36, i % 2 ? P.g4 : P.g5);
  finish(g);
}

// 蹲到灶口添柴、吹火
function stoke(g, f, look) {
  const [hx, hy] = pose(
    [
      [0, 30, 42],
      [3, 38, 45],
      [6, 40, 46],
      [8, 37, 44],
      [11, 34, 43],
    ],
    f,
  );
  worker(g, { x: X, feet: FEET, bend: 5, lean: 6, at: [hx, hy], look });
  if (f < 6) g.line(hx, hy, hx + 6, hy - 1, P.t3);
  finish(g);
}

// 翻炒：锅铲在锅里画小圈（锅是灶上本来就有的）
function stir(g, f, look) {
  const t = (f / 8) * Math.PI * 2;
  const hx = R(36 + Math.cos(t) * 3);
  const hy = R(33 + Math.sin(t) * 1.5);
  const shoulder = worker(g, { x: X, feet: FEET, lean: 2, at: [hx, hy], look });
  const tip = reach(shoulder, [hx, hy], 6);
  g.line(hx, hy, ...tip, P.t2).rect(tip[0], tip[1], 3, 2, P.s2);
  finish(g);
}

// 盛出来：端起一碗，冒着热气，收回到胸前
function serve(g, f, look) {
  const [hx, hy] = pose(
    [
      [0, 37, 34],
      [4, 37, 33],
      [8, 30, 36],
      [11, 29, 37],
    ],
    f,
  );
  worker(g, { x: X, feet: FEET, at: [hx, hy], far: [hx - 2, hy + 1], look });
  g.ellipse(hx + 2, hy - 1, 4, 2, P.l0)
    .hline(hx - 2, hx + 6, hy - 2, P.i2)
    .ellipse(hx + 2, hy - 3, 3, 1, P.l1);
  finish(g);
  const rise = f % 4;
  g.set(hx + 1, hy - 5 - rise, P.l2).set(hx + 3, hy - 7 - rise, P.l1);
}

/** 灶前几样活的帧。stir 会一直循环到被换掉。 */
export const KITCHEN_ACTS = {
  cut: { ...base, frames: 12, fps: 10, draw: cut },
  stoke: { ...base, frames: 12, fps: 8, draw: stoke },
  stir: { ...base, frames: 8, fps: 10, loop: true, draw: stir },
  serve: { ...base, frames: 12, fps: 8, draw: serve },
};
