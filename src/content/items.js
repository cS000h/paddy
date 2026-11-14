// 作物和工具的数据，以及物品总表的出口。只有数据，没有规则；数值都是游戏尺度，不是农事建议。
// 物品在 pantry.js；花多少体力在 actions.js。
export { ITEMS } from './pantry.js';

// 一格地的产量沿用像素版尺度；季节、成熟时间、留根再生来自0.12。
export const CROPS = Object.freeze({
  qingcai: {
    id: 'qingcai',
    name: '青菜',
    seed: 'seed.qingcai',
    produce: 'veg.qingcai',
    seasons: [0, 2],
    days: 3,
    stages: 4,
    yield: 1,
  },
  chive: {
    id: 'chive',
    name: '韭菜',
    seed: 'seedChive',
    produce: 'chive',
    seasons: [0, 1, 2],
    days: 3,
    stages: 4,
    yield: 1,
    regrow: 1,
  },
  cucumber: {
    id: 'cucumber',
    name: '黄瓜',
    seed: 'seedCuke',
    produce: 'cucumber',
    seasons: [1],
    days: 4,
    stages: 4,
    yield: 1,
    thirsty: true,
  },
  longbean: {
    id: 'longbean',
    name: '豆角',
    seed: 'seedBean',
    produce: 'longbean',
    seasons: [1, 2],
    days: 4,
    stages: 4,
    yield: 1,
  },
  pumpkin: {
    id: 'pumpkin',
    name: '南瓜',
    seed: 'seedPumpkin',
    produce: 'pumpkin',
    seasons: [0, 1, 2],
    days: 6,
    stages: 4,
    yield: 1,
  },
  radish: {
    id: 'radish',
    name: '萝卜',
    seed: 'seedRadish',
    produce: 'radish',
    seasons: [2, 3],
    days: 4,
    stages: 4,
    yield: 1,
  },
  cabbage: {
    id: 'cabbage',
    name: '白菜',
    seed: 'seedCabbage',
    produce: 'cabbage',
    seasons: [2, 3],
    days: 5,
    stages: 4,
    yield: 1,
    hardy: true,
  },
});

// 工具栏的顺序就是数字键 1–4 的顺序。
export const TOOLS = Object.freeze([
  { id: 'hoe', name: '锄头', verb: '锄地' },
  { id: 'seed', name: '菜种', verb: '播种' },
  { id: 'can', name: '水壶', verb: '浇水' },
  { id: 'hand', name: '采收', verb: '采收' },
]);

export const CAN_CAPACITY = 10;
export const ENERGY_MAX = 100;

/** 作物长到第几天时，显示第几个外观阶段。 */
export function cropStage(crop, age) {
  const def = CROPS[crop];
  if (age >= def.days) return def.stages - 1;
  return Math.min(def.stages - 2, Math.floor((age / def.days) * (def.stages - 1)));
}

export const isRipe = (crop, age) => age >= CROPS[crop].days;
