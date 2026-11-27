// 一道菜沾哪几样口味、一个人爱吃什么忌什么。纯运算，饭菜、送饭、饮食页共用。
import { ITEMS, kindOf } from '../content/pantry.js';
import { TASTES, TEMPER_TASTES, LINE_TASTES, VILLAGER_TASTES } from '../content/diet.js';

/** 一道菜（食材编号、调料编号）沾哪几样口味。 */
export function tastesOf(items, spices = []) {
  const kinds = items.map(kindOf),
    tags = new Set(kinds.flatMap(k => ITEMS[k]?.tags || [])),
    sp = new Set(spices);
  const found = {
    spicy: sp.has('chili'),
    sweet: tags.has('sweet') || sp.has('sugar'),
    sour: tags.has('sour') || sp.has('vinegar'),
    salty: tags.has('cured') || sp.has('soy'),
    umami: tags.has('umami') || tags.has('wild'),
    meaty: tags.has('meat'),
    plain:
      !tags.has('meat') &&
      !tags.has('cured') &&
      !tags.has('fishy') &&
      !sp.has('chili') &&
      !sp.has('soy'),
    fishy: tags.has('fishy') && !kinds.includes('ginger') && !sp.has('wine'),
    staple: tags.has('staple'),
    crisp: tags.has('crisp'),
    soft: tags.has('soft'),
  };
  return Object.keys(TASTES).filter(k => found[k]);
}

/** 一个人的口味：村民照定下的，主角照性情和出身线拼。 */
export function palateOf(id, record) {
  if (VILLAGER_TASTES[id]) return VILLAGER_TASTES[id];
  const likes = new Set(),
    dislikes = new Set(),
    clears = new Set();
  const take = t => {
    for (const k of t?.likes || []) likes.add(k);
    for (const k of t?.dislikes || []) dislikes.add(k);
    for (const k of t?.clears || []) clears.add(k);
  };
  for (const t of record?.tempers || []) take(TEMPER_TASTES[t]);
  if (record?.line) take(LINE_TASTES[record.line.id]);
  return {
    likes: [...likes].filter(k => !dislikes.has(k)),
    dislikes: [...dislikes].filter(k => !clears.has(k) && !likes.has(k)),
  };
}

/** 这道菜合不合这个人的口味：合口几样、忌口几样。 */
export function verdict(palate, items, spices) {
  const t = tastesOf(items, spices);
  return {
    liked: palate.likes.filter(k => t.includes(k)),
    disliked: palate.dislikes.filter(k => t.includes(k)),
  };
}
