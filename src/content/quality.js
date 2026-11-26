// 收成出彩：同一样收成，多半是寻常的，隔一阵出一回极品。只有数据；怎么抽在 sim/plugins/quality.js，
// 机会被什么加减由各插件接进 compute 'quality.chance'：地里的在 sim/land-care.js，本事和六项在
// sim/plugins/growth-perks.js。数先粗，等 M8 第 10 步的村志工具跑起来再调。

/**
 * 哪几样东西有极品：地里收的菜，钓上来的鱼，采到、翻到的能吃的野货，鸡下的蛋。
 * 桃胶照 G-08 没有极品：一块树胶看不出好坏，挑它不如挑别的。
 */
export const FINE_ITEMS = Object.freeze([
  'veg.qingcai',
  'chive',
  'cucumber',
  'longbean',
  'pumpkin',
  'radish',
  'cabbage',
  'fish.bleak',
  'fish.crucian',
  'fish.yellowcat',
  'fish.carp',
  'fish.grass',
  'fish.mandarin',
  'fish.sleeper',
  'fish.bream',
  'fish.culter',
  'fish.yellowtail',
  'fish.catfish',
  'shrimp',
  'crab',
  'herb',
  'shepherd',
  'shoot',
  'mushroom',
  'chestnut',
  'tea',
  'wildPeach',
  'mugwort',
  'malan',
  'berry',
  'brake',
  'snail',
  'mussel',
  'lotusPod',
  'caltrop',
  'earthEar',
  'egg',
]);

/** 极品的物品编号：原来的编号后面接 .fine。 */
export const fineId = id => id + '.fine';

/** 极品的基准价是寻常的几倍（卖价跟着翻）。买不到，只能自己收。 */
export const FINE_PRICE = 2;

/** 每样极品食材让火候宽多少（和切法、黄酒同一个尺度，见 sim/cuisine.js）。 */
export const FINE_HEAT = 3;

/** 出极品的机会，都是百分数：底子多少、最少多少、最多多少；连着没出，每一回再加多少。 */
export const FINE_CHANCE = Object.freeze({ base: 10, min: 2, max: 60, miss: 4 });

/**
 * 地里的几样怎么加减：地力比 5 每高一点加多少（低了照样减）；土润着、土干了、长了草、生了虫各多少。
 * 「润着」和「干了」的界限跟田地面板用的是同一份（content/items.js 的 SOIL）。
 */
export const FIELD_ODDS = Object.freeze({ fert: 2, moist: 6, dry: -5, weeds: -8, bugs: -8 });

/** 哪样活认哪门本事，每一级加多少。 */
export const SKILL_ODDS = Object.freeze({
  farm: { skill: 'farm', n: 2 },
  fish: { skill: 'forage', n: 2 }, // 钓鱼的经验记在采集上
  forage: { skill: 'forage', n: 2 }, // 采集点采的、路边翻到的
  egg: { skill: 'farm', n: 1 },
});

/** 哪样活认六项里的哪一项：比底子 4 每高一点加多少（低了照样减）。六项长得慢，每一点只加 1。 */
export const ATTR_ODDS = Object.freeze({
  farm: { attr: 'chijia', from: 4, n: 1 },
  forage: { attr: 'yueli', from: 4, n: 1 }, // 认得山货，挑得出好的
  egg: { attr: 'chijia', from: 4, n: 1 },
});

/** 头一回收到极品时，底下横着说的一句。 */
export const FIRST_FINE = '头一回收到{name}！卖价是寻常的两倍，下锅火候也好拿捏些。';

// 抽中极品后还可能是彩头，说的话在 content/prizes.js。
export { prizeLine } from './prizes.js';
