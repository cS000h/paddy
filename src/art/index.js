// 素材总表：名字 → 小图。画面只按名字取图，所以以后把某张程序画的图换成手绘的图，
// 只要在这里换掉它的来源，别处不用动。
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
import { stove } from './kitchen.js';
import * as props from './props.js';
import { soilTile, cropFrames, cursor, icon } from './tiles.js';
import { personSheet, LOOK_NAMES, FRAME_W, FRAME_H, POSES, DIRS } from './people.js';
import { plants } from './items-plants.js';
import { pantry } from './items-pantry.js';
import { things } from './items-things.js';

export { paintGround, TILE } from './ground.js';
export { FRAME_W, FRAME_H, POSES, DIRS, LOOK_NAMES };
export { Grid };

// 物件的画法。同一种物件有几个样子的（树、石头、花），按位置换种子，画出来各不相同。
const OBJECT_MAKERS = {
  'house.hero': () => house('hero', 11),
  'house.gui': () => house('gui', 23),
  'fence.h': seed => props.fenceH(seed),
  'fence.v': seed => props.fenceV(seed),
  'gate.post': () => props.gatePost(),
  'gate.arch': () => props.gateArch(),
  vat: () => props.vat(),
  stove,
  cupboard: () => props.cupboard(),
  well: () => props.well(),
  basket: () => props.basket(),
  table: () => props.table(),
  haystack: seed => props.haystack(seed),
  rack: () => props.rack(),
  jars: () => props.jars(),
  scarecrow: () => props.scarecrow(),
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
};
const VARIANTS = 4;

export const OBJECT_KINDS = Object.keys(OBJECT_MAKERS);

/** 某种物件的第 n 个样子：{grid, ax, ay}。 */
export function objectSprite(kind, variant = 0) {
  const make = OBJECT_MAKERS[kind];
  if (!make) throw new Error('没有这种物件的画法：' + kind);
  return make(101 + (variant % VARIANTS) * 37 + kind.length);
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

export { cropFrames, cursor, icon, personSheet };

// 物品的图标：键和 content/pantry.js 里的物品一一对应（测试会检查）。
const ITEM_MAKERS = { ...plants, ...pantry, ...things };

export const ITEM_ICONS = Object.keys(ITEM_MAKERS);

/** 某样物品的图标：16×16，描好了边。 */
export function itemIcon(id) {
  const make = ITEM_MAKERS[id];
  if (!make) throw new Error('没有这样物品的图标：' + id);
  return new Grid(16, 16).blit(make(), 0, 0).outline(P.ink1);
}

/** 人脚下的一小片影子。 */
export function personShadow() {
  return new Grid(14, 6).ellipse(7, 3, 6, 2, SHADOW);
}
