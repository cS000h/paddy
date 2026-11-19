// 会变的地块和小图标：翻过的土（干、湿，按四邻拼接）、青菜的四个阶段、对准用的框、工具图标。
import { Grid, hash2, fromText } from './pixel.js';
import { P } from './palette.js';

/**
 * 一格翻过的土。mask 的四个二进制位表示上、右、下、左有没有同样翻过的格子（1、2、4、8），
 * 有邻居的那一边不留边，所以连成片的地看起来是一整块。
 */
export function soilTile(mask, wet) {
  const g = new Grid(16, 16);
  const [hi, mid, lo] = wet ? [P.wet0, P.wet1, P.wet2] : [P.d0, P.d1, P.d2];
  const n = mask & 1;
  const e = mask & 2;
  const s = mask & 4;
  const w = mask & 8;
  const x0 = w ? 0 : 1;
  const x1 = e ? 15 : 14;
  const y0 = n ? 0 : 1;
  const y1 = s ? 15 : 14;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const corner =
        (x === x0 && y === y0 && !w && !n) ||
        (x === x1 && y === y0 && !e && !n) ||
        (x === x0 && y === y1 && !w && !s) ||
        (x === x1 && y === y1 && !e && !s);
      if (corner) continue;
      let c = mid;
      if (y % 5 === 3) c = lo;
      else if (y % 5 === 4) c = hi;
      if (hash2(x, y, mask + (wet ? 97 : 0)) < 0.05) c = lo;
      if ((!n && y === y0) || (!w && x === x0)) c = hi;
      if ((!s && y === y1) || (!e && x === x1)) c = lo;
      if (wet && y % 5 === 2 && (x + y) % 11 < 3) c = P.w3;
      g.set(x, y, c);
    }
  return g;
}

const CROP_COLORS = {
  e: P.e0,
  E: P.d2,
  g: P.g5,
  G: P.g3,
  L: P.g2,
  D: P.g6,
  M: P.g4,
  W: P.l1,
  w: P.l0,
};

// 青菜的四个样子：下种、出苗、长叶、成熟。每张 16×16，底边对着格子的底边。
const QINGCAI = [
  [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '.........e......',
    '....e....E......',
    '....E...........',
    '..........e.....',
    '......e...E.....',
    '......E.........',
  ],
  [
    '',
    '',
    '',
    '',
    '',
    '',
    '.........G.G....',
    '...G.G....g.....',
    '....g.....g.....',
    '....g...........',
    '.......G.G......',
    '........g.......',
    '........g.......',
  ],
  [
    '',
    '',
    '',
    '',
    '',
    '.....L...G......',
    '....LMG.GMG.....',
    '.....GMgMG......',
    '...LGGgggGGG....',
    '....GMGgGMG.....',
    '.....GMgMG......',
    '......GgG.......',
    '.......g........',
  ],
  [
    '',
    '',
    '.....DD..DD.....',
    '...DDMMDDMMD....',
    '..DMMLMMMMLMD...',
    '..DMLMMDDMMMD...',
    '.DMMMMDMMDMMMD..',
    '.DMLMMMDMLMMMD..',
    '..DMMMWWWMMMD...',
    '..DMMWWwWWMMD...',
    '...DMWwwwWMD....',
    '....DWwwwWD.....',
    '.....WWWWW......',
  ],
];

export const cropFrames = () => QINGCAI.map(rows => padTo16(fromText(rows, CROP_COLORS)));

function padTo16(src) {
  return new Grid(16, 16).blit(src, 0, 16 - src.h);
}

/** 对准目标格用的四角框。ok = 能做（朱砂色），否则是淡墨色。 */
export function cursor(ok) {
  const g = new Grid(16, 16);
  const c = ok ? P.y1 : P.ink3;
  for (const [x, y, dx, dy] of [
    [0, 0, 1, 1],
    [15, 0, -1, 1],
    [0, 15, 1, -1],
    [15, 15, -1, -1],
  ]) {
    if (ok)
      g.hline(x + dx, x + dx * 4, y + dy * 2, P.h3).vline(x + dx * 2, y + dy, y + dy * 4, P.h3);
    g.hline(x, x + dx * 4, y, c).vline(x, y, y + dy * 4, c);
    g.hline(x + dx, x + dx * 3, y + dy, P.paper0).vline(x + dx, y + dy, y + dy * 3, P.paper0);
  }
  return g;
}

const ICON_COLORS = {
  t: P.t1,
  T: P.t3,
  s: P.s4,
  S: P.s1,
  h: P.h3,
  H: P.h1,
  g: P.g5,
  G: P.g3,
  w: P.i3,
  W: P.i1,
  L: P.i0,
  y: P.y2,
  Y: P.y1,
  o: P.y0,
  k: P.ink1,
};

const ICONS = {
  hoe: [
    '',
    '..........sss...',
    '.........sSSs...',
    '........sSSs.t..',
    '.......sSSs.tT..',
    '.......sss.tT...',
    '..........tT....',
    '.........tT.....',
    '........tT......',
    '.......tT.......',
    '......tT........',
    '.....tT.........',
    '....tT..........',
    '...tT...........',
    '..tT............',
  ],
  seed: [
    '',
    '......TTTT......',
    '.....T....T.....',
    '......hhhh......',
    '.....hHHHHh.....',
    '....hHHHHHHh....',
    '...hHHHHHHHHh...',
    '...hHHgHHHHHh...',
    '...hHgGgHHHHh...',
    '...hHHgHHgHHh...',
    '...hHHHHgGgHh...',
    '...hHHHHHgHHh...',
    '....hHHHHHHh....',
    '.....hhhhhh.....',
  ],
  can: [
    '',
    '',
    '.....ww.........',
    '....w..w........',
    '....w..w....w...',
    '...wWWWWw..wW...',
    '..wWWWWWWwwW....',
    '..wWLWWWWWW.....',
    '..wWLWWWWWw.....',
    '..wWLWWWWWw.....',
    '..wWWWWWWWw.....',
    '..wWWWWWWWw.....',
    '...wwwwwww......',
  ],
  hand: [
    '',
    '......ssss......',
    '....ssSSSSss....',
    '...sSSs...sSs...',
    '..sSs......sSs..',
    '..ss........sS..',
    '............sS..',
    '...........sSs..',
    '..........tTs...',
    '.........tT.....',
    '........tT......',
    '.......tT.......',
    '......tT........',
    '.....tT.........',
  ],
  coin: [
    '',
    '',
    '.....yyyyyy.....',
    '....yYYYYYYy....',
    '...yYYoooYYYy...',
    '...yYokkkoYYy...',
    '...yYokkkoYYy...',
    '...yYokkkoYYy...',
    '...yYYoooYYYy...',
    '....yYYYYYYy....',
    '.....yyyyyy.....',
  ],
};

/** 16×16 的图标：hoe 锄头、seed 菜种、can 水壶、hand 镰刀（采收）、coin 铜钱。 */
export function icon(name) {
  const g = new Grid(16, 16);
  g.blit(fromText(ICONS[name], ICON_COLORS), 0, 0);
  return g.outline(P.ink1);
}
