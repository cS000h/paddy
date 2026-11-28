// 饭桌（G-36 回稿，第 5 步前半）：热菜端在手上，摆上屋里窗下饭桌，坐下按整桌算一顿。
// 规则在 sim/plugins/table.js（手上、桌上）和 sim/plugins/cooking.js（端起、坐下吃）。
//   hands  手上一次端几样（开局没有托盘，一次端一样；托盘在第 5 步后半）
//   seats  桌上一次摆几样（换桌子摆几样也在后半）
export const TABLE = Object.freeze({ hands: 1, seats: 4 });

// 能随手吃、能装进行囊的熟食（G-36 第二节、审稿定的做法 A）：带皮干爽的烤物、茶。
// 其余热菜、汤羹、粥、拌菜都得端上桌吃。按菜谱名认（菜名前头的「焦边」「拿手」不算）。
export const HANDHELD = Object.freeze([
  '烤栗子',
  '糖烤栗子',
  '炭烤土豆',
  '香草烤土豆',
  '烤南瓜',
  '糖烤芋头',
  '茶叶蛋',
  '姜茶',
  '香草茶',
]);
export const handheld = dish => HANDHELD.includes(dish.base);

// prettier-ignore
export const TABLE_LINES = Object.freeze({
  // 放下时：桌上原来空着、已有一样、摆到三四样
  set: [
    '热盘子稳稳落了桌，屋里顿时有了饭香。',
    '凑成两样，看着就比单吃一碗踏实。',
    '满满当当摆了一桌，倒像过节的架势。',
  ],
  // 坐下吃，按桌上搭配
  meal: {
    one: '一菜一饭，热乎乎填饱肚子最实在。',
    two: '两碟小菜换着夹，不紧不慢吃得顺口。',
    meatVeg: '一荤一素搭得巧，油水清淡两不误。',
    soup: '先喝两口热汤顺顺气，浑身都松快了。',
    full: '桌上有菜有肉又有汤，这一顿吃得周全。',
    same: '满桌都是老熟面孔，吃着总觉少了点新鲜。',
    veg: '清清淡淡几样时蔬，嘴里倒落个清爽。',
  },
  // 想在外面吃热菜被挡住：带汤的、炒的
  outside: {
    soup: '滚烫带汤的一海碗，站路边没法下筷，端回屋里坐着吃吧。',
    plate: '这一盘热菜油亮亮的，揣着走准撒一身，回家放桌上吃踏实。',
  },
  pack: '热菜装进行囊准洒一包，端在手上走吧。',
  hands: '手上已经端着一样了，先放下再端。',
  full: '桌上摆满了，先吃了这一桌再端。',
  empty: '桌上还空着，先去院里灶台端一样来。',
  nothing: '手上没端着菜。',
  where: '走到屋里窗下饭桌边才好放。',
});

/** 坐下吃这一桌，旁白挑哪一句。dishes 是桌上的几样。 */
export function mealLine(dishes) {
  const L = TABLE_LINES.meal;
  if (dishes.length === 1) return L.one;
  if (dishes.every(d => d.base === dishes[0].base)) return L.same;
  const soup = dishes.some(d => d.method === 'stew');
  const meat = dishes.some(d => d.meat);
  const veg = dishes.some(d => !d.meat);
  if (soup && meat && veg) return L.full;
  if (soup) return L.soup;
  if (meat && veg) return L.meatVeg;
  if (!meat) return L.veg;
  return L.two;
}
