// 小院翻修六处修好的样子、挂架上按季节挂的东西（Gemini G-25）。字符画在 yard-fix-sketches.js，
// 这里只管上色、描边；字符表和彩头的图（art/prizes.js）一样，补上水、墨灰和亮石暗石那几样。
import { Grid, fromText } from './pixel.js';
import { P } from './palette.js';
import { INK } from './items-kit.js';
import { YARD_FIX_SKETCHES } from './yard-fix-sketches.js';

/** 字符表：物品图标那张，加上水、墨灰和亮石暗石；成就摆件（art/keepsakes.js）也用这张。 */
export const LEGEND = {
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

export const YARD_FIX_NAMES = Object.keys(YARD_FIX_SKETCHES);

/** 一张修好的样子（16×16 或 32×16）或挂架上的小图（6×8），描好墨边。 */
export function yardFixArt(name) {
  const rows = YARD_FIX_SKETCHES[name];
  if (!rows) throw new Error('没有这一处修好的图：' + name);
  const w = Math.max(...rows.map(r => r.length));
  return new Grid(w, rows.length).blit(fromText(rows, LEGEND), 0, 0).outline(P.ink1);
}
