// 物品图标（一）：地里长的、山野里找的。每个函数返回一张没描边的 16×16 小图。
import { Grid } from './pixel.js';
import { P } from './palette.js';
import { sketch, ball, dot } from './items-kit.js';
import { cropFrames } from './tiles.js';

export const plants = {
  'veg.qingcai': () => cropFrames()[3], // 就是地里长成的那一棵

  potato: () =>
    dot(ball(new Grid(16, 16), 8, 9, 5.5, 4, [P.e0, P.e2, P.e3]), P.e4, [
      [6, 9],
      [10, 8],
      [8, 11],
    ]),

  tomato: () =>
    dot(ball(new Grid(16, 16), 8, 9, 5, 4.5, [P.c0, P.c1, P.c2]), P.g5, [
      [8, 4],
      [6, 5],
      [7, 5],
      [8, 5],
      [9, 5],
      [10, 5],
      [8, 6],
    ]),

  pumpkin() {
    const g = ball(new Grid(16, 16), 8, 9.5, 6, 4.5, [P.y0, P.c0, P.c1]);
    for (const x of [5, 8, 11]) for (let y = 7; y <= 12; y++) if (g.opaque(x, y)) g.set(x, y, P.c1);
    return dot(g, P.g6, [
      [8, 4],
      [8, 5],
      [9, 4],
    ]);
  },

  chestnut() {
    const g = ball(new Grid(16, 16), 8, 9, 5, 4.5, [P.t0, P.t2, P.t3]);
    for (let x = 4; x <= 12; x++)
      for (let y = 12; y <= 13; y++) if (g.opaque(x, y)) g.set(x, y, P.h0);
    return dot(g, P.t3, [
      [8, 3],
      [8, 4],
    ]);
  },

  taro() {
    const g = ball(new Grid(16, 16), 8, 9, 5, 4.5, [P.u0, P.u1, P.u2]);
    for (const [x0, x1, y] of [
      [5, 8, 7],
      [7, 11, 10],
      [5, 7, 12],
    ])
      for (let x = x0; x <= x1; x++) if (g.opaque(x, y)) g.set(x, y, P.u2);
    return dot(g, P.g4, [
      [8, 3],
      [8, 4],
      [7, 3],
    ]);
  },

  herb: () =>
    sketch([
      '',
      '........G.......',
      '.......GgG......',
      '..G.....g.......',
      '.GgG...Dg..G....',
      '..gD....g.GgG...',
      '...D...Dg..gD...',
      '....D...gDD.....',
      '.....D..g.......',
      '......D.g.......',
      '.......Dg.......',
      '........D.......',
      '........D.......',
      '........D.......',
    ]),

  shoot: () =>
    sketch([
      '',
      '.......H........',
      '.......hH.......',
      '......hhH.......',
      '......ihHj......',
      '.....ihhHj......',
      '.....ihjHHj.....',
      '....iihhjHj.....',
      '....ihhjhHHj....',
      '...iihhjhhHj....',
      '...ihhjhhjHHj...',
      '...ihjhhjhhHj...',
      '...wwWwwWwwWx...',
      '....wwWwwWxx....',
    ]),

  shepherd: () =>
    sketch([
      '',
      '.......w........',
      '......wDw.......',
      '.......D........',
      '..M....D....M...',
      '.MgM...D...MgM..',
      '..MgM..D..MgM...',
      '...MgM.D.MgM....',
      '....MggDggM.....',
      '.MMMMgDDDgMMMM..',
      '.MgggDDDDDgggM..',
      '..MMMgDDDgMMM...',
      '.....MgDgM......',
      '.......f........',
    ]),

  chive: () =>
    sketch([
      '',
      '....G...g..D....',
      '....Gg..g.gD....',
      '.....Gg.g.gD....',
      '.....GgggggD....',
      '......GgggD.....',
      '......GgggD.....',
      '......GgggD.....',
      '......hhhhh.....',
      '......jjjjj.....',
      '......GgggD.....',
      '......LGgLL.....',
      '......LLLLL.....',
      '.......LLL......',
    ]),

  cucumber: () =>
    sketch([
      '',
      '............yy..',
      '...........gyy..',
      '..........gGg...',
      '.........gGgD...',
      '........gGgD....',
      '.......gGDD.....',
      '......gGgD......',
      '.....gGgD.......',
      '....gGDD........',
      '...gGgD.........',
      '..gGgD..........',
      '..ggD...........',
    ]),

  longbean: () =>
    sketch([
      '',
      '.............D..',
      '............gD..',
      '...........gD...',
      '....D.....gD....',
      '....gD...gD.....',
      '.....gD.gD......',
      '......ggD.......',
      '......gDgD......',
      '.....gD..gD.....',
      '....gD....gD....',
      '...gD......g....',
      '..gD............',
      '..D.............',
    ]),

  radish: () =>
    sketch([
      '',
      '....g..G..g.....',
      '.....g.G.g......',
      '.....gGGGg......',
      '......gGg.......',
      '.....wwwwW......',
      '....wwwwwWx.....',
      '....wwwwwWx.....',
      '....wwwwWWx.....',
      '.....wwwWx......',
      '.....wwWWx......',
      '......wWx.......',
      '......wWx.......',
      '.......x........',
    ]),

  cabbage: () =>
    sketch([
      '',
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
      '......xxx.......',
    ]),

  ginger: () =>
    sketch([
      '',
      '',
      '..........pp....',
      '.........fee....',
      '....ff..feeF....',
      '...feef.feeF....',
      '...feeeffeeF....',
      '..ffeeeeeeFF....',
      '.feeeeeeeeF.....',
      '.feeFeeeeFF.....',
      '..FFFeeeFF......',
      '.....feeF.......',
      '.....FFF........',
    ]),

  mushroom: () =>
    sketch([
      '',
      '',
      '.....mmmmm......',
      '...mmvmmmmmm....',
      '..mvvmmmmmmNm...',
      '..mvmmmmmmmNN...',
      '..mmmmmmmmNNN...',
      '...NNNNNNNNN....',
      '.....wwWx.......',
      '.....wwWx.......',
      '.....wwWx.......',
      '....wwwWxx......',
      '....wwwWWx......',
      '.....xxxx.......',
    ]),

  tea: () =>
    sketch([
      '',
      '',
      '.......D........',
      '......DgD.......',
      '......DGD.......',
      '..DD..DGD..DD...',
      '.DggD.DGD.DggD..',
      '.DgGgD.D.DgGgD..',
      '..DgGgDDDgGgD...',
      '...DgGgDgGgD....',
      '....DggDggD.....',
      '.....DDDDD......',
      '.......D........',
      '.......D........',
    ]),

  leaf: () =>
    sketch([
      '',
      '.D..........D...',
      '.gD........Dg...',
      '.gGD......DGg...',
      '..gGD....DGg....',
      '..gGgD..DgGg....',
      '...gGgDDgGg.....',
      '...gGgDDgGg.....',
      '....gGDDGg......',
      '....gGDDGg......',
      '.....gDDg.......',
      '.....gDDg.......',
      '......DD........',
      '......jj........',
    ]),

  scallion: () =>
    sketch([
      '',
      '...G.......g....',
      '...Gg.....gD....',
      '....Gg...gD.....',
      '....Gg...gD.....',
      '.....Gg.gD......',
      '.....Gg.gD......',
      '.....GggD.......',
      '......wWx.......',
      '......wWx.......',
      '......wWx.......',
      '......wWx.......',
      '......wWx.......',
      '.....f.f.f......',
    ]),

  chili: () =>
    sketch([
      '',
      '',
      '..T.............',
      '...T......T.....',
      '...rr....T......',
      '..rrRr..rr......',
      '..rrrRr.rRr.....',
      '...rrrRrrrRr....',
      '....rrrRrrrR....',
      '.....rrRRrrRr...',
      '......rr.RrrR...',
      '..........rrR...',
      '...........R....',
    ]),
};
