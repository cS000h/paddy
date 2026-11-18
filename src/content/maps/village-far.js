// 远一些的两张村路地图：河湾渡口、后山茶园。共用的底子和路口在 village-kit.js。
import { route, frame, edged, village } from './village-kit.js';

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
    ['barrels', 10, 11],
    ['firewood', 5, 10],
    ['trays', 9, 7],
    ['crates', 14, 16],
    ['sacks', 13, 17],
    ['bench', 9, 12],
    ['fern', 2, 6],
    ['fern', 2, 19],
    ['fern', 8, 20],
    ['rockPile', 6, 3],
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
    ['trays', 16, 6],
    ['trays', 10, 6],
    ['bench', 8, 6],
    ['firewood', 10, 19],
    ['rockPile', 8, 2],
    ['fern', 3, 8],
    ['fern', 24, 12],
    ['fern', 22, 18],
    ['fern', 5, 18],
    ['fern', 25, 8],
  ],
  { south: [12, 19, 'up'], 'yun.hill': [8, 9, 'up'] },
);
