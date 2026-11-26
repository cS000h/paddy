// 落脚单上那五项怎么换：「换一户」整张重抽，每行的左右箭头挨个换。只算，不碰随机数：
// 抽签用的 rand 由 app 给（正式玩用随机，调试和测试时开局固定是同一户）。
import { REASONS, KEEPSAKES, FAMILY, OLD_TIES } from '../content/settle.js';
import { TEMPERS } from '../content/traits.js';

export const SHEET_KEYS = Object.freeze(['reason', 'keepsake', 'family', 'own', 'friend']);
const LISTS = {
  reason: Object.keys(REASONS),
  keepsake: Object.keys(KEEPSAKES),
  family: Object.keys(FAMILY),
  own: Object.keys(TEMPERS),
  friend: Object.keys(OLD_TIES),
};

/** 调试和测试开局时的那一户：投奔石伯、带着旧镰、家里老辈行船（沉稳）、自己怕生。 */
export const FIRST_SHEET = Object.freeze({
  reason: 'oldfriend',
  keepsake: 'sickle',
  family: 'boat',
  own: 'shy',
  friend: 'shi',
});

const pairOf = family => TEMPERS[FAMILY[family].temper].pair;
/** 自己的性子不能和家里来的在同一对里；撞上了就往后挪到能用的那个。 */
function fit(sheet, dir = 1) {
  const s = { ...sheet };
  const tie = REASONS[s.reason].friend;
  if (tie) s.friend = tie;
  const list = LISTS.own;
  let i = list.indexOf(s.own);
  while (TEMPERS[list[i]].pair === pairOf(s.family)) i = (i + dir + list.length) % list.length;
  s.own = list[i];
  return s;
}

/** 整张重抽。家里的性情多半从缘由「更容易随家里来」的那几样里抽。rand() 给 [0, 1) 的数。 */
export function rollSheet(rand) {
  const pick = list => list[Math.floor(rand() * list.length)];
  const reason = pick(LISTS.reason);
  const likely = REASONS[reason].family;
  return fit({
    reason,
    keepsake: pick(LISTS.keepsake),
    family: likely.length && rand() < 0.7 ? pick(likely) : pick(LISTS.family),
    own: pick(LISTS.own),
    friend: pick(LISTS.friend),
  });
}

/** 这一行能不能换：缘由锁死了旧交情的，那一行不动。 */
export const locked = (sheet, key) => key === 'friend' && !!REASONS[sheet.reason].friend;

/** 一行往前或往后换一个。 */
export function cycleSheet(sheet, key, dir) {
  const list = LISTS[key];
  if (!list || locked(sheet, key)) return sheet;
  const step = dir < 0 ? -1 : 1;
  const next = list[(list.indexOf(sheet[key]) + step + list.length) % list.length];
  return fit({ ...sheet, [key]: next }, key === 'own' ? step : 1);
}
