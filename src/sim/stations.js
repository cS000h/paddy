// 每个地点有走得到的物件；命令、提示用同一份距离检查。
import { MAPS, actAt } from '../content/maps/index.js';
import { near } from './plugins/people.js';
export function atStation(w, people, station, at = null) {
  const p = people.me(w),
    here = at || p;
  return MAPS[p.map].objects.some(([kind, x, y]) => {
    const thing = actAt(MAPS[p.map], x, y);
    return thing?.station === station && near(here, { x, y });
  });
}
