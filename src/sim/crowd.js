// 有热闹的地方，村民绕过去围一圈（执行方案「集日有热闹」第 4 条）。各插件在自己的
// 'resident.positions' 接口里调 gather：从此刻在外头、爱凑热闹的人里挑几个，挪到那张图的围观站位上。
// 只改作息这一段的站位，不进存档；热闹散了，作息自己把人放回原处。
import { ON_MAP, mapOfPlace } from '../content/people.js';
import { CROWD } from '../content/crowd.js';
import { aiOf } from './deeds.js';

/**
 * 挑人、挪人。
 * @param {any} r      'resident.positions' 的结果（value、waiting、spots、doing）
 * @param {any} w      世界
 * @param {{place: string, spots: readonly string[], doing: string, max?: number, who?: string[]}} o
 *   place 去处（作息表里的叫法），spots 站位，who 给了就只挑这几个人（满院飘香时定好的那几位）
 * @returns {string[]} 挪过去的人
 */
export function gather(r, w, o) {
  const taken = new Set(Object.keys(r.spots));
  const free = id =>
    r.value[id] && r.waiting !== id && !taken.has(id) && mapOfPlace(r.value[id]) !== 'cottage';
  const lean = id => aiOf(w.persona?.[id]).social;
  const list = (
    o.who ||
    ON_MAP.filter(id => r.value[id] !== o.place && lean(id) > CROWD.min).sort(
      (a, b) => lean(b) - lean(a) || ON_MAP.indexOf(a) - ON_MAP.indexOf(b),
    )
  )
    .filter(free)
    .slice(0, Math.min(o.max ?? CROWD.max, o.spots.length));
  list.forEach((id, i) => {
    r.value[id] = o.place;
    r.spots[id] = o.spots[i];
    r.doing[id] = o.doing;
  });
  return list;
}

/** 「阿满、桂嫂」：画面上冒的那一句里的人名。 */
export const names = (/** @type {string[]} */ ids, /** @type {any} */ people) =>
  ids.map(id => people[id].name).join('、');
