// 乡邻买卖和以物易物（规则在 sim/plugins/neighbors.js）。
// 占位稿：等 G-32 回稿（六户各想要什么、拿什么换、说的话）再换。规则只认这里的数。
//   wants 这户平时会想要的东西（照 kindOf 比：写 fish 就是各种鱼都要）；每天从里头挑 perDay 样
//   swap  拿什么换：{item 他家给的, n 给几份}；buys 为 false 的只换不买（手头没闲钱）
export const NEIGHBOR_RULES = Object.freeze({ perDay: 2, dealsPerDay: 2 });

// prettier-ignore
export const NEIGHBORS = Object.freeze({
  shi:  { wants: ['wood', 'straw', 'pinecone', 'shoot', 'cake'], swap: { item: 'seed.qingcai', n: 3 } },
  gui:  { wants: ['veg.qingcai', 'cabbage', 'radish', 'chive', 'mugwort', 'salt'], swap: { item: 'egg', n: 1 } },
  aman: { wants: ['cake', 'egg', 'strip', 'straw'], swap: { item: 'cake', n: 1 } },
  qiao: { wants: ['pebble', 'chestnut', 'mushroom', 'mugwort'], swap: { item: 'salt', n: 1 }, buys: false },
  zhou: { wants: ['fish', 'shrimp', 'snail', 'cake', 'herb'], swap: { item: 'fish.crucian', n: 1 } },
  yun:  { wants: ['herb', 'mushroom', 'chestnut', 'pinecone', 'mugwort'], swap: { item: 'tea', n: 1 } },
});

// 占位的话，{item} 是东西的名字，{coins} 是钱数，{give} 是换给你的东西。
export const NEIGHBOR_WORDS = Object.freeze({
  wants: '“今天要是有{items}，我收一点。”',
  none: '“今天家里什么都不缺。”',
  sold: '“{item}正好用得上，给你{coins}文。”',
  swapped: '“拿{give}跟你换，划算吧？”',
  broke: '手头没那么多现钱',
  done: '今天已经和他做过两回买卖了',
  notWanted: '他今天不要这个',
  far: '走到他跟前再说',
});
