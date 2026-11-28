// 小屋与村路。出入口显式指向另一张地图的落脚处，便于测试整张路网。
// 每张村路地图各有各的样子：溪边是竹林和弯溪，茶摊是老樟树下的广场和荷塘，村口是青石集场，
// 渡口和后山在 village-far.js。地面用 paint.js 的几支笔画；路口、柜台和乡邻的站位
// 是规则和作息认的地方，挪动之前先看 tests 和 people.js 的 ROUTINES。
import { ground, route, frame, edged, village } from './village-kit.js';

export const cottage = {
  id: 'cottage',
  name: '借住的小屋',
  width: 20,
  height: 16,
  indoor: true,
  // 屋外留白；后墙三格高；橱柜脚下铺石板，其余是浅色木地板；门口一道石阶
  ground: ground(20, 16, [
    ['x', 0, 0, 19, 15],
    ['o', 2, 5, 17, 13],
    ['q', 11, 5, 13, 6],
    ['v', 2, 2, 17, 4],
    ['s', 9, 14, 10, 14],
  ]),
  home: [2, 5, 17, 14],
  objects: [
    ['bed', 4, 7],
    ['roomWindow', 6, 4],
    ['roomWindow', 14, 4],
    ['sill', 14, 4],
    ['scroll', 10, 4],
    ['dresser', 8, 4, { label: '小屋衣镜' }],
    ['hangings', 17, 4],
    ['cupboard', 12, 6],
    ['bookshelf', 15, 7],
    [
      'table',
      9,
      9,
      { station: 'rest', label: '窗下饭桌', look: 'wood', oilLamp: true, dining: true },
    ],
    ['rug', 5, 9],
    ['jars', 16, 6],
    ['stool', 10, 10],
    ['stool', 15, 8],
    ['route', 9, 14, { to: 'yard', arrival: 'hero.bed', label: '回小院', look: 'door' }],
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
    ['fern', 13, 5],
    ['fern', 14, 11],
    ['fern', 8, 17],
    ['fern', 9, 19],
    ['rockPile', 16, 12],
    ['rockPile', 25, 19],
    ['firewood', 13, 8],
    ['trays', 15, 17],
    ['bench', 24, 12],
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
    ['stool', 8, 11],
    ['stool', 12, 12],
    ['stool', 15, 12],
    ['barrels', 23, 9],
    ['crates', 23, 11],
    ['sacks', 24, 12],
    ['trays', 15, 3],
    ['firewood', 21, 6],
    ['fern', 2, 3],
    ['fern', 2, 9],
    ['fern', 25, 18],
    ['rockPile', 25, 3],
  ],
  {
    south: [14, 19, 'up'],
    'aman.tea': [20, 11, 'down'],
    'gui.tea': [15, 12, 'left'],
    'qiao.tea': [17, 11, 'up'],
    'yun.tea': [21, 13, 'left'],
    'zhou.tea': [8, 11, 'right'],
    'shi.tea': [12, 12, 'right'],
  },
);

// 村口杂货铺：铺子门前一片青石集场，挂着灯笼；路南一排摊棚，赶集的日子最热闹；
// 柜台右手边一架布摊，挂着成衣；场边一口井、一辆板车、几垛草。
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
    ['clothRack', 19, 10, { label: '布摊：成衣和头绳' }],
    ['jars', 10, 11],
    ['haystack', 22, 12],
    ['lantern', 6, 9],
    ['lantern', 22, 9],
    ['stall', 8, 18, { spot: 0 }],
    ['stall', 14, 18, { spot: 1 }],
    ['stall', 20, 18, { spot: 2 }],
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
    ['barrels', 18, 9],
    ['sacks', 10, 9],
    ['crates', 11, 18],
    ['sacks', 17, 18],
    ['stool', 6, 19],
    ['trays', 4, 7],
    ['trays', 22, 6],
    ['firewood', 3, 9],
    ['bench', 24, 10],
    ['fern', 2, 3],
    ['fern', 25, 2],
    ['rockPile', 2, 17],
  ],
  {
    'aman.market': [12, 12, 'right'],
    'gui.market': [16, 12, 'up'],
    'qiao.market': [15, 11, 'left'],
    // 云姑出摊时站在自己摊子左手边（三个摊位从西往东）
    'yun.stall0': [6, 18, 'right'],
    'yun.stall1': [12, 18, 'right'],
    'yun.stall2': [18, 18, 'right'],
  },
);
