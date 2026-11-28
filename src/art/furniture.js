// 小屋里六处摆设的另几副样子（A-39b 字符画；哪处有哪几样、价钱在 content/furniture.js）。
// 原样用地图上那副（A-39a 稿，indoors.js、room.js），窗台原样用这里那张。画法同屋里别的家什（room-kit.js）：
// 深木描边、右下接地影。锚点在底边：床、挂轴、屋角、窗台居中，饭桌对着左边那一格；地毯竖着铺（turnRug）。
import { roomSprite, turnRug } from './room-kit.js';
import { FURNITURE_SKETCHES as S } from './furniture-sketches.js';

// 地毯左沿对齐那一格的左边（宽窄几款都从床尾右边铺起，不压到床尾的木箱）
export const RUG_AX = 7;

/** 一处摆设的一样：{grid, ax, ay, lined}。 */
export function decorSprite(slot, style) {
  const rows = S[`${slot}_${style}`];
  if (slot === 'rug') return roomSprite(turnRug(rows), { ax: RUG_AX });
  return roomSprite(rows, { ax: slot === 'table' ? 8 : null });
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
