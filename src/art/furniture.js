// 小屋里六处摆设的另几副样子（G-34 字符画；哪处有哪几样、价钱在 content/furniture.js）。
// 原样照旧画法不动，只有窗台原来没有，用稿里那张。锚点在底边：床、地毯、挂轴、屋角、窗台居中，
// 饭桌和原来的一样对着左边那一格。
import { fromText } from './pixel.js';
import { P } from './palette.js';
import { INK } from './items-kit.js';
import { FURNITURE_SKETCHES as S } from './furniture-sketches.js';

const LEGEND = {
  ...INK,
  '!': P.ink0,
  '^': P.ink2,
  '%': P.paper0,
  '~': P.w0,
  '*': P.w1,
  '?': P.w2,
  '+': P.w3,
  '&': P.w4,
  '=': P.w5,
  '<': P.s0,
  '>': P.s5,
};

/** 一处摆设的一样：{grid, ax, ay}。 */
export function decorSprite(slot, style) {
  const grid = fromText(S[`${slot}_${style}`], LEGEND);
  return { grid, ax: slot === 'table' ? 8 : Math.floor(grid.w / 2), ay: grid.h };
}

/** 各物件除了原样还有哪几副：{物件: {样子: 画法}}，交给 art/index.js 的 OBJECT_LOOKS。 */
// 哪一处贴在小屋地图的哪个物件上（和 content/furniture.js 的 object 一致，测试会对）
export const DECOR_OBJECT_OF = Object.freeze({
  bed: 'bed',
  table: 'table',
  scroll: 'scroll',
  sill: 'sill',
  rug: 'rug',
  corner: 'jars',
});
export const DECOR_LOOKS = {};
for (const key of Object.keys(S)) {
  const [slot, style] = key.split('_');
  if (style === 'default') continue;
  const object = DECOR_OBJECT_OF[slot];
  DECOR_LOOKS[object] = { ...DECOR_LOOKS[object], [style]: () => decorSprite(slot, style) };
}
export const DECOR_OBJECTS = new Set(Object.keys(DECOR_LOOKS));
