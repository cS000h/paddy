// 物品、作物、工具的数据。只有数据，没有规则；数值都是游戏尺度，不是农事建议。

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

export const ITEMS = Object.freeze({
  'seed.qingcai': { id: 'seed.qingcai', name: '青菜种子', kind: 'seed', crop: 'qingcai', buy: 2 },
  'veg.qingcai': { id: 'veg.qingcai', name: '青菜', kind: 'produce', sell: 6 },
});

// 工具栏的顺序就是数字键 1–4 的顺序。
export const TOOLS = Object.freeze([
  { id: 'hoe', name: '锄头', verb: '锄地', energy: 4 },
  { id: 'seed', name: '菜种', verb: '播种', energy: 1 },
  { id: 'can', name: '水壶', verb: '浇水', energy: 2 },
  { id: 'hand', name: '采收', verb: '采收', energy: 1 },
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
