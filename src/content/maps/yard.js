// 第一张地图：借住的小院、门前的石板路、一块菜地、石伯的水田和东边的小溪。
// 地面用“一层层涂上去”的办法写：后面的矩形盖住前面的。坐标是格子，左上角是 (0,0)。

const W = 44;
const H = 32;

/** @type {[string, number, number, number, number][]} */
const paint = [
  // [字符, x0, y0, x1, y1]
  ['.', 0, 0, W - 1, H - 1],
  ['#', 0, 0, W - 1, 2], // 北边的树丛
  ['#', 0, H - 1, W - 1, H - 1], // 南边的树丛
  ['#', 0, 3, 0, 14], // 西边
  ['#', 0, 17, 0, H - 1],
  ['s', 0, 15, W - 1, 16], // 石板路，东西向
  ['p', 4, 10, 13, 13], // 院子里的泥地
  ['p', 8, 14, 9, 14], // 院门口
  ['p', 20, 17, 21, 26], // 去田里的土路
  ['f', 6, 19, 17, 25], // 自家的菜地
  ['r', 24, 19, 34, 25], // 石伯的水田
  ['p', 27, 10, 34, 13], // 桂嫂家门前
  ['p', 30, 14, 31, 14],
  ['w', 38, 0, 41, 5], // 小溪，从北往南，略有弯折
  ['w', 39, 6, 42, 11],
  ['w', 38, 12, 41, 19],
  ['w', 39, 20, 42, 26],
  ['w', 38, 27, 41, H - 1],
  ['w', 4, 27, 38, 27], // 田南边的水沟
  ['b', 38, 15, 41, 16], // 石桥
];

function ground() {
  const rows = Array.from({ length: H }, () => Array(W).fill('.'));
  for (const [ch, x0, y0, x1, y1] of paint)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) rows[y][x] = ch;
  return rows.map(row => row.join(''));
}

// 物件：[种类, 锚点格 x, y, 可选的附加数据]。锚点是物件“脚下”的那一格（房子是门的那一格）。
const fenceTop = [];
for (let y = 4; y <= 13; y++) fenceTop.push(['fence.v', 3, y], ['fence.v', 14, y]);
for (let x = 3; x <= 14; x++)
  if (x < 7 || x > 10) fenceTop.push(['fence.h', x, 14]);
  else if (x === 7 || x === 10) fenceTop.push(['gate.post', x, 14]);

const objects = [
  ['house.hero', 8, 9, { to: 'cottage', arrival: 'entry', label: '进小屋' }],
  ['house.gui', 30, 9],
  ...fenceTop,
  ['gate.arch', 7, 14],
  // 檐下一排：橱柜、（门）、灶台、水缸、腌菜坛
  ['cupboard', 6, 10],
  ['stove', 10, 10],
  ['vat', 12, 10],
  ['pickleJar', 13, 10, { station: 'pickle', label: '腌菜坛' }],
  // 院子里：桃树下的木墩、石桌、东南角的鸡窝
  ['tree.peach', 4, 10],
  ['workbench', 4, 12, { station: 'workbench', label: '木墩' }],
  ['table', 6, 12, { station: 'rest', label: '院里的石桌' }],
  ['coop', 13, 12, { station: 'coop', label: '院角的鸡窝' }],
  ['haystack', 16, 11],
  ['basket', 10, 13],
  ['flowers', 4, 13],
  ['flowers', 6, 13],
  ['flowers', 13, 13],
  ['well', 18, 18],
  ['scarecrow', 5, 21],
  ['tree.camphor', 22, 13],
  ['rack', 33, 11],
  ['jars', 28, 10],
  ['flowers', 27, 13],
  ['flowers', 34, 13],
  ['route', 42, 14, { to: 'tea', arrival: 'west', label: '去樟树茶摊' }],
  ['route', 2, 14, { to: 'market', arrival: 'west', label: '去村口杂货铺' }],
  ['route', 17, 4, { to: 'creek', arrival: 'west', label: '去溪边竹径' }],
  // 北边的林子：前后两排，围住院子
  ['tree.broad', 1, 3],
  ['bamboo', 3, 2],
  ['tree.broad', 6, 3],
  ['tree.pine', 10, 2],
  ['tree.broad', 13, 3],
  ['bamboo', 16, 3],
  ['tree.broad', 18, 2],
  ['tree.pine', 20, 4],
  ['tree.peach', 24, 4],
  ['tree.broad', 26, 2],
  ['bamboo', 28, 3],
  ['tree.broad', 31, 2],
  ['tree.broad', 35, 3],
  ['tree.willow', 36, 6],
  ['bamboo', 43, 4],
  ['forage', 36, 17, { station: 'forage', label: '溪边野菜' }],
  ['woodpile', 17, 6, { station: 'wood', label: '林边枯木' }],
  ['shootPatch', 16, 8, { station: 'bamboo', label: '竹林' }],
  ['mushroomPatch', 19, 7, { station: 'mushroom', label: '松针下的菌子' }],
  ['teaBush', 24, 7, { station: 'tea', label: '坡边茶垄' }],
  ['nutPatch', 26, 6, { station: 'chestnut', label: '栗子树下' }],
  ['fishing', 38, 20, { station: 'fish', label: '溪湾钓点' }],
  // 院外的零碎：晒着的簸箕、粮袋、柴垛、邻家门口的木桶木箱，路边的蕨和乱石
  ['trays', 17, 13],
  ['sacks', 15, 12],
  ['firewood', 18, 12],
  ['barrels', 34, 12],
  ['crates', 32, 13],
  ['trays', 3, 18],
  ['bench', 13, 17],
  ['fern', 8, 3],
  ['fern', 21, 4],
  ['fern', 36, 24],
  ['fern', 12, 29],
  ['rockPile', 12, 4],
  ['rockPile', 35, 22],
  // 溪边
  ['tree.willow', 37, 12],
  ['reeds', 37, 18],
  ['reeds', 38, 21],
  ['tree.willow', 37, 23],
  ['reeds', 37, 28],
  ['bamboo', 43, 9],
  ['tree.broad', 43, 19],
  ['bamboo', 43, 24],
  ['rock', 36, 18],
  // 西边和南边
  ['tree.broad', 1, 8],
  ['bush', 1, 12],
  ['tree.pine', 1, 19],
  ['tree.broad', 2, 23],
  ['bamboo', 1, 28],
  ['bamboo', 3, 29],
  ['bamboo', 5, 30],
  ['bamboo', 7, 29],
  ['rock', 9, 29],
  ['tree.broad', 12, 30],
  ['bush', 15, 29],
  ['tree.peach', 18, 30],
  ['tree.broad', 23, 30],
  ['bush', 26, 29],
  ['tree.pine', 29, 30],
  ['tree.broad', 33, 29],
  ['bush', 36, 30],
  ['bush', 16, 17],
  ['rock', 23, 18],
  ['reeds', 10, 26],
  ['reeds', 30, 26],
];

export const yard = Object.freeze({
  id: 'yard',
  name: '小院',
  width: W,
  height: H,
  ground: Object.freeze(ground()),
  objects: Object.freeze(objects),
  // 有名字的位置：作息表和开局位置用名字指过来。[x, y, 面朝方向]
  spots: Object.freeze({
    west: [2, 15, 'right'],
    east: [42, 15, 'left'],
    'creek.entry': [17, 5, 'down'],
    'aman.field': [20, 20, 'left'],
    'shi.yard': [8, 12, 'right'],
    'gui.yard': [30, 10, 'down'],
    start: [8, 11, 'down'],
    'hero.bed': [8, 10, 'down'],
    'shi.field': [23, 22, 'right'],
  }),
  // 自家的院子（篱笆以内）：[x0, y0, x1, y1]。站在这里面，才够得着家里存的东西
  home: Object.freeze([4, 10, 13, 13]),
});
