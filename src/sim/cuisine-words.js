// 没有菜谱的组合怎么起名（G-30 五.1）：先排谁当主料、谁当配料，再按做法和几样拼，调料的前缀最后加。
// 原来是照放的顺序硬拼（「鱼炒蛋」「鸡萝卜汤」），现在荤的当主料、素的在前，像人说的话。
// I 是查物品的函数（同 cuisine-name.js）。

// 排位：肉 > 带腥的水产 > 蛋豆腐豆子 > 块茎菌笋瓜茄 > 叶菜野货 > 佐料
const HEAVY = ['potato', 'taro', 'pumpkin', 'radish', 'shoot', 'mushroom', 'chestnut', 'tomato'];
const HEAVY2 = ['lotusPod', 'caltrop', 'earthEar', 'cabbage'];
const SOFT_MEAT = ['egg', 'tofu', 'bean'];
const SEASONING = ['ginger', 'herb', 'mugwort', 'tea'];
const FRUITY = ['berry', 'wildPeach', 'peachGum', 'lotusPod'];
const rank = (k, I) =>
  I(k).tags.includes('meat')
    ? 0
    : I(k).tags.includes('fishy') || k === 'shrimp'
      ? 1
      : SOFT_MEAT.includes(k)
        ? 2
        : HEAVY.includes(k) || HEAVY2.includes(k)
          ? 3
          : SEASONING.includes(k)
            ? 5
            : 4;

/** 照排位排好的食材（同位的照放的顺序）。 */
export const ranked = (items, I) =>
  items
    .map((k, i) => [k, i])
    .sort((a, b) => rank(a[0], I) - rank(b[0], I) || a[1] - b[1])
    .map(([k]) => k);

const animal = (k, I) => rank(k, I) <= 1;

export function plainName(items, method, I) {
  const sh = k => I(k)?.short || I(k)?.name || k;
  const rice = items.includes('rice');
  const list = ranked(
    items.filter(k => k !== 'rice'),
    I,
  );
  const [a, b, c] = list;
  const A = a && sh(a),
    B = b && sh(b),
    C = c && sh(c);
  const n = list.length;
  if (method === 'stew') {
    if (rice) return n === 0 ? '白粥' : n === 1 ? `${A}粥` : `${A}${B}粥`;
    if (n === 1) return FRUITY.includes(a) ? `${A}甜羹` : rank(a, I) <= 2 ? `清炖${A}` : `清煮${A}`;
    if (n === 2) {
      if (rank(a, I) === 0) return `${B}炖${A}`;
      if (a === 'fish') return `${B}鱼汤`;
      if (animal(a, I)) return `${B}炖${A}`;
      if (a === 'egg') return `${B}蛋花汤`;
      if (FRUITY.includes(a) || FRUITY.includes(b)) return `${A}${B}甜汤`;
      return [a, b].some(k => I(k).tags.includes('staple')) ? `${A}${B}煲` : `${A}${B}汤`;
    }
    if (animal(a, I) && animal(b, I)) return '水陆鲜煲';
    if (animal(a, I) && [b, c].includes('shoot') && [b, c].includes('mushroom'))
      return `山菌鲜笋炖${A}`;
    if (animal(a, I)) return `${B}${C}炖${A}`.length <= 5 ? `${B}${C}炖${A}` : `三鲜炖${A}`;
    return '田园杂蔬汤';
  }
  if (method === 'fry') {
    if (rice) return n === 0 ? '炒米饭' : n === 1 ? `${A}炒饭` : '什锦炒饭';
    if (n === 1) return a === 'egg' ? '滑炒鸡蛋' : animal(a, I) ? `爆炒${A}` : `清炒${A}`;
    if (n === 2) {
      if (animal(a, I) && b === 'egg') return `${A}${a === 'fish' ? '片' : ''}滑蛋`;
      if (b === 'egg' || a === 'egg') return `${a === 'egg' ? B : A}炒蛋`;
      if (rank(a, I) <= 2) return `${B}炒${A}`;
      // 两样素的：带汁的在前，叫「烧」
      const juicy = [a, b].find(k => I(k).tags.includes('sour')) || a;
      const other = juicy === a ? b : a;
      return `${sh(juicy)}烧${sh(other)}`;
    }
    if (a === 'egg') return `${B}${C}炒蛋`.length <= 6 ? `${B}${C}炒蛋` : '什锦炒蛋';
    if (rank(a, I) <= 2) return `${B}${C}炒${A}`.length <= 5 ? `${B}${C}炒${A}` : `农家小炒${A}`;
    return '家常素三鲜';
  }
  if (method === 'roast') {
    if (rice) return n === 0 ? '炭烤饭团' : `${A}烤饭团`;
    if (n === 1) return `炭烤${A}`;
    if (n === 2) return animal(a, I) && rank(b, I) >= 3 ? `${B}煨烤${A}` : `炭烤${A}拼${B}`;
    return '农家炭烤拼盘';
  }
  // 拌
  if (n === 1) return `凉拌${A}`;
  if (n === 2) {
    const fruit = [a, b].find(k => FRUITY.includes(k));
    if (fruit) return `${sh(fruit)}酸甜${sh(fruit === a ? b : a)}`;
    return `${B}拌${A}`;
  }
  return '爽口什锦拌';
}
