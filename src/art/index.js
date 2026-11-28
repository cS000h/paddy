// 素材总表：名字 → 小图。画面只按名字取图，所以以后把某张程序画的图换成手绘的图，
// 只要在这里换掉它的来源，别处不用动。
import { indoors, indoorLooks } from './indoors.js';
import { Grid } from './pixel.js';
import { P, SHADOW } from './palette.js';
import { house } from './house.js';
import {
  broadTree,
  camphorTree,
  peachTree,
  willowTree,
  pineTree,
  bambooGrove,
  bush,
} from './trees.js';
import { wildProps, wildLooks } from './wild.js';
import { stove, bookshelf } from './kitchen.js';
import * as props from './props.js';
import * as landmarks from './landmarks.js';
import { stallLook, STALL_LOOKS } from './stalls.js';
import * as waterside from './waterside.js';
import * as village from './props-village.js';
import * as traces from './traces.js';
import { critters } from './critters.js';
import { soilTile, cropFrames, cursor, icon } from './tiles.js';
import { personFrame, personSheet, LOOK_NAMES, FRAME_W, FRAME_H, POSES, DIRS } from './people.js';
import { plants } from './items-plants.js';
import { pantry } from './items-pantry.js';
import { snacks } from './items-snacks.js';
import { things } from './items-things.js';
import { fishItems } from './fish-items.js';
import { lostItems } from './lost-items.js';
import { wild } from './items-wild.js';

export { paintGround, TILE } from './ground.js';
export { FRAME_W, FRAME_H, POSES, DIRS, LOOK_NAMES };
export { Grid };

// 物件的画法。同一种物件有几个样子的（树、石头、花），按位置换种子，画出来各不相同。
const MAP_MAKERS = {
  ...indoors,
  ...wildProps,
  'house.hero': () => house('hero', 11),
  'house.gui': () => house('gui', 23),
  'fence.h': seed => props.fenceH(seed),
  'fence.v': seed => props.fenceV(seed),
  'gate.post': () => props.gatePost(),
  'gate.arch': () => props.gateArch(),
  vat: () => props.vat(),
  stove,
  bookshelf,
  cupboard: () => props.cupboard(),
  well: () => props.well(),
  basket: () => props.basket(),
  table: () => props.table(),
  haystack: seed => props.haystack(seed),
  rack: () => props.rack(),
  clothRack: () => props.clothRack(),
  jars: () => props.jars(),
  scarecrow: () => props.scarecrow(),
  trellis: seed => village.trellis(seed),
  sign: () => props.sign(),
  rock: seed => props.rock(seed),
  flowers: seed => props.flowers(seed),
  reeds: seed => props.reeds(seed),
  'tree.broad': seed => broadTree(seed),
  'tree.camphor': seed => camphorTree(seed),
  'tree.peach': seed => peachTree(seed),
  'tree.willow': seed => willowTree(seed),
  'tree.pine': seed => pineTree(seed),
  bamboo: seed => bambooGrove(seed),
  bush: seed => bush(seed),
  lantern: () => landmarks.lanternPost(),
  stall: seed => landmarks.stall(seed),
  pavilion: () => landmarks.pavilion(),
  boat: waterside.boat,
  lotus: waterside.lotus,
  shrine: () => landmarks.shrine(),
  cart: () => landmarks.cart(),
  stones: waterside.stones,
  netRack: waterside.netRack,
  barrels: seed => village.barrels(seed),
  firewood: seed => village.firewood(seed),
  sacks: seed => village.sacks(seed),
  trays: seed => village.trays(seed),
  fern: seed => village.fern(seed),
  stool: () => village.stool(),
  bench: () => village.bench(),
  rockPile: seed => village.rockPile(seed),
  crates: seed => village.crates(seed),
};
const VARIANTS = 4;

// 地图物件的名单跟地图约定一致。院门的小物件也能按名字取图，等规则需要时再加入地图名单。
export const OBJECT_KINDS = Object.keys(MAP_MAKERS);
const OBJECT_MAKERS = { ...MAP_MAKERS, ...traces };

// 有的物件随规则里的状态换一副样子（鸡窝：还没搭、养了鸡）。世界按状态来挑，没有就用平常的样子。
const OBJECT_LOOKS = {
  iou: { crossed: () => traces.iou('crossed') },
  cashBox: { closed: () => traces.cashBox('closed'), open: () => traces.cashBox('open') },
  ...wildLooks,
  ...indoorLooks,
  table: { ...indoorLooks.table, bench: () => village.bench() },
  trellis: {
    rear: seed => village.trellis(seed, 'rear'),
    front: seed => village.trellis(seed, 'front'),
  },
  // 集场的摊棚：今天摆的是哪个摊子就换哪副（world/stalls.js 照规则那边的 stalls 查询换）
  stall: Object.fromEntries(STALL_LOOKS.map(look => [look, () => stallLook(look)])),
};

/** 某种物件除了平常的样子，还有哪几副样子。 */
export const objectLooks = kind => Object.keys(OBJECT_LOOKS[kind] || {});

// 照「场景与物件参考」里的样子，物件外沿描一道深色的边，放在地上才立得住。
// 细碎的花草、浮在水面贴着地的、网眼镂空的不描，描了反而发闷。
const NO_OUTLINE = new Set([
  ...Object.keys(traces),
  'flowers',
  'reeds',
  'lotus',
  'stones',
  'netRack',
  'tree.willow',
  'bamboo',
  'fern',
]);

// 屋里的家什用淡墨描边：屋里要清淡，深色的边一圈圈压下来，整间屋子就沉了。
const SOFT_LINE = new Set([
  'bed',
  'rug',
  'roomWindow',
  'scroll',
  'hangings',
  'bookshelf',
  'table@wood',
  'route@door',
]);

function outlined({ grid, ax, ay }, line = P.o0) {
  const g = new Grid(grid.w + 2, grid.h + 2).blit(grid, 1, 1).outline(line);
  return { grid: g, ax: ax + 1, ay: ay + 1 };
}

/** 某种物件的第 n 个样子：{grid, ax, ay}。look 给了，就是它在那种情形下的样子。 */
export function objectSprite(kind, variant = 0, look = null) {
  const make = look ? OBJECT_LOOKS[kind]?.[look] : OBJECT_MAKERS[kind];
  if (!make) throw new Error('没有这种物件的画法：' + kind + (look ? '@' + look : ''));
  const sprite = make(101 + (variant % VARIANTS) * 37 + kind.length);
  if (NO_OUTLINE.has(kind)) return sprite;
  return outlined(sprite, SOFT_LINE.has(look ? kind + '@' + look : kind) ? P.ink3 : P.o0);
}

/** 一个物件在地图上用第几个样子（由位置决定，所以每次都一样）。 */
export const variantAt = (x, y) => (x * 7 + y * 13) % VARIANTS;

/** 翻过的土：16 种拼接 × 干湿。键是 `${wet ? 'wet' : 'dry'}.${mask}`。 */
export function soilSet() {
  const out = {};
  for (let mask = 0; mask < 16; mask++) {
    out[`dry.${mask}`] = soilTile(mask, false);
    out[`wet.${mask}`] = soilTile(mask, true);
  }
  return out;
}

export { cropFrames, cursor, icon, personFrame, personSheet, critters };
export const lanternGlobe = landmarks.lanternGlobe;

// 物品的图标：键和 content/pantry.js 里的物品一一对应（测试会检查）。
const ITEM_MAKERS = {
  ...plants,
  ...pantry,
  ...snacks,
  ...things,
  ...fishItems,
  ...wild,
  ...lostItems,
};

export const ITEM_ICONS = Object.keys(ITEM_MAKERS);

/** 某样物品的图标：16×16，描好了边。 */
export function itemIcon(id) {
  const make = ITEM_MAKERS[id];
  if (!make) throw new Error('没有这样物品的图标：' + id);
  return new Grid(16, 16).blit(make(), 0, 0).outline(P.ink1);
}

// 极品的那颗小星：十字形，中间最亮，摆在右上角；只画在空处和金边上，不压住东西本身。
const STAR = [
  [14, 0, 'y1'],
  [13, 1, 'y1'],
  [14, 1, 'y0'],
  [15, 1, 'y1'],
  [14, 2, 'y1'],
];

/** 极品的图标：照寻常那样画（id 是寻常那样的编号），墨线外再描一圈金，右上角一颗小星。 */
export function fineItemIcon(id) {
  const g = itemIcon(id).outline(P.y2);
  for (const [x, y, c] of STAR) if (!g.opaque(x, y) || g.get(x, y) === P.y2) g.set(x, y, P[c]);
  return g;
}

/** 人脚下的一小片影子。 */
export function personShadow() {
  return new Grid(14, 6).ellipse(7, 3, 6, 2, SHADOW);
}

export { ACTS, actFrame, actSheet } from './acts.js';
export { EMOTES, emote } from './emotes.js';
export { farmFrame } from './farm-frame.js';
export { hen } from './acts-yard.js';
export { yardFixArt, YARD_FIX_NAMES } from './yard-fix.js';
export { seasonGrid } from './seasons.js';
export { plotMark, PLOT_MARKS } from './plot-marks.js';
export { cropSet } from './crops.js';
export { cookingFrame, prepBoard, COOK_FRAMES } from './cooking-frames.js';
export { uiIcon, UI_ICONS } from './ui-icons.js';
export {
  prizeIcon,
  prizePicture,
  prizeShadow,
  prizeTrace,
  PRIZE_NAMES,
  TRACE_NAMES,
} from './prizes.js';
export { achievementIcon, ACHIEVEMENT_ICON_KINDS } from './achievement-icons.js';
export { groundArt, hasGroundArt } from './ground-wild.js';
export { stirFrames, STIR_FX } from './stir-fx.js';
