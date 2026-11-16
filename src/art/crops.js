// 七种作物在地里的样子。每种四个阶段：下种、出苗、长叶、成熟；前两个阶段都一样（土里的种子、
// 两片嫩芽），后两个阶段各画各的：韭菜一丛细叶，黄瓜豆角爬上架子，南瓜贴着地长，萝卜露出白肩，
// 白菜卷成一棵。每张 16×16，底边对着格子的底边；字符的颜色见 items-kit.js 的 INK。
import { Grid, fromText } from './pixel.js';
import { INK } from './items-kit.js';
import { cropFrames } from './tiles.js';

// [长叶, 成熟]
const LATER = {
  chive: [
    [
      '......G...D.....',
      '...g..G.g.D..g..',
      '...g.gG.g.Dg.g..',
      '....ggG.gDDgg...',
      '....gGGggDDg....',
      '.....gGgDDg.....',
      '......LLLL......',
    ],
    [
      '....G.....D.....',
      '....G..g..D..g..',
      '..g.G..g.gD..g..',
      '..g.Gg.g.gD.gg..',
      '..g.GgGggDD.g...',
      '...gGgGggDDgg...',
      '...gGgGgDDDg....',
      '....GgGgDDgg....',
      '....gGggDDg.....',
      '.....gGgDg......',
      '......LLLL......',
    ],
  ],
  cucumber: [
    [
      '....t......t....',
      '....t.GG...t....',
      '...GtGggG..t....',
      '..GggtggGGgt....',
      '...ggtGggggtG...',
      '....tgggGggtg...',
      '...GtgGgggGt....',
      '..GggtggGggtG...',
      '...ggt.gggGtg...',
      '....t.Ggg..t....',
      '....t..gg..t....',
      '....t..g...t....',
      '....T..g...T....',
    ],
    [
      '....t..y...t....',
      '....t.GgG..ty...',
      '...GtGggGg.t....',
      '..GggtVVgGgtG...',
      '...ggtVVggVVg...',
      '....tgVGg.VVg...',
      '...GtgVVgGVGt...',
      '..Gggt.VggVVtG..',
      '...ggt.gggVVg...',
      '....t.Ggg..t....',
      '....t..gg..t....',
      '....t..g...t....',
      '....T..g...T....',
    ],
  ],
  longbean: [
    [
      '....t......t....',
      '....t.GG...t.p..',
      '...GtGggG..t....',
      '..GggtggGGgt....',
      '.p.ggtGggggtG...',
      '....tgggGggtg...',
      '...GtgGgggGt....',
      '..GggtggGggtG...',
      '...ggt.gggGtg...',
      '....t.Ggg..t....',
      '....t..gg..t....',
      '....t..g...t....',
      '....T..g...T....',
    ],
    [
      '....t..p...t....',
      '....t.GgG..t.p..',
      '...GtGggGg.t....',
      '..GggtlglGgtG...',
      '...ggtlglgltg...',
      '....tglGlglt....',
      '...GtglglGltG...',
      '..Gggtl.lgltg...',
      '...ggtl.gg.t....',
      '....t.l.g..t....',
      '....t..gg..t....',
      '....t..g...t....',
      '....T..g...T....',
    ],
  ],
  pumpkin: [
    [
      '.....y..........',
      '....yyy...GG....',
      '..GG.y..gGggG...',
      '.GggG.gg.gggg...',
      '.gggggDgg.gg.G..',
      '..gg.gDggGgggg..',
      '..G.ggggggggg...',
      '....gg..ggg.....',
    ],
    [
      '.......D........',
      '...GG.yyy..GG...',
      '..Ggg.yoyy.ggG..',
      '.GggyyyoyyyYgg..',
      '.ggyzyyoyyyYYg..',
      '..gyyyyoyyyoY...',
      '..GyyyoyyyoYYG..',
      '...gyyoyyyYYg...',
      '....YYYYYYY.....',
    ],
  ],
  radish: [
    [
      '.......G........',
      '...g..GgG..g....',
      '....g.GgG.g.....',
      '..G..gGgGg..G...',
      '...Gg.gGg.gG....',
      '....GggGggG.....',
      '.....gggGg......',
      '......gGg.......',
    ],
    [
      '.......G........',
      '..g...GgG...g...',
      '...g..GgG..g....',
      '.G..g.GgG.g..G..',
      '..Gg.gGgGg.gG...',
      '...GggGgGggG....',
      '....GggGggG.....',
      '.....gwwwg......',
      '.....wwwwW......',
      '.....wwwWx......',
      '......wWx.......',
    ],
  ],
  cabbage: [
    [
      '....l..G..l.....',
      '...lGl.G.lGl....',
      '..lGllGlGllGl...',
      '...lGllMllGl....',
      '..l.lGlMlGl.l...',
      '...llGlMlGll....',
      '.....lwWwl......',
    ],
    [
      '.....llGll......',
      '....lGllGlG.....',
      '...lGllMllGl....',
      '...llGlMlGll....',
      '...lGllMllGl....',
      '...wllGMGllW....',
      '...wwllMllWW....',
      '...wwwlllWWx....',
      '...wwwwwWWWx....',
      '....wwwwWWx.....',
      '....wwwwWWx.....',
      '.....wwWWx......',
    ],
  ],
};

const frame = rows => {
  const src = fromText(rows, INK);
  return new Grid(16, 16).blit(src, 0, 16 - src.h);
};

/** 某种作物的四个阶段。没有单独画法的（青菜）用通用的那一套。 */
export function cropSet(id) {
  const base = cropFrames();
  if (!LATER[id]) return base;
  return [base[0], base[1], ...LATER[id].map(frame)];
}
