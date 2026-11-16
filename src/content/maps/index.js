// 地图查询。规则和画面都从这里问“这一格是什么”，所以两边不会各有一套说法。
import { GROUND, OBJECTS } from './kinds.js';
import { cottage, creek, tea, market, river, hill } from './village.js';
import { yard } from './yard.js';

export { GROUND, OBJECTS };
export const MAPS = Object.freeze({ yard, cottage, creek, tea, market, river, hill });
export const START_MAP = 'yard';

const key = (x, y) => `${x},${y}`;
const cache = new Map();

/** 每张地图算一次：哪些格被物件占了，哪些格旁边能互动。 */
function index(map) {
  if (cache.has(map.id)) return cache.get(map.id);
  const blocked = new Set();
  const acts = new Map();
  for (const [kind, ax, ay, data] of map.objects) {
    const def = OBJECTS[kind];
    if (!def) throw new Error(`地图 ${map.id} 用了没登记的物件：${kind}`);
    if (def.foot) {
      const [dx0, dy0, dx1, dy1] = def.foot;
      for (let y = ay + dy0; y <= ay + dy1; y++)
        for (let x = ax + dx0; x <= ax + dx1; x++) blocked.add(key(x, y));
    }
    if (def.act) acts.set(key(ax, ay), { act: def.act, kind, x: ax, y: ay, ...(data || {}) });
  }
  const result = { blocked, acts };
  cache.set(map.id, result);
  return result;
}

export const inside = (map, x, y) => x >= 0 && y >= 0 && x < map.width && y < map.height;

/** 这一格的地面种类；出界算树丛。 */
export function groundAt(map, x, y) {
  return inside(map, x, y) ? GROUND[map.ground[y][x]] : GROUND['#'];
}

/** 人能不能站在这一格。 */
export function walkable(map, x, y) {
  return groundAt(map, x, y).walk === true && !index(map).blocked.has(key(x, y));
}

/** 这一格能不能锄：得是菜地，而且没被东西占着。 */
export function farmable(map, x, y) {
  return groundAt(map, x, y).farm === true && !index(map).blocked.has(key(x, y));
}

/** 这一格能不能打水：水面、水田，或者水缸、水井。 */
export function waterSource(map, x, y) {
  return groundAt(map, x, y).water === true || index(map).acts.get(key(x, y))?.act === 'water';
}

/** 这一格的水能不能喝、是哪种水：'well' | 'vat' | 'creek'；不能喝是 null。水田的水不能喝。 */
export function drinkSource(map, x, y) {
  const thing = index(map).acts.get(key(x, y));
  return (thing && OBJECTS[thing.kind].drink) || groundAt(map, x, y).drink || null;
}

/** 这一格在不在自家院子里（在院里才够得着家里存的东西）。 */
export function isHome(map, x, y) {
  if (!map.home) return false;
  const [x0, y0, x1, y1] = map.home;
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

/** 这一格上可以互动的物件（门、水缸、橱柜、收菜筐、路牌），没有就是 null。 */
export function actAt(map, x, y) {
  return index(map).acts.get(key(x, y)) || null;
}

/** 有名字的位置 → {x, y, dir}。 */
export function spot(map, name) {
  const found = map.spots[name];
  if (!found) throw new Error(`地图 ${map.id} 没有叫 ${name} 的位置`);
  return { x: found[0], y: found[1], dir: found[2] };
}
