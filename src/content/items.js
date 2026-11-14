// 作物和工具的数据，以及物品总表的出口。只有数据，没有规则；数值都是游戏尺度，不是农事建议。
// 物品在 pantry.js；花多少体力在 actions.js。
export { ITEMS } from './pantry.js';

export const CROPS = Object.freeze({
  qingcai: {
    id: 'qingcai',
    name: '青菜',
    seed: 'seed.qingcai',
    produce: 'veg.qingcai',
    days: 3, // 需要浇过水的 3 个早晨
    stages: 4, // 外观阶段：下种、出苗、长叶、成熟
    yield: 1,
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
