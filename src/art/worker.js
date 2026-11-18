// 做活的人：侧身朝右，脚踩一个固定点，按弯腰、前探、手的位置摆出姿势。
// 头和肩取走路那张纸娃娃的侧面（personFrame），身子、胳膊、腿在这里按姿势现画，颜色跟着外观走。
// 原型是「稻_院中日常」里 Astra 画撒谷、拾蛋、编篮用的那个小人，这里做成各种活计共用的。
import { Grid } from './pixel.js';
import { P, SHADOW } from './palette.js';
import { personFrame, lookColors } from './people.js';

const R = Math.round;

/** 关键帧插值：keys 是 [[帧号, a, b, …], …]（帧号从小到大），返回第 frame 帧的 [a, b, …]，取整。 */
export function pose(keys, frame) {
  for (let i = 1; i < keys.length; i++) {
    const [t, ...b] = keys[i];
    if (frame > t) continue;
    const [start, ...a] = keys[i - 1];
    const u = (frame - start) / (t - start);
    return a.map((v, j) => R(v + (b[j] - v) * u));
  }
  return keys.at(-1).slice(1);
}

const heads = new Map();
function head(look) {
  if (!heads.has(look))
    heads.set(look, new Grid(16, 18).blit(personFrame(look, 'right', 'stand'), 0, 0));
  return heads.get(look);
}

/** 一只手：两像素见方。 */
export function hand(g, x, y) {
  g.rect(x, y, 2, 2, P.k1).set(x, y, P.k0);
}

function arm(g, C, shoulder, elbow, at, far) {
  g.line(...shoulder, ...elbow, C.sash).line(...elbow, ...at, C.shade);
  g.line(shoulder[0], shoulder[1] - 1, elbow[0], elbow[1] - 1, far ? C.shade : C.cloth);
  g.line(elbow[0], elbow[1] - 1, at[0], at[1] - 1, far ? C.shade : C.cloth);
  hand(g, ...at);
}

/**
 * 画一个做活的人。
 * @param {Grid} g
 * @param {{x: number, feet: number, bend?: number, lean?: number, at: number[],
 *   sitting?: boolean, far?: number[] | null, look?: string}} o
 *   x 脚的横坐标，feet 脚底那一行；bend 屈膝时骨盆往下沉几像素；lean 上身往前探几像素；
 *   at 前手的位置；sitting 坐着（腿往前伸）；far 后手的位置（不给就不画）；look 外观。
 * @returns 肩膀的位置 [x, y]，拿工具时用得着
 */
export function worker(g, o) {
  const { x, feet, bend = 0, lean = 0, at, sitting = false, far = null, look = 'hero' } = o;
  const C = lookColors(look);
  const hip = feet - 8 + bend - (sitting ? 1 : 0);
  const shoulder = [x + lean, hip - 8];
  g.ellipse(x + 1, feet + 1, 6, 1.4, SHADOW);
  for (const side of [-2, 1]) {
    const knee = x + side + (sitting ? 6 : bend);
    const ankle = sitting ? x + side + 5 : x + side;
    g.poly(
      [
        [x + side - 2, hip - 1],
        [x + side + 2, hip - 1],
        [knee + 2, hip + 2],
        [ankle + 1, feet - 1],
        [ankle - 1, feet - 1],
        [knee - 1, hip + 3],
      ],
      C.pants,
    );
    g.hline(ankle - 1, ankle + 3, feet, C.shoe);
  }
  if (far) arm(g, C, shoulder, [x + 5, hip - 3], far, true);
  for (let j = 0; j < 9; j++) {
    const left = x - 4 + R((lean * (8 - j)) / 8);
    g.hline(left, left + 7, hip - 9 + j, C.cloth).set(left, hip - 9 + j, C.sash);
  }
  g.hline(x - 3, x + 3, hip - 2, C.sash);
  g.blit(head(look), shoulder[0] - 8, hip - 25);
  const elbow = [R((shoulder[0] + at[0]) / 2) - 1, Math.max(shoulder[1] + 3, at[1] - 1)];
  arm(g, C, shoulder, elbow, at, false);
  return shoulder;
}

/** 从手 at 顺着肩→手的方向伸出去 len 像素，返回末端。 */
export function reach(shoulder, at, len) {
  const dx = at[0] - shoulder[0];
  const dy = at[1] - shoulder[1];
  const d = Math.hypot(dx, dy) || 1;
  return [R(at[0] + (dx / d) * len), R(at[1] + (dy / d) * len)];
}

/** 一帧画好以后描边（花草碎屑这类不描的，等描完再画上去）。 */
export const finish = g => g.outline(P.ink1);
