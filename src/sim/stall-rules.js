// 集场摊子的几条算法（摊子是什么、卖什么收什么写在 content/stalls.js）。
// 只是算：今天哪几个摊子出来、各摆哪几样、还收几份、卖一份给多少钱。改世界的是 sim/plugins/market.js。
import { ITEMS } from '../content/items.js';
import { kindOf } from '../content/pantry.js';
import {
  STALLS,
  STALL_IDS,
  STALL_SPOTS,
  STALL_MIDDLE,
  STALL_TAKES,
  stallShop,
} from '../content/stalls.js';

/** 今天三个摊位上各是谁（摊子编号或 null）。平常只摆中间一个；集日摆满，鱼摊一定来。random() 给 0 到 1。 */
export function pickStalls(fair, random) {
  const out = Array(STALL_SPOTS).fill(null);
  const draw = pool => pool.splice(Math.floor(random() * pool.length), 1)[0];
  if (!fair) {
    out[STALL_MIDDLE] = draw(STALL_IDS.filter(id => !STALLS[id].fairOnly));
    return out;
  }
  const rest = STALL_IDS.filter(id => id !== 'fish');
  out[STALL_MIDDLE] = 'fish';
  for (let i = 0; i < STALL_SPOTS; i++) if (!out[i]) out[i] = draw(rest);
  return out;
}

/** 摊子今天摆哪几样：当季的、挑 count 样。add(shop, item, 少, 多) 把一样货摆上去。 */
export function layStall(id, { fair, season, random, add }) {
  const s = STALLS[id];
  const pool = s.wares.filter(item => !ITEMS[item].season || ITEMS[item].season.includes(season));
  const n = Math.min(pool.length, s.count[fair ? 1 : 0]);
  for (let i = 0; i < n; i++) {
    const item = pool.splice(Math.floor(random() * pool.length), 1)[0];
    add(stallShop(id), item, fair ? 2 : 1, fair ? 5 : 3);
  }
}

/** 这个摊子收不收这样东西（照类认：各种鱼都算鱼，极品照寻常那样）。 */
export const stallTakes = (id, item) => STALLS[id].takes.includes(kindOf(item));

/** 摊子今天还收几份原价、几份半价。took 是今天已经收了几份。 */
export function stallLeft(fair, took) {
  const cap = STALL_TAKES[fair ? 'fair' : 'normal'];
  return { full: Math.max(0, cap - took), half: Math.max(0, cap * 2 - Math.max(cap, took)) };
}

/** 卖 n 份给摊子能拿多少：原价收满了给半价，半价也收满了就不收（full）。 */
export function stallQuote(fair, took, item, n) {
  const cap = STALL_TAKES[fair ? 'fair' : 'normal'];
  if (took + n > cap * 2) return { value: 0, half: 0, full: true };
  const whole = Math.max(0, Math.min(n, cap - took));
  const half = n - whole;
  const price = ITEMS[item].sell;
  return { value: whole * price + half * Math.max(1, Math.floor(price / 2)), half, full: false };
}
