// 小屋与村路。出入口显式指向另一张地图的落脚处，便于测试整张路网。
function ground(w, h, paint) {
  const a = Array.from({ length: h }, () => Array(w).fill('.'));
  for (const [ch, x0, y0, x1, y1] of paint)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) a[y][x] = ch;
  return a.map(r => r.join(''));
}
const route = (x, y, to, arrival, label) => ['route', x, y, { to, arrival, label }];
const border = [
  ['#', 0, 0, 27, 2],
  ['#', 0, 21, 27, 21],
  ['s', 0, 14, 27, 15],
];
const map = (id, name, paint, objects, spots = {}) => ({
  id,
  name,
  width: 28,
  height: 22,
  ground: ground(28, 22, [...border, ...paint]),
  objects,
  spots: { west: [2, 15, 'right'], east: [25, 15, 'left'], ...spots },
});
export const cottage = {
  id: 'cottage',
  name: '借住的小屋',
  width: 20,
  height: 16,
  indoor: true,
  ground: ground(20, 16, [
    ['#', 0, 0, 19, 15],
    ['o', 2, 3, 17, 13],
    ['v', 2, 2, 17, 4],
    ['s', 9, 14, 10, 14],
  ]),
  home: [2, 5, 17, 14],
  objects: [
    ['bed', 4, 7],
    ['roomWindow', 6, 4],
    ['roomWindow', 14, 4],
    ['stove', 15, 7],
    ['cupboard', 12, 6],
    ['vat', 17, 8],
    ['bookshelf', 3, 10],
    ['table', 9, 9, { station: 'rest', label: '窗下饭桌' }],
    ['rug', 9, 11],
    ['jars', 16, 6],
    ['workbench', 15, 11, { station: 'workbench', label: '窗边小案' }],
    route(9, 14, 'yard', 'hero.bed', '回小院'),
  ],
  spots: { entry: [9, 13, 'up'], 'hero.bed': [5, 8, 'down'] },
};
export const creek = map(
  'creek',
  '溪边竹径',
  [
    ['w', 21, 0, 24, 21],
    ['b', 21, 14, 24, 15],
    ['p', 11, 3, 12, 13],
  ],
  [
    route(1, 14, 'yard', 'creek.entry', '回小院'),
    route(26, 14, 'river', 'west', '沿溪去渡口'),
    route(12, 3, 'hill', 'south', '上后山'),
    ['bamboo', 3, 5],
    ['bamboo', 7, 4],
    ['bamboo', 17, 7],
    ['bamboo', 4, 11],
    ['tree.willow', 19, 11],
    ['shootPatch', 8, 8, { station: 'bamboo', label: '溪径竹林' }],
    ['forage', 19, 17, { station: 'forage', label: '水边野菜' }],
    ['fishing', 20, 18, { station: 'fish', label: '竹影钓点' }],
    ['reeds', 20, 10],
    ['reeds', 25, 18],
    ['rock', 14, 19],
    ['flowers', 13, 10],
  ],
  { south: [12, 4, 'down'], 'qiao.creek': [18, 15, 'up'], 'yun.creek': [19, 18, 'right'] },
);
export const tea = map(
  'tea',
  '樟树茶摊',
  [['p', 7, 8, 21, 13]],
  [
    route(1, 14, 'yard', 'east', '过石桥回小院'),
    route(26, 14, 'river', 'west', '去河湾渡口'),
    route(14, 20, 'market', 'east', '去村口杂货铺'),
    ['tree.camphor', 9, 7],
    ['teaCounter', 17, 10, { station: 'tea', label: '樟树下的茶摊' }],
    ['table', 9, 11, { station: 'tea', label: '树下茶桌' }],
    ['table', 13, 12, { station: 'tea', label: '棋桌' }],
    ['marketCounter', 20, 12, { shop: 'tea', label: '茶点与集日摊子' }],
    ['basket', 19, 9],
    ['tree.broad', 24, 5],
    ['flowers', 5, 10],
    ['jars', 16, 10],
  ],
  {
    south: [14, 19, 'up'],
    'aman.tea': [20, 11, 'down'],
    'gui.tea': [12, 13, 'up'],
    'qiao.tea': [17, 11, 'up'],
    'yun.tea': [21, 13, 'left'],
    'zhou.tea': [10, 12, 'right'],
    'shi.tea': [12, 12, 'left'],
  },
);
export const market = map(
  'market',
  '村口杂货铺',
  [['p', 8, 9, 20, 13]],
  [
    route(1, 14, 'yard', 'west', '回小院'),
    route(26, 14, 'tea', 'south', '去樟树茶摊'),
    ['house.gui', 14, 8, { text: '杂货铺的门开着。要买卖东西，到门前柜台看看。' }],
    ['marketCounter', 14, 10, { shop: 'market', label: '小乔照看的柜台' }],
    ['rack', 19, 10],
    ['jars', 10, 11],
    ['haystack', 21, 12],
    ['tree.broad', 4, 6],
    ['tree.peach', 23, 6],
    ['sign', 8, 12, { text: '每天开门，五日一集。傍晚时鲜便宜些，卖完便等明天。' }],
  ],
  {
    'aman.market': [12, 12, 'right'],
    'gui.market': [16, 12, 'up'],
    'qiao.market': [15, 11, 'left'],
  },
);
export const river = map(
  'river',
  '河湾渡口',
  [
    ['w', 17, 0, 27, 21],
    ['b', 15, 13, 23, 15],
    ['p', 10, 7, 14, 13],
  ],
  [
    route(1, 14, 'tea', 'east', '去樟树茶摊'),
    route(12, 4, 'creek', 'east', '沿溪进竹径'),
    ['boat', 23, 17],
    ['fishing', 16, 18, { station: 'fish', label: '渡口钓点' }],
    ['tree.willow', 15, 9],
    ['reeds', 16, 6],
    ['reeds', 16, 19],
    ['rock', 10, 18],
    ['table', 12, 10, { station: 'rest', label: '渡口歇脚处' }],
  ],
  {
    east: [22, 15, 'left'],
    'zhou.river': [15, 14, 'right'],
    north: [12, 5, 'down'],
  },
);
export const hill = map(
  'hill',
  '后山茶园',
  [
    ['p', 12, 3, 13, 20],
    ['p', 7, 9, 20, 10],
  ],
  [
    route(12, 20, 'creek', 'south', '下山回竹径'),
    ['teaBush', 7, 8, { station: 'tea', label: '云姑的茶垄' }],
    ['teaBush', 9, 8, { station: 'tea', label: '后山茶垄' }],
    ['teaBush', 17, 8, { station: 'tea', label: '后山茶垄' }],
    ['teaBush', 19, 8, { station: 'tea', label: '后山茶垄' }],
    ['teaBush', 7, 11, { station: 'tea', label: '后山茶垄' }],
    ['teaBush', 9, 11, { station: 'tea', label: '后山茶垄' }],
    ['teaBush', 17, 11, { station: 'tea', label: '后山茶垄' }],
    ['teaBush', 19, 11, { station: 'tea', label: '后山茶垄' }],
    ['mushroomPatch', 5, 16, { station: 'mushroom', label: '松林菌子' }],
    ['nutPatch', 21, 16, { station: 'chestnut', label: '山坡栗树' }],
    ['woodpile', 6, 5, { station: 'wood', label: '林中枯枝' }],
    ['tree.pine', 4, 14],
    ['tree.pine', 22, 13],
    ['tree.broad', 23, 5],
    ['rock', 15, 5],
    ['flowers', 11, 17],
  ],
  { south: [12, 19, 'up'], 'yun.hill': [8, 9, 'up'] },
);
