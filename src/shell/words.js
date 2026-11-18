// 世界的提示条和面板都要说的几句话，写在这一处，两边说法才一样。
import { signed } from '../content/text.js';

/** 体力价钱里的每一条加减：“饿着+1、清早−1”。没有就是空字符串。 */
export const partsText = parts => parts.map(p => p.label + signed(p.delta)).join('、');

/** 做一件事要花的体力：“体力 4（饿着+1）”。cost 来自规则的 action.cost 之类的查询。 */
export function costText(cost) {
  const parts = partsText(cost.parts);
  return `体力 ${cost.value}${parts ? `（${parts}）` : ''}`;
}

/** 按这台设备的说法讲“怎么做”：键鼠是按空格，触屏是点“做”。 */
export const doWord = touch => (touch ? '点「做」' : '按空格');

/** 一格地要不要照料，一句话；不用照料（或还没锄）是空字符串。detail 来自 farm.detail 查询。 */
export function careNote(detail) {
  if (!detail) return '';
  if (detail.weeds && detail.bugs) return '长了草，也生了虫';
  if (detail.weeds) return '长了草';
  return detail.bugs ? '叶上有虫' : '';
}
