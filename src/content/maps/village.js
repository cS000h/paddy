// 小屋与村路。出入口显式指向另一张地图的落脚处，便于测试整张路网。
// 每张村路地图各有各的样子：溪边是竹林和弯溪，茶摊是老樟树下的广场和荷塘，村口是青石集场，
// 渡口是一大片河湾，后山是一层层茶垄。地面用 paint.js 的几支笔画；路口、柜台和乡邻的站位
// 是规则和作息认的地方，挪动之前先看 tests 和 people.js 的 ROUTINES。
import { canvas } from './paint.js';

function ground(w, h, paint) {
  const a = Array.from({ length: h }, () => Array(w).fill('.'));
  for (const [ch, x0, y0, x1, y1] of paint)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) a[y][x] = ch;
  return a.map(r => r.join(''));
}
const route = (x, y, to, arrival, label) => ['route', x, y, { to, arrival, label }];

/** 一张 28×22 的村路地图：四周是树丛，东西两头留出路口。 */
function frame() {
  return hedge(canvas(28, 22));
}

/** 四周的树丛：上下两边，左右两边只在大路口（第 13–16 行）留开。画完地面最后再补一遍。 */
function hedge(c) {
  return c
    .rect('#', 0, 0, 27, 1)
    .rect('#', 0, 21, 27, 21)
    .rect('#', 0, 2, 0, 12)
    .rect('#', 27, 2, 27, 12)
    .rect('#', 0, 17, 0, 20)
    .rect('#', 27, 17, 27, 20);
}

// 地面画完，四边的树丛再补一遍（林子、苔地会画到边上）；大路口那几行和水流出去的地方留着。
const edged = c => hedge(c);

const village = (id, name, paint, objects, spots = {}) => ({
  id,
  name,
  width: 28,
  height: 22,
  ground: paint.rows(),
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

// 溪边竹径：西北一大片竹林（林下是苔地），一道溪从东北弯弯曲曲流下来，两岸是沙滩，
// 土路过溪的地方搭着桥；一条小路穿过竹林往北上后山。
const CREEK_FLOW = [
  [20, 0],
  [19.5, 4],
  [21, 8],
  [19.5, 11.5],
  [21, 14.5],
  [20, 18],
  [21.5, 21],
];
export const creek = village(
  'creek',
  '溪边竹径',
  edged(
    frame()
      .rect('#', 0, 2, 27, 2)
      .blob('m', 6, 7.5, 6.5, 6)
      .blob('m', 7, 18, 4, 2.2)
      .stroke('a', CREEK_FLOW, 5)
      .stroke('w', CREEK_FLOW, 2.8)
      .stroke(
        'p',
        [
          [12, 3],
          [12, 6],
          [10.5, 9],
          [12.5, 12],
          [12, 14],
        ],
        1.7,
      )
      .rect('p', 0, 14, 27, 15)
      .rect('b', 19, 14, 22, 15)
      .rect('#', 19, 21, 23, 21)
      .rect('#', 0, 2, 27, 2)
      .rect('w', 19, 21, 21, 21),
  ),
  [
    route(1, 14, 'yard', 'creek.entry', '回小院'),
    route(26, 14, 'river', 'west', '沿溪去渡口'),
    route(12, 3, 'hill', 'south', '上后山'),
    ['bamboo', 3, 5],
    ['bamboo', 5, 4],
    ['bamboo', 7, 4],
    ['bamboo', 2, 8],
    ['bamboo', 4, 10],
    ['bamboo', 6, 7],
    ['bamboo', 9, 5],
    ['bamboo', 2, 12],
    ['bamboo', 6, 12],
    ['bamboo', 9, 11],
    ['bamboo', 15, 4],
    ['shootPatch', 8, 8, { station: 'bamboo', label: '溪径竹林' }],
    ['tree.willow', 17, 10],
    ['tree.willow', 24, 18],
    ['reeds', 17, 5],
    ['reeds', 23, 9],
    ['reeds', 23, 16],
    ['reeds', 17, 19],
    ['stones', 20, 6],
    ['stones', 21, 20],
    ['rock', 14, 19],
    ['rock', 15, 7],
    ['bush', 25, 5],
    ['bush', 3, 18],
    ['flowers', 13, 10],
    ['flowers', 10, 17],
    ['flowers', 25, 10],
    ['forage', 18, 17, { station: 'forage', label: '水边野菜' }],
    ['fishing', 19, 18, { station: 'fish', label: '竹影钓点' }],
  ],
  { south: [12, 4, 'down'], 'qiao.creek': [18, 15, 'up'], 'yun.creek': [18, 18, 'right'] },
);

// 樟树茶摊：老樟树底下一片夯土广场，摆着茶桌、棋桌、茶摊和点心摊，四角挂灯笼；
// 西边一道小河，过石桥回小院；南边一口荷塘、一块水田，小路往南通村口。
export const tea = village(
  'tea',
  '樟树茶摊',
  frame()
    .blob('p', 14, 10.5, 9, 4)
    .rect('p', 7, 8, 21, 13)
    .stroke(
      'w',
      [
        [4.5, 2],
        [4, 8],
        [5, 13],
        [4.5, 21],
      ],
      2.2,
    )
    .rect('s', 0, 14, 27, 15)
    .rect('b', 3, 14, 6, 15)
    .stroke(
      'p',
      [
        [14, 15],
        [13.5, 18],
        [14, 21],
      ],
      1.8,
    )
    .blob('a', 9, 18.4, 3.6, 2.2)
    .blob('w', 9, 18.4, 2.6, 1.5)
    .rect('r', 18, 17, 24, 19),
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
    ['jars', 16, 10],
    ['lantern', 7, 8],
    ['lantern', 22, 9],
    ['lantern', 7, 13],
    ['lantern', 22, 13],
    ['tree.broad', 24, 5],
    ['tree.willow', 3, 18],
    ['lotus', 8, 18],
    ['lotus', 10, 19],
    ['reeds', 12, 17],
    ['flowers', 25, 10],
    ['flowers', 16, 6],
    ['bush', 12, 4],
    ['rock', 6, 5],
    ['shrine', 20, 4, { text: '樟树后头一座小小的土地庙，香炉里还插着半截没烧完的香。' }],
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

// 村口杂货铺：铺子门前一片青石集场，挂着灯笼；路南一排摊棚，赶集的日子最热闹；
// 场边一口井、一辆板车、几垛草。
export const market = village(
  'market',
  '村口杂货铺',
  frame()
    .rect('s', 6, 9, 22, 13)
    .rect('s', 0, 14, 27, 15)
    .rect('s', 5, 16, 23, 19)
    .blob('p', 3, 18.5, 2, 1.5),
  [
    route(1, 14, 'yard', 'west', '回小院'),
    route(26, 14, 'tea', 'south', '去樟树茶摊'),
    ['house.gui', 14, 8, { text: '杂货铺的门开着。要买卖东西，到门前柜台看看。' }],
    ['marketCounter', 14, 10, { shop: 'market', label: '小乔照看的柜台' }],
    ['rack', 19, 10],
    ['jars', 10, 11],
    ['haystack', 22, 12],
    ['lantern', 6, 9],
    ['lantern', 22, 9],
    ['stall', 8, 18],
    ['stall', 14, 18],
    ['stall', 20, 18],
    ['cart', 24, 16],
    ['well', 4, 11],
    ['basket', 11, 16],
    ['tree.broad', 3, 6],
    ['tree.peach', 24, 6],
    ['tree.willow', 25, 19],
    ['flowers', 8, 6],
    ['flowers', 20, 6],
    ['bush', 26, 4],
    ['sign', 8, 12, { text: '每天开门，五日一集。傍晚时鲜便宜些，卖完便等明天。' }],
  ],
  {
    'aman.market': [12, 12, 'right'],
    'gui.market': [16, 12, 'up'],
    'qiao.market': [15, 11, 'left'],
  },
);

// 河湾渡口：东边一大片河湾，岸边是沙滩，一道石砌的码头伸进水里，系着渡船；
// 岸上晾着渔网，柳树底下有个歇脚的石桌，小路往北沿溪进竹径。
const RIVER_BANK = [
  [24, 0],
  [19, 5],
  [17, 10],
  [17.5, 16],
  [21, 21],
];
export const river = village(
  'river',
  '河湾渡口',
  frame()
    .rect('#', 27, 2, 27, 20)
    .stroke('a', RIVER_BANK, 5.5)
    .blob('w', 26, 11, 7.5, 13)
    .stroke(
      'w',
      RIVER_BANK.map(([x, y]) => [x + 3, y]),
      3,
    )
    .rect('s', 0, 14, 14, 15)
    .stroke(
      'p',
      [
        [12, 4],
        [11.5, 8],
        [13, 13],
      ],
      1.8,
    )
    .rect('b', 15, 13, 23, 15),
  [
    route(1, 14, 'tea', 'east', '去樟树茶摊'),
    route(12, 4, 'creek', 'east', '沿溪进竹径'),
    ['boat', 23, 17],
    ['fishing', 16, 18, { station: 'fish', label: '渡口钓点' }],
    ['tree.willow', 15, 9],
    ['tree.willow', 6, 18],
    ['tree.broad', 4, 5],
    ['netRack', 8, 10],
    ['table', 12, 10, { station: 'rest', label: '渡口歇脚处' }],
    ['reeds', 16, 6],
    ['reeds', 17, 20],
    ['reeds', 14, 18],
    ['reeds', 19, 3],
    ['lotus', 24, 6],
    ['lotus', 25, 19],
    ['rock', 10, 18],
    ['rock', 3, 12],
    ['jars', 14, 12],
    ['bush', 7, 4],
    ['flowers', 5, 15],
  ],
  {
    east: [22, 15, 'left'],
    'zhou.river': [15, 14, 'right'],
    north: [12, 5, 'down'],
  },
);

// 后山茶园：一层层的茶垄，石阶从山下曲曲折折爬上来，半山腰一座凉亭；
// 两边是松林（林下苔地），林边捡柴、采菌子、拾栗子；路边一座土地庙。
export const hill = village(
  'hill',
  '后山茶园',
  edged(
    frame()
      .rect('#', 0, 13, 0, 16)
      .rect('#', 27, 13, 27, 16)
      .blob('m', 4, 12, 4.5, 9)
      .blob('m', 23.5, 12, 4.5, 9)
      .rect('p', 6, 9, 21, 10)
      .rect('p', 6, 12, 21, 12)
      .rect('p', 6, 15, 21, 15)
      .stroke(
        's',
        [
          [12, 20],
          [12, 17],
          [14, 15],
          [12, 12],
          [14, 9],
          [13, 6],
        ],
        1.4,
      ),
  ),
  [
    route(12, 20, 'creek', 'south', '下山回竹径'),
    ['pavilion', 13, 5, { station: 'rest', label: '半山凉亭' }],
    ['teaBush', 7, 8, { station: 'tea', label: '云姑的茶垄' }],
    ['teaBush', 9, 8, { station: 'tea', label: '后山茶垄' }],
    ['teaBush', 17, 8, { station: 'tea', label: '后山茶垄' }],
    ['teaBush', 19, 8, { station: 'tea', label: '后山茶垄' }],
    ['teaBush', 7, 11, { station: 'tea', label: '后山茶垄' }],
    ['teaBush', 9, 11, { station: 'tea', label: '后山茶垄' }],
    ['teaBush', 17, 11, { station: 'tea', label: '后山茶垄' }],
    ['teaBush', 19, 11, { station: 'tea', label: '后山茶垄' }],
    ['teaBush', 7, 14, { station: 'tea', label: '后山茶垄' }],
    ['teaBush', 9, 14, { station: 'tea', label: '后山茶垄' }],
    ['teaBush', 17, 14, { station: 'tea', label: '后山茶垄' }],
    ['teaBush', 19, 14, { station: 'tea', label: '后山茶垄' }],
    ['mushroomPatch', 5, 16, { station: 'mushroom', label: '松林菌子' }],
    ['nutPatch', 21, 17, { station: 'chestnut', label: '山坡栗树' }],
    ['woodpile', 6, 5, { station: 'wood', label: '林中枯枝' }],
    ['tree.pine', 2, 7],
    ['tree.pine', 4, 13],
    ['tree.pine', 3, 19],
    ['tree.pine', 23, 9],
    ['tree.pine', 25, 14],
    ['tree.pine', 24, 19],
    ['tree.broad', 22, 4],
    ['rock', 16, 4],
    ['rock', 9, 18],
    ['rock', 25, 5],
    ['flowers', 11, 17],
    ['flowers', 16, 18],
    ['bush', 20, 20],
    ['shrine', 15, 19, { text: '石阶边一座土地庙，供着几颗山里摘的野果。' }],
  ],
  { south: [12, 19, 'up'], 'yun.hill': [8, 9, 'up'] },
);
