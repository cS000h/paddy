// 成就摆件、稻穗三件纪念（Gemini G-31）：字符画在 keepsake-sketches.js，字符表借小院翻修那张。
import { Grid, fromText } from './pixel.js';
import { P } from './palette.js';
import { LEGEND } from './yard-fix.js';
import { KEEPSAKE_SKETCHES } from './keepsake-sketches.js';

export const KEEPSAKE_NAMES = Object.keys(KEEPSAKE_SKETCHES);

/** 一件摆件（16×16、32×16 或 24×24），描好墨边。 */
export function keepsakeArt(name) {
  const rows = KEEPSAKE_SKETCHES[name];
  if (!rows) throw new Error('没有这件摆件的图：' + name);
  const w = Math.max(...rows.map(r => r.length));
  return new Grid(w, rows.length).blit(fromText(rows, LEGEND), 0, 0).outline(P.ink1);
}
