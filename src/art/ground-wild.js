// 地上冒出来的时令野货（content/ground.js）落在地上的样子，出自 Gemini G-12。
// 行囊图标多是摘下来立着的，直接缩小摆在草上像浮着的贴纸；这几张单画，重心压低，贴地一圈淡影。
// 没单画的几样（艾草、香草、松果）照旧用行囊图标缩小。
import { Grid, fromText } from './pixel.js';
import { INK } from './items-kit.js';
import { P, SHADOW } from './palette.js';

// prettier-ignore
const GROUND_ROWS = {
  // 地上·荠菜：贴地摊开一圈锯齿嫩绿莲座叶，中抽一两星小白花，底落浅灰影
  shepherd: [
    '', '', '',
    '.........w',
    '.......w.G',
    '.......G.l',
    '.....lG.lG.lG',
    '....lGGgGgGGg',
    '...lG.gDMgD.g',
    '....gDDgDgDD',
    '.....^gDMDg^',
    '......^^^^^',
  ],
  // 地上·马兰头：一丛冒出土面的深绿嫩叶，根脚露一截紫红梗与浅影（二稿）
  malan: [
    '', '', '',
    '.......lG',
    '.....lG.Gg',
    '....lGGgGGg',
    '.....GGgMg',
    '.....gDMDg',
    '......PPJ',
    '.....^PPJ^',
    '....^^^^^^^',
  ],
  // 地上·雨后竹笋：刚拱破湿土的胖尖笋，褐壳叠裹露淡黄嫩尖，根脚带湿土
  shoot: [
    '', '',
    '.........i',
    '........ih',
    '........hj',
    '.......tuj',
    '.......tuT',
    '......tuTTu',
    '......tTTUU',
    '.....8uTTUU8',
    '.....9899989',
    '......^^^^^',
  ],
  // 地上·菌子：一大一小两朵土褐圆伞蘑菇，奶白菌柄，贴地有柔影
  mushroom: [
    '', '', '',
    '.......efF',
    '......effFF',
    '.....effFFFE',
    '.....FFFFFFE',
    '......wWW.ef',
    '......wWWefFF',
    '......WXx.wW',
    '.....^WXx^wW^',
    '......^^^^^^',
  ],
  // 地上·落下的栗子：滚落地面的两颗油亮深褐栗子，带浅绒底座与浅影
  chestnut: [
    '', '', '', '',
    '.......T',
    '......tTU',
    '.....tnTUU.T',
    '.....tTTUUtTU',
    '.....fTTUUnTU',
    '......ffU.fUU',
    '.....^^^^^^^^',
    '......^^^^^^',
  ],
  // 地上·落野桃：草地上滚落的一颗半青半红野桃，横躺带叶，底下压出小影
  wildPeach: [
    '', '', '', '',
    '......gD',
    '.....uGGLL',
    '......LLlGqo',
    '.....LLlGqpor',
    '.....lGGpoRRr',
    '......GpoRRQ',
    '......^RRRQQ^',
    '.......^^^^^',
  ],
  // 地上·低垂野莓：贴地一簇绿叶衬着三颗红野莓，方便路过一眼看见
  berry: [
    '', '', '', '',
    '.......gD',
    '.....gGDGg',
    '....GG.rqR.g',
    '.....g.rrRQG',
    '....rqR.RQrqR',
    '....rrRQ..rrR',
    '.....^^Q^^^Q^',
    '......^^^^^^',
  ],
};

/** 有没有单画的落地图。 */
export const hasGroundArt = item => Object.hasOwn(GROUND_ROWS, item);

/**
 * 落在地上的那张图：16×16，正好占一格。东西本身描墨边；影子（字符 ^）最后铺上去，
 * 用半透明的墨，不描边，也不盖住东西和墨边。
 */
export function groundArt(item) {
  const rows = GROUND_ROWS[item];
  if (!rows) throw new Error('没有这样野货落地的图：' + item);
  const body = rows.map(r => r.replaceAll('^', '.'));
  const g = new Grid(16, 16).blit(fromText(body, INK), 0, 0).outline(P.ink1);
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => ch === '^' && !g.opaque(x, y) && g.set(x, y, SHADOW)),
  );
  return g;
}
