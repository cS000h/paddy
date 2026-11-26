// 彩头的图（Gemini G-13）：行囊里的图标、图谱里的大图、没找到时的影子、留在家里的痕迹。
// 字符画在 prize-sketches.js 和 prize-pictures.js；这里只管怎么上色、描边。
import { Grid, fromText } from './pixel.js';
import { P } from './palette.js';
import { INK } from './items-kit.js';
import { PRIZE_ICONS, PRIZE_TRACES } from './prize-sketches.js';
import { PRIZE_PICTURES } from './prize-pictures.js';

// G-13 的图用到几样共用字符表里没有的颜色（水、墨灰），和 fish-items.js 一样补上
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
};

const draw = (rows, w, h) => new Grid(w, h).blit(fromText(rows, LEGEND), 0, 0);

export const PRIZE_NAMES = Object.keys(PRIZE_ICONS);

/** 行囊里的彩头图标：16×16，描好墨边。不描金边，金边留给极品。 */
export function prizeIcon(id) {
  if (!PRIZE_ICONS[id]) throw new Error('没有这样彩头的图标：' + id);
  return draw(PRIZE_ICONS[id], 16, 16).outline(P.ink1);
}

/** 图谱里的大图：32×32，描墨边。 */
export function prizePicture(id) {
  if (!PRIZE_PICTURES[id]) throw new Error('没有这样彩头的大图：' + id);
  return draw(PRIZE_PICTURES[id], 32, 32).outline(P.ink1);
}

/** 没找到的影子（照 G-13）：复用大图的轮廓，平涂浅墨灰，外缘描墨灰。 */
export function prizeShadow(id) {
  const g = draw(PRIZE_PICTURES[id], 32, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (g.opaque(x, y)) g.set(x, y, P.ink5);
  return g.outline(P.ink3);
}

/** 留在家里的痕迹：32×16。红鲤的水影不描边（画的时候整体八成透明，照 G-13）。 */
export const TRACE_NAMES = Object.keys(PRIZE_TRACES);
export function prizeTrace(id) {
  if (!PRIZE_TRACES[id]) throw new Error('没有这样的痕迹：' + id);
  const g = draw(PRIZE_TRACES[id], 32, 16);
  return id === 'homeRedCarpRipple' ? g : g.outline(P.ink1);
}
